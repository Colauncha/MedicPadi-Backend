import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
  CreateDrugRequisitionDto,
  CreateTransactionDto,
  DrugRequisitionCreatedEventDto,
  NotificationEvents,
  PaginationDto,
  PaginationResponseDto,
  PaymentGateway,
  PaymentStatus,
  PaystackInitializeResponse,
  RequisitionStatus,
  ServiceError,
  TransactionPatterns,
  TransactionSourceType,
  UpdateDrugRequisitionDto,
} from '@medicpadi-backend/contracts';
import { withServiceAuth } from '@medicpadi-backend/utils';
import { DrugRequisition } from '../../entities/drug-requisition.entity';
import { DrugRequisitionItem } from '../../entities/drug-requisition-item.entity';
import { Prescription } from '../../entities/prescription.entity';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

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
  ): Promise<void> {
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
      requisition = queryRunner.manager.create(
        DrugRequisition,
        requisitionData,
      );
      await queryRunner.manager.save(requisition);
      total = items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0,
      );
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
      } as ServiceError);
    } finally {
      await queryRunner.release();
    }

    await this.initializePaymentAndNotify(requisition, total);
    return { ...requisition, total_amount: total, items: reqItems };
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

    await this.initializePaymentAndNotify(requisition, total);
    return { ...requisition, total_amount: total, items: reqItems };
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
        existing.payment_status === (PaymentStatus.PAID || PaymentStatus.ESCROW)
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

  async updateStatusToReceived(id: string) {
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
      if (
        existing.payment_status !== (PaymentStatus.PAID || PaymentStatus.ESCROW)
      ) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Payment not completed for this drug requisition',
        } as ServiceError);
      }
      if (existing.status === RequisitionStatus.COMPLETED) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Drug requisition is already marked as received',
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

  async findAll(
    query: PaginationDto,
  ): Promise<PaginationResponseDto<DrugRequisition>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const response: PaginationResponseDto<DrugRequisition> = {
      data: [],
      total: 0,
      page,
      limit,
    };
    try {
      const result = await this.requisitionRepo.findAndCount({
        where: query.id
          ? [{ patient_id: query.id }, { pharmacy_id: query.id }]
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
        message: 'Unable to get drug requisitions',
      } as ServiceError);
    }
    return response;
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

  async remove(id: string) {
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
      await queryRunner.manager.delete(DrugRequisitionItem, {
        requisition_id: id,
      });
      await queryRunner.manager.remove(existing);
      await queryRunner.commitTransaction();
      return { message: 'Drug requisition removed successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to remove drug requisition',
          } as ServiceError);
    } finally {
      await queryRunner.release();
    }
  }
}
