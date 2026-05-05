import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  CreateEhrRecordDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdateEhrRecordDto,
} from '@medicpadi-backend/contracts';
import { EhrRecord } from '../../entities/ehr-record.entity';

@Injectable()
export class EhrRecordsService {
  constructor(
    @InjectRepository(EhrRecord)
    private readonly ehrRepo: Repository<EhrRecord>,
  ) {}

  async create(dto: CreateEhrRecordDto) {
    try {
      const record = this.ehrRepo.create(dto);
      await this.ehrRepo.save(record);
      return record;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create EHR record',
      } as ServiceError);
    }
  }

  async findAll(query: PaginationDto): Promise<PaginationResponseDto<EhrRecord>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const response: PaginationResponseDto<EhrRecord> = {
      data: [],
      total: 0,
      page,
      limit,
    };
    try {
      const result = await this.ehrRepo.findAndCount({
        where: query.id ? { patient_id: query.id } : {},
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: 'DESC' },
      });
      response.data = result[0];
      response.total = result[1];
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get EHR records',
      } as ServiceError);
    }
    return response;
  }

  async findOne(id: string) {
    try {
      return await this.ehrRepo.findOne({ where: { id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get EHR record',
      } as ServiceError);
    }
  }

  async update(id: string | undefined, dto: UpdateEhrRecordDto) {
    try {
      const existing = await this.ehrRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'EHR record not found',
        } as ServiceError);
      }
      const result = await this.ehrRepo.update({ id }, dto);
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
      const existing = await this.findOne(id);
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'EHR record not found',
        } as ServiceError);
      }
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