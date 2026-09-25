import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  AuthRole,
  ConsentAccessLevel,
  CreateEhrRecordDto,
  EhrRequester,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdateEhrRecordDto,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse } from '@medicpadi-backend/utils';
import { EhrRecord } from '../../entities/ehr-record.entity';
import { EhrAccessService } from '../consent/ehr-access.service';

@Injectable()
export class EhrRecordsService {
  constructor(
    @InjectRepository(EhrRecord)
    private readonly ehrRepo: Repository<EhrRecord>,
    private readonly ehrAccess: EhrAccessService,
  ) {}

  async create(dto: CreateEhrRecordDto, requester: EhrRequester) {
    try {
      await this.ehrAccess.assertAccess(
        requester,
        dto.patient_id,
        ConsentAccessLevel.FULL_ACCESS,
      );
      const record = this.ehrRepo.create({
        ...dto,
        provider_id:
          requester.role === AuthRole.ADMIN
            ? dto.provider_id
            : requester.userId,
      });
      await this.ehrRepo.save(record);
      return record;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to create EHR record',
          } as ServiceError);
    }
  }

  async findAll(
    query: PaginationDto,
    requester: EhrRequester,
  ): Promise<PaginationResponseDto<EhrRecord>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    try {
      let where: FindOptionsWhere<EhrRecord>;
      if (requester.role === AuthRole.ADMIN) {
        where = query.id ? { patient_id: query.id } : {};
      } else if (requester.role === AuthRole.PATIENT) {
        where = { patient_id: requester.userId };
      } else if (query.id) {
        await this.ehrAccess.assertAccess(
          requester,
          query.id,
          ConsentAccessLevel.VIEW_ONLY,
        );
        where = { patient_id: query.id };
      } else {
        const patientIds = await this.ehrAccess.grantedPatientIds(requester);
        if (!patientIds.length) {
          return buildPaginationResponse([], 0, page, limit);
        }
        where = { patient_id: In(patientIds) };
      }

      const [data, total] = await this.ehrRepo.findAndCount({
        where,
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: 'DESC' },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to get EHR records',
          } as ServiceError);
    }
  }

  private async getOrFail(id: string) {
    const existing = await this.ehrRepo.findOne({ where: { id } });
    if (!existing) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'EHR record not found',
      } as ServiceError);
    }
    return existing;
  }

  async findOne(id: string, requester: EhrRequester) {
    try {
      const record = await this.getOrFail(id);
      await this.ehrAccess.assertAccess(
        requester,
        record.patient_id,
        ConsentAccessLevel.VIEW_ONLY,
      );
      return record;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to get EHR record',
          } as ServiceError);
    }
  }

  async update(id: string, dto: UpdateEhrRecordDto, requester: EhrRequester) {
    try {
      const existing = await this.getOrFail(id);
      await this.ehrAccess.assertAccess(
        requester,
        existing.patient_id,
        ConsentAccessLevel.FULL_ACCESS,
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...changes } = dto;
      if (requester.role !== AuthRole.ADMIN) {
        // Only admins may reassign a record to another patient or provider
        delete changes.patient_id;
        delete changes.provider_id;
      }

      const result = await this.ehrRepo.update({ id }, changes);
      return result.raw;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to update EHR record',
          } as ServiceError);
    }
  }

  async remove(id: string) {
    try {
      const existing = await this.getOrFail(id);
      await this.ehrRepo.remove(existing);
      return { message: 'EHR record removed successfully' };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to remove EHR record',
          } as ServiceError);
    }
  }
}