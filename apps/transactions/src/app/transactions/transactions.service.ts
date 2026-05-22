import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
  CreateTransactionDto,
  CreateWalletDto,
  PaginationDto,
  PaginationResponseDto,
  PaymentEmailDto,
  PaymentStatus,
  ServiceError,
  UpdateTransactionDto,
  PaymentGateway,
  AuthPatterns,
  PaystackInitializeResponse,
  PaystackVerifyResponse,
  EmailPatterns,
  OrderPatterns,
} from '@medicpadi-backend/contracts';
import { withServiceAuth } from '@medicpadi-backend/utils';
import { Transaction } from '../../entities/transaction.entity';
import { Wallet } from '../../entities/wallet.entity';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    private readonly dataSource: DataSource,
    @Inject() private readonly configService: ConfigService,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>(
      'appConfig.internalServiceToken',
    );
  }

  private get tranxSourceMap() {
    return {
      appointment: OrderPatterns.APPOINTMENTS,
      drug_requisition: OrderPatterns.DRUG_REQUISITIONS,
      test_requisition: OrderPatterns.TEST_REQUISITIONS,
      subscription: 'Subscription',
    };
  }

  async create(dto: CreateTransactionDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const paystackUrl = this.configService.get<string>(
        'paystackConfig.paystackApiUrl',
      );
      const paystackSecretKey = this.configService.get<string>(
        'paystackConfig.secretKey',
      );
      const user = await firstValueFrom(
        this.authClient.send(
          AuthPatterns.FIND_BY_ID,
          withServiceAuth(dto.user_id, this.serviceToken),
        ),
      );

      let data: PaystackInitializeResponse;

      if (dto.gateway === PaymentGateway.PAYSTACK) {
        const response = await fetch(`${paystackUrl}/transaction/initialize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${paystackSecretKey}`,
          },
          body: JSON.stringify({
            email: user.email,
            amount: Math.round(dto.amount * 100),
            currency: dto.currency,
            metadata: {
              user_id: dto.user_id,
              source_type: dto.source_type,
              source_id: dto.source_id,
              provider_id: dto.provider_id,
            },
          }),
        });
        data = await response.json();

        if (!data.status) {
          throw new RpcException({
            statusCode: HttpStatus.BAD_GATEWAY,
            message: 'Unable to initialize transaction',
          } as ServiceError);
        }

        const transaction = queryRunner.manager.create(Transaction, {
          ...dto,
          gateway_reference: data.data.reference,
          access_code: data.data.access_code,
        });
        await queryRunner.manager.save(transaction);
        await queryRunner.commitTransaction();
        return data;
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Unable to create transaction',
          } as ServiceError);
    } finally {
      await queryRunner.release();
    }
  }

  async createWallet(dto: CreateWalletDto) {
    try {
      const existing = await this.walletRepo.findOne({
        where: { user_id: dto.user_id },
      });
      if (existing) {
        return existing;
      }
      const wallet = this.walletRepo.create({
        user_id: dto.user_id,
        currency: dto.currency ?? 'NGN',
        balance: 0,
      });
      return await this.walletRepo.save(wallet);
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Unable to create wallet',
          } as ServiceError);
    }
  }

  async getWallet(userId: string) {
    try {
      return await this.walletRepo.findOne({ where: { user_id: userId } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Unable to retrieve wallet',
      } as ServiceError);
    }
  }

  async verify(reference: string) {
    try {
      const paystackUrl = this.configService.get<string>(
        'paystackConfig.paystackApiUrl',
      );
      const paystackSecretKey = this.configService.get<string>(
        'paystackConfig.secretKey',
      );

      const response = await fetch(
        `${paystackUrl}/transaction/verify/${reference}`,
        {
          headers: { Authorization: `Bearer ${paystackSecretKey}` },
        },
      );
      const data: PaystackVerifyResponse = await response.json();

      if (!data.status) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_GATEWAY,
          message: 'Unable to verify transaction',
        } as ServiceError);
      }

      const transaction = await this.transactionRepo.findOne({
        where: { gateway_reference: reference },
      });

      if (transaction) {
        const newStatus =
          data.data.status === 'success'
            ? PaymentStatus.ESCROW
            : PaymentStatus.FAILED;
        await this.transactionRepo.update(transaction.id, {
          payment_status: newStatus,
        });
      }

      return data;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Unable to verify transaction',
          } as ServiceError);
    }
  }

  async handleWebhook(payload: { event: string; data: any }) {
    if (payload.event !== 'charge.success') {
      return { received: true };
    }

    try {
      const reference = payload.data?.reference as string;
      const verifyData = await this.verify(reference);

      if (verifyData.data.status === 'success') {
        const user = await firstValueFrom(
          this.authClient.send(
            AuthPatterns.FIND_BY_ID,
            withServiceAuth(
              verifyData.data.metadata?.user_id,
              this.serviceToken,
            ),
          ),
        );

        let existingTranx = await this.transactionRepo.findOne({
          where: { gateway_reference: reference },
        });

        if (existingTranx) {
          existingTranx.payment_status = PaymentStatus.ESCROW;
          await this.transactionRepo.save(existingTranx);
        }

        this.orderClient.emit(
          'orders.appointments.completePayment',
          withServiceAuth(existingTranx?.source_id, this.serviceToken),
        );

        const emailDto: PaymentEmailDto = {
          email: user.email,
          name: user.fullName ?? user.email,
          amount: verifyData.data.amount / 100,
          currency: verifyData.data.currency,
          reference: verifyData.data.reference,
        };

        this.notificationClient.emit(
          EmailPatterns.PAYMENT_SUCCESS,
          withServiceAuth(emailDto, this.serviceToken),
        );
      }

      return { received: true };
    } catch {
      return { received: true };
    }
  }

  async findAll(
    query: PaginationDto,
  ): Promise<PaginationResponseDto<Transaction>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const response: PaginationResponseDto<Transaction> = {
      data: [],
      total: 0,
      page,
      limit,
    };
    try {
      const result = await this.transactionRepo.findAndCount({
        where: query.id ? { user_id: query.id } : {},
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: 'DESC' },
      });
      response.data = result[0];
      response.total = result[1];
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get transactions',
      } as ServiceError);
    }
    return response;
  }

  async findOne(id: string) {
    try {
      return await this.transactionRepo.findOne({ where: { id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get transaction',
      } as ServiceError);
    }
  }

  async findByOrderId(id: string) {
    try {
      return await this.transactionRepo.findOne({ where: { source_id: id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get transaction',
      } as ServiceError);
    }
  }

  async update(id: string | undefined, dto: UpdateTransactionDto) {
    try {
      const existing = await this.transactionRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Transaction not found',
        } as ServiceError);
      }
      const result = await this.transactionRepo.update({ id }, dto);
      return result.raw;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to update transaction',
          } as ServiceError);
    }
  }

  async remove(id: string) {
    try {
      const existing = await this.findOne(id);
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Transaction not found',
        } as ServiceError);
      }
      await this.transactionRepo.remove(existing);
      return { message: 'Transaction removed successfully' };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to remove transaction',
          } as ServiceError);
    }
  }
}
