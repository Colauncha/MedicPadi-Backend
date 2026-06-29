import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsOrderValue, FindOptionsWhere, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  CreatePrescriptionDto,
  PrescriptionQueryDto,
  PaginationResponseDto,
  ServiceError,
  UpdatePrescriptionDto,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse } from '@medicpadi-backend/utils';
import { Prescription } from '../../entities/prescription.entity';
import { PrescriptionItem } from '../../entities/prescription-item.entity';

@Injectable()
export class PrescriptionService {
  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(PrescriptionItem)
    private readonly itemRepo: Repository<PrescriptionItem>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreatePrescriptionDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { items, ...prescriptionData } = dto;
      const prescription = queryRunner.manager.create(Prescription, prescriptionData);
      await queryRunner.manager.save(prescription);
      const prescriptionItems = items.map((item) =>
        queryRunner.manager.create(PrescriptionItem, {
          ...item,
          prescription_id: prescription.id,
        }),
      );
      await queryRunner.manager.save(prescriptionItems);
      await queryRunner.commitTransaction();
      return { ...prescription, items: prescriptionItems };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create prescription',
      } as ServiceError);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    query: PrescriptionQueryDto,
  ): Promise<PaginationResponseDto<Prescription>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { id, order, status } = query;

    const baseFilter: FindOptionsWhere<Prescription> = {};
    if (status) baseFilter.status = status;

    const where: FindOptionsWhere<Prescription> | FindOptionsWhere<Prescription>[] = id
      ? [{ ...baseFilter, patient_id: id }, { ...baseFilter, provider_id: id }]
      : baseFilter;

    try {
      const [data, total] = await this.prescriptionRepo.findAndCount({
        where,
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: (order || 'DESC') as FindOptionsOrderValue },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get prescriptions',
      } as ServiceError);
    }
  }

  async findOne(id: string) {
    try {
      const prescription = await this.prescriptionRepo.findOne({ where: { id } });
      if (!prescription) return null;
      const items = await this.itemRepo.find({
        where: { prescription_id: id },
      });
      return { ...prescription, items };
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get prescription',
      } as ServiceError);
    }
  }

  async update(id: string | undefined, dto: UpdatePrescriptionDto) {
    try {
      const existing = await this.prescriptionRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Prescription not found',
        } as ServiceError);
      }
      const { items, ...updateData } = dto;
      const result = await this.prescriptionRepo.update({ id }, updateData);
      return result.raw;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to update prescription',
          } as ServiceError);
    }
  }

  async remove(id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const existing = await this.prescriptionRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Prescription not found',
        } as ServiceError);
      }
      await queryRunner.manager.delete(PrescriptionItem, { prescription_id: id });
      await queryRunner.manager.remove(existing);
      await queryRunner.commitTransaction();
      return { message: 'Prescription removed successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to remove prescription',
          } as ServiceError);
    } finally {
      await queryRunner.release();
    }
  }
}