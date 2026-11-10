import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  FindOptionsOrderValue,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
  AuthRole,
  CreateDrugRequisitionDto,
  CreateTransactionDto,
  DrugRequisitionQueryDto,
  DrugRequisitionCreatedEventDto,
  DrugRequisitionStatusChangedEventDto,
  NotificationEvents,
  PaginationResponseDto,
  PaymentGateway,
  PaymentStatus,
  PaystackInitializeResponse,
  RequisitionStatus,
  ServiceError,
  TransactionPatterns,
  TransactionSourceType,
  UpdateDrugRequisitionDto,
  PharmacyPatterns,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse, withServiceAuth, logError } from '@medicpadi-backend/utils';
import { DrugRequisition } from '../../entities/drug-requisition.entity';
import { DrugRequisitionItem } from '../../entities/drug-requisition-item.entity';
import { Prescription } from '../../entities/prescription.entity';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

// Target status → statuses the pharmacy may move from. CANCELLED is a decline.
const PHARMACY_TRANSITIONS: Partial<
  Record<RequisitionStatus, RequisitionStatus[]>
> = {
  [RequisitionStatus.ACCEPTED]: [RequisitionStatus.PENDING],
  [RequisitionStatus.CANCELLED]: [
    RequisitionStatus.PENDING,
    RequisitionStatus.ACCEPTED,
  ],
  [RequisitionStatus.PROCESSING]: [RequisitionStatus.ACCEPTED],
  [RequisitionStatus.READY]: [RequisitionStatus.PROCESSING],
};

@Injectable()
export class DrugRequisitionService {
  constructor(
    @InjectRepository(DrugRequisition)
    private readonly requisitionRepo: Repository<DrugRequisition>,
    @InjectRepository(DrugRequisitionItem)
    private readonly itemRepo: Repository<DrugRequisitionItem>,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
    @Inject('TRANSACTIONS_SERVICE')
    private readonly transactionsClient: ClientProxy,
    @Inject('PROFILE_SERVICE')
    private readonly profileClient: ClientProxy,
    private readonly dataSource: DataSource,
    @Inject() private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>(
      'appConfig.internalServiceToken',
    );
  }

  private async initializePaymentAndNotify(
    requisition: DrugRequisition,
    amount: number,
  ): Promise<PaystackInitializeResponse> {
    const token = this.serviceToken;
    const transactionDto: CreateTransactionDto = {
      user_id: requisition.patient_id,
      source_type: TransactionSourceType.DRUG_REQUISITION,
      source_id: requisition.id,
      provider_id: requisition.pharmacy_id,
      amount,
      gateway: PaymentGateway.PAYSTACK,
    };
    const initTransaction: PaystackInitializeResponse = await firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.TRANSACTIONS.CREATE,
        withServiceAuth(transactionDto, token),
      ),
    );
    const eventDto: DrugRequisitionCreatedEventDto = {
      requisitionId: requisition.id,
      patientId: requisition.patient_id,
      pharmacyId: requisition.pharmacy_id,
      paymentLink: initTransaction.data.authorization_url,
    };
    this.notificationClient.emit(
      NotificationEvents.DRUG_REQUISITION_CREATED,
      withServiceAuth(eventDto, token),
    );
    return initTransaction;
  }

  async create(dto: CreateDrugRequisitionDto) {
    let requisition!: DrugRequisition;
    let reqItems!: DrugRequisitionItem[];
    let total!: number;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { items, ...requisitionData } = dto;
      const pharmProfile = await firstValueFrom(
        this.profileClient.send(
          PharmacyPatterns.RETRIEVE,
          withServiceAuth(requisitionData.pharmacy_id, this.serviceToken),
        ),
      );

      requisition = queryRunner.manager.create(DrugRequisition, {
        ...requisitionData,
        delivery_cost: pharmProfile.deliveryCost,
      });
      await queryRunner.manager.save(requisition);
      total = items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0,
      );
      total = total + parseInt(pharmProfile.deliveryCost, 10);
      await queryRunner.manager.update(
        DrugRequisition,
        { id: requisition.id },
        { total_amount: total },
      );

      let hasPrescriptionRequired = items.some(
        (item) => item.requiresPrescription,
      );
      if (hasPrescriptionRequired) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'One or more drugs require a prescription',
          error: `The following drugs require a prescription: ${items
            .filter((item) => item.requiresPrescription)
            .map((item) => item.medication_name)
            .join(', ')}`,
        } as ServiceError);
      }
      reqItems = items.map((item) =>
        queryRunner.manager.create(DrugRequisitionItem, {
          ...item,
          requisition_id: requisition.id,
        }),
      );
      await queryRunner.manager.save(reqItems);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create drug requisition',
        error,
      } as ServiceError);
    } finally {
      await queryRunner.release();
    }

    const tranx: PaystackInitializeResponse =
      await this.initializePaymentAndNotify(requisition, total);
    return {
      ...requisition,
      total_amount: total,
      items: reqItems,
      tranx: tranx.data,
    };
  }

  async requisitionFromPrescription(prescriptionId: string) {
    let requisition!: DrugRequisition;
    let reqItems!: DrugRequisitionItem[];
    let total!: number;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const existing = await this.dataSource
        .getRepository(DrugRequisition)
        .findOne({
          where: { prescription_id: prescriptionId },
        });
      if (existing) {
        throw new RpcException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Drug requisition already exists for this prescription',
        } as ServiceError);
      }
      const prescriptionData = await this.dataSource
        .getRepository(Prescription)
        .findOne({
          where: { id: prescriptionId },
          relations: ['items'],
        });
      if (!prescriptionData) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Prescription not found',
        } as ServiceError);
      }
      const { items, ...requisitionData } = prescriptionData;
      if (!requisitionData.is_electronic) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Prescription is not electronic',
        } as ServiceError);
      }
      // const pharmProfile = await firstValueFrom(
      //   this.profileClient.send(
      //     PharmacyPatterns.RETRIEVE,
      //     withServiceAuth(requisitionData.pharmacy_id, this.serviceToken),
      //   ),
      // );
      requisition = queryRunner.manager.create(DrugRequisition, {
        patient_id: requisitionData.patient_id,
        pharmacy_id: requisitionData.provider_id,
        prescription_id: prescriptionId,
      });
      await queryRunner.manager.save(requisition);
      reqItems = items.map((item) =>
        queryRunner.manager.create(DrugRequisitionItem, {
          ...item,
          requisition_id: requisition.id,
        }),
      );
      await queryRunner.manager.save(reqItems);
      total = reqItems.reduce(
        (sum, item) => sum + Number(item.unit_price) * item.quantity,
        0,
      );
      await queryRunner.manager.update(
        DrugRequisition,
        { id: requisition.id },
        { total_amount: total },
      );
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to create drug requisition from prescription',
          } as ServiceError);
    } finally {
      await queryRunner.release();
    }

    const tranx: PaystackInitializeResponse =
      await this.initializePaymentAndNotify(requisition, total);
    return { ...requisition, total_amount: total, items: reqItems, tranx };
  }

  //   async requisitionFromNonElectronicPrescription(prescriptionId: string) {
  //   let requisition!: DrugRequisition;
  //   let reqItems!: DrugRequisitionItem[];
  //   let total!: number;

  //   const queryRunner = this.dataSource.createQueryRunner();
  //   await queryRunner.connect();
  //   await queryRunner.startTransaction();
  //   try {
  //     const existing = await this.dataSource
  //       .getRepository(DrugRequisition)
  //       .findOne({
  //         where: { prescription_id: prescriptionId },
  //       });
  //     if (existing) {
  //       throw new RpcException({
  //         statusCode: HttpStatus.CONFLICT,
  //         message: 'Drug requisition already exists for this prescription',
  //       } as ServiceError);
  //     }
  //     const prescriptionData = await this.dataSource
  //       .getRepository(Prescription)
  //       .findOne({
  //         where: { id: prescriptionId },
  //         relations: ['items'],
  //       });
  //     if (!prescriptionData) {
  //       throw new RpcException({
  //         statusCode: HttpStatus.NOT_FOUND,
  //         message: 'Prescription not found',
  //       } as ServiceError);
  //     }
  //     const { items, ...requisitionData } = prescriptionData;
  //     if (!requisitionData.is_electronic) {
  //       throw new RpcException({
  //         statusCode: HttpStatus.BAD_REQUEST,
  //         message: 'Prescription is not electronic',
  //       } as ServiceError);
  //     }
  //     requisition = queryRunner.manager.create(DrugRequisition, {
  //       patient_id: requisitionData.patient_id,
  //       pharmacy_id: requisitionData.provider_id,
  //       prescription_id: prescriptionId,
  //     });
  //     await queryRunner.manager.save(requisition);
  //     reqItems = items.map((item) =>
  //       queryRunner.manager.create(DrugRequisitionItem, {
  //         ...item,
  //         requisition_id: requisition.id,
  //       }),
  //     );
  //     await queryRunner.manager.save(reqItems);
  //     total = reqItems.reduce(
  //       (sum, item) => sum + Number(item.unit_price) * item.quantity,
  //       0,
  //     );
  //     await queryRunner.manager.update(
  //       DrugRequisition,
  //       { id: requisition.id },
  //       { total_amount: total },
  //     );
  //     await queryRunner.commitTransaction();
  //   } catch (error) {
  //     await queryRunner.rollbackTransaction();
  //     throw error instanceof RpcException
  //       ? error
  //       : new RpcException({
  //           statusCode: HttpStatus.REQUEST_TIMEOUT,
  //           message: 'Unable to create drug requisition from prescription',
  //         } as ServiceError);
  //   } finally {
  //     await queryRunner.release();
  //   }

  //   await this.initializePaymentAndNotify(requisition, total);
  //   return { ...requisition, total_amount: total, items: reqItems };
  // }

  async completePayment(id: string) {
    try {
      const existing = await this.requisitionRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Drug requisition not found',
        } as ServiceError);
      }
      if (
        [PaymentStatus.PAID, PaymentStatus.ESCROW].includes(
          existing.payment_status,
        )
      ) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Payment is already completed for this drug requisition',
        } as ServiceError);
      }
      const result = await this.requisitionRepo.update(
        { id },
        { payment_status: PaymentStatus.PAID },
      );
      return result.raw;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to complete payment for drug requisition',
          } as ServiceError);
    }
  }

  async updateStatusToReceived(id: string, userId: string, role: AuthRole) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await this.requisitionRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Drug requisition not found',
        } as ServiceError);
      }
      if (role !== AuthRole.ADMIN && existing.patient_id !== userId) {
        throw new RpcException({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Only the requisition patient can mark it as received',
        } as ServiceError);
      }
      if (!this.isPaid(existing)) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Payment not completed for this drug requisition',
        } as ServiceError);
      }
      if (existing.status !== RequisitionStatus.READY) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Only dispatched requisitions can be marked as received (current: ${existing.status}).`,
        } as ServiceError);
      }

      const result = await queryRunner.manager.update(
        DrugRequisition,
        { id },
        { status: RequisitionStatus.COMPLETED },
      );

      await firstValueFrom(
        this.transactionsClient.send(
          TransactionPatterns.TRANSACTIONS.CREDIT_PROVIDER,
          withServiceAuth(id, this.serviceToken),
        ),
      );
      await queryRunner.commitTransaction();
      this.emitStatusChanged(existing, RequisitionStatus.COMPLETED, role);

      return result.raw;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to update drug requisition',
          } as ServiceError);
    } finally {
      queryRunner.release();
    }
  }

  /**
   * Pharmacy-driven progression: accept, decline (→ cancelled, refunded),
   * processing and ready (dispatched). The patient completes via
   * updateStatusToReceived.
   */
  async updateStatus(dto: {
    id: string;
    status: RequisitionStatus;
    userId: string;
    role: AuthRole;
    notes?: string;
  }) {
    const { id, status, userId, role, notes } = dto;
    try {
      const allowedFrom = PHARMACY_TRANSITIONS[status];
      if (!allowedFrom) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Pharmacy cannot set drug requisition status to ${status}`,
        } as ServiceError);
      }
      const existing = await this.requisitionRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Drug requisition not found',
        } as ServiceError);
      }
      if (role !== AuthRole.ADMIN && existing.pharmacy_id !== userId) {
        throw new RpcException({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Only the assigned pharmacy can update this requisition',
        } as ServiceError);
      }
      if (!allowedFrom.includes(existing.status)) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Drug requisition cannot move from ${existing.status} to ${status}.`,
        } as ServiceError);
      }
      // Drugs aren't prepared until the patient has paid
      if (status === RequisitionStatus.PROCESSING && !this.isPaid(existing)) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Payment not completed for this drug requisition',
        } as ServiceError);
      }

      let refunded = false;
      if (status === RequisitionStatus.CANCELLED) {
        refunded = await this.refundIfEscrowed(existing.id);
      }
      await this.requisitionRepo.update(
        { id },
        {
          status,
          ...(notes && { notes }),
          ...(refunded && { payment_status: PaymentStatus.REFUNDED }),
        },
      );
      this.emitStatusChanged(existing, status, role, { notes, refunded });

      return { id, status, refunded };
    } catch (error) {
      logError(error, `${DrugRequisitionService.name}.updateStatus`);
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to update drug requisition status',
          } as ServiceError);
    }
  }

  private isPaid(requisition: DrugRequisition) {
    return [PaymentStatus.PAID, PaymentStatus.ESCROW].includes(
      requisition.payment_status,
    );
  }

  /** Refunds the requisition's payment when it is still held in escrow. */
  private async refundIfEscrowed(requisitionId: string): Promise<boolean> {
    const tranx = await firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.TRANSACTIONS.FIND_BY_ORDER_ID,
        withServiceAuth(requisitionId, this.serviceToken),
      ),
    );
    if (tranx?.payment_status !== PaymentStatus.ESCROW) return false;
    await firstValueFrom(
      this.transactionsClient.send(
        TransactionPatterns.TRANSACTIONS.REFUND,
        withServiceAuth(requisitionId, this.serviceToken),
      ),
    );
    return true;
  }

  private emitStatusChanged(
    requisition: DrugRequisition,
    status: RequisitionStatus,
    changedBy: AuthRole,
    extras: { notes?: string; refunded?: boolean } = {},
  ) {
    const eventDto: DrugRequisitionStatusChangedEventDto = {
      requisitionId: requisition.id,
      patientId: requisition.patient_id,
      pharmacyId: requisition.pharmacy_id,
      status,
      changedBy,
      ...extras,
    };
    this.notificationClient.emit(
      NotificationEvents.DRUG_REQUISITION_STATUS_CHANGED,
      withServiceAuth(eventDto, this.serviceToken),
    );
  }

  async findAll(
    query: DrugRequisitionQueryDto,
  ): Promise<PaginationResponseDto<DrugRequisition>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { id, order, status, paymentStatus } = query;

    const baseFilter: FindOptionsWhere<DrugRequisition> = {};
    if (status) baseFilter.status = status;
    if (paymentStatus) baseFilter.payment_status = paymentStatus;

    const where:
      | FindOptionsWhere<DrugRequisition>
      | FindOptionsWhere<DrugRequisition>[] = id
      ? [
          { ...baseFilter, patient_id: id },
          { ...baseFilter, pharmacy_id: id },
          { ...baseFilter, prescription_id: id },
        ]
      : baseFilter;

    try {
      const [data, total] = await this.requisitionRepo.findAndCount({
        where,
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: (order || 'DESC') as FindOptionsOrderValue },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get drug requisitions',
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
        message: 'Unable to get drug requisition',
      } as ServiceError);
    }
  }

  async update(id: string | undefined, dto: UpdateDrugRequisitionDto) {
    try {
      const existing = await this.requisitionRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Drug requisition not found',
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
            message: 'Unable to update drug requisition',
          } as ServiceError);
    }
  }

  async remove(id: string, userId: string, role: AuthRole) {
    try {
      const existing = await this.requisitionRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Drug requisition not found',
        } as ServiceError);
      }
      if (role !== AuthRole.ADMIN && existing.patient_id !== userId) {
        throw new RpcException({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Only the requisition patient can cancel it',
        } as ServiceError);
      }
      const cancellable = [
        RequisitionStatus.PENDING,
        RequisitionStatus.ACCEPTED,
        RequisitionStatus.PROCESSING,
      ].includes(existing.status);
      if (!cancellable) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Drug requisition cannot be cancelled in its current state (${existing.status}).`,
        } as ServiceError);
      }

      // Refund before cancelling so a failed refund leaves the requisition intact
      const refunded = await this.refundIfEscrowed(existing.id);
      await this.requisitionRepo.update(
        { id },
        {
          status: RequisitionStatus.CANCELLED,
          ...(refunded && { payment_status: PaymentStatus.REFUNDED }),
        },
      );
      this.emitStatusChanged(existing, RequisitionStatus.CANCELLED, role, {
        refunded,
      });
      return { message: 'Drug requisition cancelled successfully', refunded };
    } catch (error) {
      logError(error, `${DrugRequisitionService.name}.remove`);
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to cancel drug requisition',
          } as ServiceError);
    }
  }
}
