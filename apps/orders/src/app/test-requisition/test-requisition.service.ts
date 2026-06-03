import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
  CreateTestRequisitionDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdateTestRequisitionDto,
  RequisitionStatus,
  PatientPatterns,
  LaboratoryPatterns,
  AuthPatterns,
  EmailPatterns,
  TestRequisitionEmailDto,
  DeclineTestRequisitionDto,
  CreateTransactionDto,
  TransactionSourceType,
  PaymentGateway,
  TransactionPatterns,
  PaystackInitializeResponse,
  PaymentStatus,
} from '@medicpadi-backend/contracts';
import { TestRequisition } from '../../entities/test-requisition.entity';
import { TestRequisitionItem } from '../../entities/test-requisition-item.entity';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { withServiceAuth } from '@medicpadi-backend/utils';

@Injectable()
export class TestRequisitionService {
  constructor(
    @InjectRepository(TestRequisition)
    private readonly requisitionRepo: Repository<TestRequisition>,
    @InjectRepository(TestRequisitionItem)
    private readonly itemRepo: Repository<TestRequisitionItem>,
    @Inject('PROFILE_SERVICE') private readonly profileClient: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
    @Inject('TRANSACTIONS_SERVICE')
    private readonly transactionsClient: ClientProxy,
    private readonly dataSource: DataSource,
    @Inject() private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>(
      'appConfig.internalServiceToken',
    );
  }

  async create(dto: CreateTestRequisitionDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { items, ...requisitionData } = dto;
      const requisition = queryRunner.manager.create(
        TestRequisition,
        requisitionData,
      );
      await queryRunner.manager.save(requisition);
      const total = items.reduce((sum, item) => sum + item.unit_price, 0);
      await queryRunner.manager.update(
        TestRequisition,
        { id: requisition.id },
        { total_amount: total },
      );
      const reqItems = items.map((item) =>
        queryRunner.manager.create(TestRequisitionItem, {
          ...item,
          requisition_id: requisition.id,
        }),
      );
      await queryRunner.manager.save(reqItems);
      await queryRunner.commitTransaction();

      // Notify patient and lab — fire-and-forget
      const token = this.serviceToken;
      Promise.all([
        firstValueFrom(
          this.authClient.send(
            AuthPatterns.FIND_BY_ID,
            withServiceAuth(dto.patient_id, token),
          ),
        ),
        firstValueFrom(
          this.profileClient.send(
            PatientPatterns.RETRIEVE,
            withServiceAuth(dto.patient_id, token),
          ),
        ),
        firstValueFrom(
          this.profileClient.send(
            LaboratoryPatterns.RETRIEVE,
            withServiceAuth(dto.lab_id, token),
          ),
        ),
      ])
        .then(([patientAuth, patient, lab]) =>
          firstValueFrom(
            this.authClient.send(
              AuthPatterns.FIND_BY_ID,
              withServiceAuth(lab.user_id, token),
            ),
          ).then((labAuth) => {
            const emailDto: TestRequisitionEmailDto = {
              patientEmail: patientAuth.email,
              patientName:
                `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() ||
                patientAuth.email,
              labEmail: labAuth.email,
              labName: lab.name ?? undefined,
              requisitionId: requisition.id,
              acceptLink: `https://api.medicpadi.com/api/orders/test-requisitions/${requisition.id}/accept`,
            };
            this.notificationClient.emit(
              EmailPatterns.TEST_REQUISITION_CREATED,
              withServiceAuth(emailDto, token),
            );
          }),
        )
        .catch(() => {});

      return { ...requisition, total_amount: total, items: reqItems };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create test requisition',
      } as ServiceError);
    } finally {
      await queryRunner.release();
    }
  }

  async accept(id: string) {
    try {
      const existing = await this.requisitionRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Test requisition not found',
        } as ServiceError);
      }
      if (existing.status !== RequisitionStatus.PENDING) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Only pending requisitions can be accepted',
        } as ServiceError);
      }

      await this.requisitionRepo.update(
        { id },
        { status: RequisitionStatus.ACCEPTED, payment_status: PaymentStatus.PENDING },
      );

      const token = this.serviceToken;

      const transactionDto: CreateTransactionDto = {
        user_id: existing.patient_id,
        source_type: TransactionSourceType.TEST_REQUISITION,
        source_id: existing.id,
        provider_id: existing.lab_id,
        amount: Number(existing.total_amount) || 0,
        gateway: PaymentGateway.PAYSTACK,
      };

      const initTransaction: PaystackInitializeResponse = await firstValueFrom(
        this.transactionsClient.send(
          TransactionPatterns.TRANSACTIONS.CREATE,
          withServiceAuth(transactionDto, token),
        ),
      );

      // Notify patient with payment link — fire-and-forget
      Promise.all([
        firstValueFrom(
          this.authClient.send(
            AuthPatterns.FIND_BY_ID,
            withServiceAuth(existing.patient_id, token),
          ),
        ),
        firstValueFrom(
          this.profileClient.send(
            PatientPatterns.RETRIEVE,
            withServiceAuth(existing.patient_id, token),
          ),
        ),
        firstValueFrom(
          this.profileClient.send(
            LaboratoryPatterns.RETRIEVE,
            withServiceAuth(existing.lab_id, token),
          ),
        ),
      ])
        .then(([patientAuth, patient, lab]) => {
          const emailDto: TestRequisitionEmailDto = {
            patientEmail: patientAuth.email,
            patientName:
              `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() ||
              patientAuth.email,
            labName: lab.name ?? undefined,
            requisitionId: existing.id,
            paymentLink: initTransaction.data.authorization_url,
          };
          this.notificationClient.emit(
            EmailPatterns.TEST_REQUISITION_ACCEPTED,
            withServiceAuth(emailDto, token),
          );
        })
        .catch(() => {});

      return { authorization_url: initTransaction.data.authorization_url };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to accept test requisition',
          } as ServiceError);
    }
  }

  async decline(dto: DeclineTestRequisitionDto) {
    try {
      const existing = await this.requisitionRepo.findOne({
        where: { id: dto.id },
      });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Test requisition not found',
        } as ServiceError);
      }
      if (existing.status !== RequisitionStatus.PENDING) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Only pending requisitions can be declined',
        } as ServiceError);
      }

      const notes = dto.notes || 'Declined by lab';
      await this.requisitionRepo.update(
        { id: dto.id },
        { status: RequisitionStatus.CANCELLED, notes },
      );

      // Notify patient of declined requisition — fire-and-forget
      const token = this.serviceToken;
      Promise.all([
        firstValueFrom(
          this.authClient.send(
            AuthPatterns.FIND_BY_ID,
            withServiceAuth(existing.patient_id, token),
          ),
        ),
        firstValueFrom(
          this.profileClient.send(
            PatientPatterns.RETRIEVE,
            withServiceAuth(existing.patient_id, token),
          ),
        ),
        firstValueFrom(
          this.profileClient.send(
            LaboratoryPatterns.RETRIEVE,
            withServiceAuth(existing.lab_id, token),
          ),
        ),
      ])
        .then(([patientAuth, patient, lab]) => {
          const emailDto: TestRequisitionEmailDto = {
            patientEmail: patientAuth.email,
            patientName:
              `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() ||
              patientAuth.email,
            labName: lab.name ?? undefined,
            requisitionId: existing.id,
            notes,
          };
          this.notificationClient.emit(
            EmailPatterns.TEST_REQUISITION_DECLINED,
            withServiceAuth(emailDto, token),
          );
        })
        .catch(() => {});

      return { message: 'Test requisition declined' };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to decline test requisition',
          } as ServiceError);
    }
  }

  async completePayment(id: string) {
    try {
      const existing = await this.requisitionRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Test requisition not found',
        } as ServiceError);
      }
      await this.requisitionRepo.update(
        { id },
        { payment_status: PaymentStatus.PAID },
      );
      return { message: 'Payment completed' };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to complete payment for test requisition',
          } as ServiceError);
    }
  }

  async findAll(
    query: PaginationDto,
  ): Promise<PaginationResponseDto<TestRequisition>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const response: PaginationResponseDto<TestRequisition> = {
      data: [],
      total: 0,
      page,
      limit,
    };
    try {
      const result = await this.requisitionRepo.findAndCount({
        where: query.id
          ? [
              { patient_id: query.id },
              { lab_id: query.id },
              { referring_provider_id: query.id },
            ]
          : {},
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: 'DESC' },
      });
      response.data = result[0];
      response.total = result[1];
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get test requisitions',
      } as ServiceError);
    }
    return response;
  }

  async listPatients(labId: string) {
    try {
      const patients = await this.requisitionRepo
        .createQueryBuilder('requisition')
        .select('DISTINCT requisition.patient_id', 'patient_id')
        .where('requisition.lab_id = :labId', { labId })
        .getRawMany();
      return patients.map((p) =>
        firstValueFrom(
          this.profileClient.send(
            PatientPatterns.RETRIEVE,
            withServiceAuth(p.patient_id, this.serviceToken),
          ),
        ),
      );
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get patients for lab',
      } as ServiceError);
    }
  }

  async findOne(id: string) {
    try {
      const requisition = await this.requisitionRepo.findOne({ where: { id } });
      if (!requisition) return null;
      const items = await this.itemRepo.find({ where: { requisition_id: id } });
      return { ...requisition, items };
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get test requisition',
      } as ServiceError);
    }
  }

  async update(id: string | undefined, dto: UpdateTestRequisitionDto) {
    try {
      const existing = await this.requisitionRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Test requisition not found',
        } as ServiceError);
      }
      const { items, ...updateData } = dto;
      const result = await this.requisitionRepo.update({ id }, updateData);
      return result.raw;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to update test requisition',
          } as ServiceError);
    }
  }

  async remove(id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const existing = await this.requisitionRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Test requisition not found',
        } as ServiceError);
      }
      await queryRunner.manager.delete(TestRequisitionItem, {
        requisition_id: id,
      });
      await queryRunner.manager.remove(existing);
      await queryRunner.commitTransaction();
      return { message: 'Test requisition removed successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to remove test requisition',
          } as ServiceError);
    } finally {
      await queryRunner.release();
    }
  }
}
