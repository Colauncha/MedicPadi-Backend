import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Raw, Repository } from 'typeorm';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import {
  CreateTransactionDto,
  CreateWalletDto,
  CreateWithdrawalDto,
  PaginationDto,
  PaginationResponseDto,
  PaymentSuccessEventDto,
  PaymentStatus,
  ServiceError,
  UpdateTransactionDto,
  PaymentGateway,
  AuthPatterns,
  PaystackInitializeResponse,
  PaystackVerifyResponse,
  NotificationEvents,
  OrderPatterns,
  PaystackBank,
  PaystackResolvedAccount,
  PaystackResponse,
  PaystackTransfer,
  PaystackTransferRecipient,
  SavePayoutAccountDto,
  WithdrawalEventDto,
  WithdrawalStatus,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse, withServiceAuth, logError } from '@medicpadi-backend/utils';
import { Transaction } from '../../entities/transaction.entity';
import { Wallet } from '../../entities/wallet.entity';
import { PayoutAccount } from '../../entities/payout-account.entity';
import { Withdrawal } from '../../entities/withdrawal.entity';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/** Paystack answered and declined the request, so we know nothing happened on its side. */
class PaystackRejectedException extends RpcException {
  constructor(
    message: string,
    readonly httpStatus?: number,
  ) {
    super({ statusCode: HttpStatus.BAD_GATEWAY, message } as ServiceError);
  }
}

type FinalWithdrawalStatus =
  | WithdrawalStatus.SUCCESS
  | WithdrawalStatus.FAILED
  | WithdrawalStatus.REVERSED;

const BANK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);
  private bankCache?: { banks: PaystackBank[]; expiresAt: number };

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(PayoutAccount)
    private readonly payoutAccountRepo: Repository<PayoutAccount>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepo: Repository<Withdrawal>,
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

  private get commissionRate(): number {
    const rate = this.configService.get<number>('appConfig.medicpadiCommission');
    if (rate === undefined || Number.isNaN(rate) || rate < 0 || rate >= 1) {
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Invalid MEDICPADI_COMMISION configuration',
      } as ServiceError);
    }
    return rate;
  }

  private get minWithdrawal(): number {
    const min = this.configService.get<number>('appConfig.minWithdrawal') ?? 0;
    if (Number.isNaN(min) || min < 0) {
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Invalid MIN_WITHDRAWAL_AMOUNT configuration',
      } as ServiceError);
    }
    return min;
  }

  /**
   * Calls the Paystack API. Throws PaystackRejectedException when Paystack declines the
   * request; network errors and 5xx answers are rethrown as-is since their outcome is unknown.
   */
  private async paystackRequest<T>(
    path: string,
    init: { method?: string; body?: unknown } = {},
    failureMessage = 'Paystack request failed',
  ): Promise<PaystackResponse<T>> {
    const paystackUrl = this.configService.get<string>(
      'paystackConfig.paystackApiUrl',
    );
    const paystackSecretKey = this.configService.get<string>(
      'paystackConfig.secretKey',
    );
    const response = await fetch(`${paystackUrl}${path}`, {
      ...(init.method ? { method: init.method } : {}),
      headers: {
        ...(init.body !== undefined
          ? { 'Content-Type': 'application/json' }
          : {}),
        Authorization: `Bearer ${paystackSecretKey}`,
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
    const data: PaystackResponse<T> = await response.json();

    if (!data.status) {
      if (response.status >= 500) {
        throw new Error(
          `Paystack ${path} answered ${response.status}: ${data.message}`,
        );
      }
      throw new PaystackRejectedException(
        data.message || failureMessage,
        response.status,
      );
    }
    return data;
  }

  private readonly tranxSourceMap = {
    appointment: OrderPatterns.APPOINTMENTS,
    drug_requisition: OrderPatterns.DRUG_REQUISITIONS,
    test_requisition: OrderPatterns.TEST_REQUISITIONS,
    subscription: null,
  };

  async create(dto: CreateTransactionDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log('Creating transaction with DTO:', dto);
      const user = await firstValueFrom(
        this.authClient.send(
          AuthPatterns.FIND_BY_ID,
          withServiceAuth(dto.user_id, this.serviceToken),
        ),
      );

      if (dto.gateway === PaymentGateway.PAYSTACK) {
        const data: PaystackInitializeResponse = await this.paystackRequest(
          '/transaction/initialize',
          {
            method: 'POST',
            body: {
              email: user.email,
              amount: Math.round(dto.amount * 100),
              currency: dto.currency,
              metadata: {
                user_id: dto.user_id,
                source_type: dto.source_type,
                source_id: dto.source_id,
                provider_id: dto.provider_id,
              },
            },
          },
          'Unable to initialize transaction',
        );

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
      logError(error, `${TransactionsService.name}.create`);
      await queryRunner.rollbackTransaction();
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Unable to create transaction',
            error: error instanceof Error ? error.message : String(error),
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
      logError(error, `${TransactionsService.name}.createWallet`);
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
      logError(error, `${TransactionsService.name}.getWallet`);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Unable to retrieve wallet',
      } as ServiceError);
    }
  }

  async verify(reference: string, partial: boolean = false) {
    try {
      const data: PaystackVerifyResponse = await this.paystackRequest(
        `/transaction/verify/${encodeURIComponent(reference)}`,
        {},
        'Unable to verify transaction',
      );
      console.log('Server processed data:', data);

      const transaction = await this.transactionRepo.findOne({
        where: { gateway_reference: reference },
      });
      console.log('Transaction:', transaction);

      if (transaction) {
        const newStatus =
          data.data.status === 'success'
            ? PaymentStatus.ESCROW
            : PaymentStatus.FAILED;
        await this.transactionRepo.update(transaction.id, {
          payment_status: newStatus,
        });
      }

      if (partial) return data;

      console.log('Full method invoked');
      if (data.data.status === 'success') {
        const sourcePatterns = transaction?.source_type
          ? (this.tranxSourceMap[transaction.source_type] as any)
          : null;
        if (sourcePatterns?.COMPLETE_PAYMENT) {
          await firstValueFrom(
            this.orderClient.emit(
              sourcePatterns.COMPLETE_PAYMENT,
              withServiceAuth(transaction?.source_id, this.serviceToken),
            ),
          );
        }
      }
      return data;
    } catch (error) {
      logError(error, `${TransactionsService.name}.verify`);
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Unable to verify transaction',
          } as ServiceError);
    }
  }

  async handleWebhook(payload: { event: string; data: any }) {
    console.log('Payload from paystack', payload);
    switch (payload.event) {
      case 'charge.success':
        return this.handleChargeSuccess(payload);
      case 'transfer.success':
      case 'transfer.failed':
      case 'transfer.reversed':
        return this.handleTransferEvent(payload);
      default:
        return { received: true };
    }
  }

  private async handleChargeSuccess(payload: { event: string; data: any }) {
    try {
      const reference = payload.data?.reference as string;
      const verifyData = await this.verify(reference, true);

      if (verifyData && verifyData.data.status === 'success') {
        let existingTranx = await this.transactionRepo.findOne({
          where: { gateway_reference: reference },
        });

        if (existingTranx) {
          existingTranx.payment_status = PaymentStatus.ESCROW;
          await this.transactionRepo.save(existingTranx);
        }

        const sourcePatterns = existingTranx?.source_type
          ? (this.tranxSourceMap[existingTranx.source_type] as any)
          : null;
        if (sourcePatterns?.COMPLETE_PAYMENT) {
          this.orderClient.emit(
            sourcePatterns.COMPLETE_PAYMENT,
            withServiceAuth(existingTranx?.source_id, this.serviceToken),
          );
        }

        const paymentEventDto: PaymentSuccessEventDto = {
          userId: verifyData.data.metadata?.user_id,
          amount: verifyData.data.amount / 100,
          currency: verifyData.data.currency,
          reference: verifyData.data.reference,
        };

        this.notificationClient.emit(
          NotificationEvents.PAYMENT_SUCCESS,
          withServiceAuth(paymentEventDto, this.serviceToken),
        );
      }

      return { received: true };
    } catch {
      return { received: true };
    }
  }

  async creditProviderWallet(sourceId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { source_id: sourceId },
        order: { createdAt: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      if (!transaction) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Transaction not found',
        } as ServiceError);
      }
      // Idempotent: a retried credit must not pay the provider twice
      if (transaction.payment_status === PaymentStatus.PAID) {
        await queryRunner.commitTransaction();
        return { message: 'Provider wallet already credited' };
      }
      if (transaction.payment_status !== PaymentStatus.ESCROW) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Transaction is not in escrow',
        } as ServiceError);
      }
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { user_id: transaction.provider_id! },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Provider wallet not found',
        } as ServiceError);
      }
      const amount = Number(transaction.amount);
      const payout = Math.round(amount * (1 - this.commissionRate) * 100) / 100;
      const commission = Math.round((amount - payout) * 100) / 100;

      wallet.balance = Math.round((Number(wallet.balance) + payout) * 100) / 100;
      await queryRunner.manager.save(wallet);
      transaction.payment_status = PaymentStatus.PAID;
      await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();
      return {
        message: 'Provider wallet credited successfully',
        amount,
        commission,
        payout,
      };
    } catch (error) {
      logError(error, `${TransactionsService.name}.creditProviderWallet`);
      await queryRunner.rollbackTransaction();
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Unable to credit provider wallet',
          } as ServiceError);
    } finally {
      queryRunner.release();
    }
  }

  async refundTransaction(sourceId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { source_id: sourceId },
        order: { createdAt: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      if (!transaction) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Transaction not found',
        } as ServiceError);
      }
      // Idempotent: a retried refund must not hit the gateway twice
      if (transaction.payment_status === PaymentStatus.REFUNDED) {
        await queryRunner.commitTransaction();
        return { message: 'Transaction already refunded' };
      }
      if (transaction.payment_status !== PaymentStatus.ESCROW) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Only escrowed transactions can be refunded',
        } as ServiceError);
      }

      if (transaction.gateway === PaymentGateway.PAYSTACK) {
        await this.paystackRequest(
          '/refund',
          {
            method: 'POST',
            body: { transaction: transaction.gateway_reference },
          },
          'Unable to refund transaction',
        );
      } else {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Refunds are not supported for this payment gateway',
        } as ServiceError);
      }

      transaction.payment_status = PaymentStatus.REFUNDED;
      await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();
      return { message: 'Transaction refunded successfully' };
    } catch (error) {
      logError(error, `${TransactionsService.name}.refundTransaction`);
      await queryRunner.rollbackTransaction();
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Unable to refund transaction',
          } as ServiceError);
    } finally {
      queryRunner.release();
    }
  }

  async listBanks() {
    if (this.bankCache && this.bankCache.expiresAt > Date.now()) {
      return this.bankCache.banks;
    }
    try {
      const banks: PaystackBank[] = [];
      let next: string | null | undefined;
      do {
        const page = await this.paystackRequest<PaystackBank[]>(
          `/bank?country=nigeria&currency=NGN&use_cursor=true&perPage=100${
            next ? `&next=${encodeURIComponent(next)}` : ''
          }`,
          {},
          'Unable to fetch banks',
        );
        banks.push(...page.data.filter((bank) => bank.active));
        next = page.meta?.next;
      } while (next);

      this.bankCache = { banks, expiresAt: Date.now() + BANK_CACHE_TTL_MS };
      return banks;
    } catch (error) {
      logError(error, `${TransactionsService.name}.listBanks`);
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.BAD_GATEWAY,
            message: 'Unable to fetch banks',
          } as ServiceError);
    }
  }

  /** Resolves the bank account with Paystack and saves it as the user's payout destination. */
  async savePayoutAccount(dto: SavePayoutAccountDto) {
    try {
      if (!dto.user_id) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'user_id is required',
        } as ServiceError);
      }
      const resolved = await this.paystackRequest<PaystackResolvedAccount>(
        `/bank/resolve?account_number=${encodeURIComponent(
          dto.account_number,
        )}&bank_code=${encodeURIComponent(dto.bank_code)}`,
        {},
        'Unable to resolve bank account',
      );
      const recipient = await this.paystackRequest<PaystackTransferRecipient>(
        '/transferrecipient',
        {
          method: 'POST',
          body: {
            type: 'nuban',
            name: resolved.data.account_name,
            account_number: dto.account_number,
            bank_code: dto.bank_code,
            currency: 'NGN',
          },
        },
        'Unable to register bank account',
      );

      const existing = await this.payoutAccountRepo.findOne({
        where: { user_id: dto.user_id },
      });
      const account = this.payoutAccountRepo.create({
        ...existing,
        user_id: dto.user_id,
        bank_code: dto.bank_code,
        bank_name: recipient.data.details.bank_name,
        account_number: dto.account_number,
        account_name: resolved.data.account_name,
        recipient_code: recipient.data.recipient_code,
        currency: 'NGN',
      });
      return await this.payoutAccountRepo.save(account);
    } catch (error) {
      logError(error, `${TransactionsService.name}.savePayoutAccount`);
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Unable to save payout account',
          } as ServiceError);
    }
  }

  async getPayoutAccount(userId: string) {
    try {
      return await this.payoutAccountRepo.findOne({
        where: { user_id: userId },
      });
    } catch (error) {
      logError(error, `${TransactionsService.name}.getPayoutAccount`);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Unable to retrieve payout account',
      } as ServiceError);
    }
  }

  /**
   * Holds the amount by debiting the wallet, then asks Paystack to transfer it.
   * The transfer.* webhook settles the withdrawal; failed transfers are re-credited.
   */
  async createWithdrawal(dto: CreateWithdrawalDto) {
    const userId = dto.user_id;
    const amount = Math.round(Number(dto.amount) * 100) / 100;
    if (!userId || !(amount > 0)) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'A user and a positive amount are required',
      } as ServiceError);
    }
    if (amount < this.minWithdrawal) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `The minimum withdrawal is ${this.minWithdrawal}`,
      } as ServiceError);
    }

    // A withdrawal left unsettled (missed webhook or lost Paystack answer) would block
    // the user forever, so settle it from Paystack's records first.
    const stale = await this.withdrawalRepo.findOne({
      where: {
        user_id: userId,
        status: In([WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING]),
        createdAt: Raw((column) => `${column} < NOW() - INTERVAL '10 minutes'`),
      },
    });
    if (stale) {
      await this.reconcileWithdrawal(stale);
    }

    const withdrawal = await this.holdWithdrawal(userId, amount);

    try {
      const { data } = await this.paystackRequest<PaystackTransfer>(
        '/transfer',
        {
          method: 'POST',
          body: {
            source: 'balance',
            amount: Math.round(amount * 100),
            recipient: withdrawal.recipient_code,
            reference: withdrawal.reference,
            currency: withdrawal.currency,
            reason: 'MedicPadi wallet withdrawal',
          },
        },
        'Unable to initiate withdrawal',
      );
      await this.applyTransferOutcome(
        withdrawal.reference,
        data.status,
        undefined,
        data.transfer_code,
      );
    } catch (error) {
      if (error instanceof PaystackRejectedException) {
        const reason = (error.getError() as ServiceError).message;
        await this.finalizeWithdrawal(
          withdrawal.reference,
          WithdrawalStatus.FAILED,
          reason,
        );
        throw error;
      }
      // Paystack may or may not have queued the transfer, so keep the hold;
      // the webhook or the next reconcile settles it.
      this.logger.error(
        `Withdrawal ${withdrawal.reference} outcome unknown: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
      );
    }

    return this.withdrawalRepo.findOne({
      where: { reference: withdrawal.reference },
    });
  }

  /** Debits the wallet and records a pending withdrawal in one DB transaction. */
  private async holdWithdrawal(userId: string, amount: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { user_id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Wallet not found',
        } as ServiceError);
      }
      const account = await queryRunner.manager.findOne(PayoutAccount, {
        where: { user_id: userId },
      });
      if (!account) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Add a payout bank account before withdrawing',
        } as ServiceError);
      }
      // One withdrawal at a time; the wallet lock serialises this check
      const inFlight = await queryRunner.manager.findOne(Withdrawal, {
        where: {
          user_id: userId,
          status: In([WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING]),
        },
      });
      if (inFlight) {
        throw new RpcException({
          statusCode: HttpStatus.CONFLICT,
          message: 'A withdrawal is already in progress',
        } as ServiceError);
      }
      if (amount > Number(wallet.balance)) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Insufficient wallet balance',
        } as ServiceError);
      }

      wallet.balance = Math.round((Number(wallet.balance) - amount) * 100) / 100;
      await queryRunner.manager.save(wallet);
      const withdrawal = await queryRunner.manager.save(
        queryRunner.manager.create(Withdrawal, {
          user_id: userId,
          amount,
          currency: wallet.currency ?? 'NGN',
          status: WithdrawalStatus.PENDING,
          reference: randomUUID(),
          recipient_code: account.recipient_code,
        }),
      );
      await queryRunner.commitTransaction();
      return withdrawal;
    } catch (error) {
      logError(error, `${TransactionsService.name}.holdWithdrawal`);
      await queryRunner.rollbackTransaction();
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Unable to create withdrawal',
          } as ServiceError);
    } finally {
      await queryRunner.release();
    }
  }

  /** Brings a withdrawal in line with what Paystack has on record for it. */
  private async reconcileWithdrawal(withdrawal: Withdrawal) {
    try {
      const { data } = await this.paystackRequest<PaystackTransfer>(
        `/transfer/verify/${encodeURIComponent(withdrawal.reference)}`,
        {},
        'Unable to verify transfer',
      );
      await this.applyTransferOutcome(
        withdrawal.reference,
        data.status,
        undefined,
        data.transfer_code,
      );
    } catch (error) {
      // Paystack never received the transfer, so no money left: release the hold
      if (
        error instanceof PaystackRejectedException &&
        error.httpStatus === HttpStatus.NOT_FOUND
      ) {
        const settled = await this.finalizeWithdrawal(
          withdrawal.reference,
          WithdrawalStatus.FAILED,
          'Transfer was never created',
        );
        if (settled) this.notifyWithdrawal(settled);
        return;
      }
      logError(error, `${TransactionsService.name}.reconcileWithdrawal`);
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.BAD_GATEWAY,
            message: 'Unable to confirm your previous withdrawal, try again later',
          } as ServiceError);
    }
  }

  private async handleTransferEvent(payload: { event: string; data: any }) {
    const reference = payload.data?.reference as string | undefined;
    if (!reference) {
      return { received: true };
    }
    // Errors propagate so Paystack retries the webhook; settling is idempotent
    await this.applyTransferOutcome(
      reference,
      payload.event.slice('transfer.'.length),
      payload.data?.reason ?? payload.data?.gateway_response,
      payload.data?.transfer_code,
    );
    return { received: true };
  }

  private async applyTransferOutcome(
    reference: string,
    status: string,
    reason?: string,
    transferCode?: string,
  ) {
    let settled: Withdrawal | null;
    switch (status) {
      case 'success':
        settled = await this.finalizeWithdrawal(
          reference,
          WithdrawalStatus.SUCCESS,
        );
        break;
      case 'failed':
        settled = await this.finalizeWithdrawal(
          reference,
          WithdrawalStatus.FAILED,
          reason || 'Transfer failed',
        );
        break;
      case 'reversed':
        settled = await this.finalizeWithdrawal(
          reference,
          WithdrawalStatus.REVERSED,
          reason || 'Transfer reversed',
        );
        break;
      default:
        // pending / received / otp: Paystack still holds it. An 'otp' transfer only
        // moves once someone enters the OTP, so it is logged rather than re-credited.
        if (status === 'otp') {
          this.logger.error(
            `Withdrawal ${reference} awaits OTP approval; disable transfer OTP on the Paystack account`,
          );
        }
        await this.withdrawalRepo.update(
          { reference, status: WithdrawalStatus.PENDING },
          {
            status: WithdrawalStatus.PROCESSING,
            ...(transferCode ? { transfer_code: transferCode } : {}),
          },
        );
        return;
    }
    if (settled) this.notifyWithdrawal(settled);
  }

  /**
   * Moves a withdrawal to a final status, returning the held amount to the wallet when the
   * transfer failed or was reversed. Returns null when there is nothing to change.
   */
  private async finalizeWithdrawal(
    reference: string,
    status: FinalWithdrawalStatus,
    reason?: string,
  ): Promise<Withdrawal | null> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const withdrawal = await queryRunner.manager.findOne(Withdrawal, {
        where: { reference },
        lock: { mode: 'pessimistic_write' },
      });
      // A bank can reverse a transfer after it succeeded; anything else final is a replay
      const isFinal =
        withdrawal?.status === WithdrawalStatus.FAILED ||
        withdrawal?.status === WithdrawalStatus.REVERSED ||
        (withdrawal?.status === WithdrawalStatus.SUCCESS &&
          status !== WithdrawalStatus.REVERSED);
      if (!withdrawal || isFinal) {
        await queryRunner.commitTransaction();
        return null;
      }

      if (status !== WithdrawalStatus.SUCCESS) {
        const wallet = await queryRunner.manager.findOne(Wallet, {
          where: { user_id: withdrawal.user_id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!wallet) {
          throw new RpcException({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Wallet not found',
          } as ServiceError);
        }
        wallet.balance =
          Math.round((Number(wallet.balance) + Number(withdrawal.amount)) * 100) /
          100;
        await queryRunner.manager.save(wallet);
        withdrawal.failure_reason = reason;
      }
      withdrawal.status = status;
      await queryRunner.manager.save(withdrawal);
      await queryRunner.commitTransaction();
      return withdrawal;
    } catch (error) {
      logError(error, `${TransactionsService.name}.finalizeWithdrawal`);
      await queryRunner.rollbackTransaction();
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Unable to settle withdrawal',
          } as ServiceError);
    } finally {
      await queryRunner.release();
    }
  }

  private notifyWithdrawal(withdrawal: Withdrawal) {
    const event: WithdrawalEventDto = {
      userId: withdrawal.user_id,
      amount: Number(withdrawal.amount),
      currency: withdrawal.currency,
      reference: withdrawal.reference,
      reason: withdrawal.failure_reason,
    };
    this.notificationClient.emit(
      withdrawal.status === WithdrawalStatus.SUCCESS
        ? NotificationEvents.WITHDRAWAL_SUCCESS
        : NotificationEvents.WITHDRAWAL_FAILED,
      withServiceAuth(event, this.serviceToken),
    );
  }

  async findWithdrawals(
    query: PaginationDto,
  ): Promise<PaginationResponseDto<Withdrawal>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    try {
      const [data, total] = await this.withdrawalRepo.findAndCount({
        where: { user_id: query.id },
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: 'DESC' },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      logError(error, `${TransactionsService.name}.findWithdrawals`);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Unable to get withdrawals',
      } as ServiceError);
    }
  }

  async findAll(
    query: PaginationDto,
  ): Promise<PaginationResponseDto<Transaction>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    try {
      const [data, total] = await this.transactionRepo.findAndCount({
        // A user's transactions are those they paid for or were paid through
        where: query.id
          ? [{ user_id: query.id }, { provider_id: query.id }]
          : {},
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: 'DESC' },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      logError(error, `${TransactionsService.name}.findAll`);
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get transactions',
      } as ServiceError);
    }
  }

  async findOne(id: string) {
    try {
      return await this.transactionRepo.findOne({ where: { id } });
    } catch (error) {
      logError(error, `${TransactionsService.name}.findOne`);
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
      logError(error, `${TransactionsService.name}.findByOrderId`);
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
      logError(error, `${TransactionsService.name}.update`);
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
      logError(error, `${TransactionsService.name}.remove`);
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to remove transaction',
          } as ServiceError);
    }
  }
}
