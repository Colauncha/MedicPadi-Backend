import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  ConsentStatus,
  CreateConsentGrantDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdateConsentGrantDto,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse } from '@medicpadi-backend/utils';
import { ConsentGrant } from '../../entities/consent-grant.entity';

@Injectable()
export class ConsentService {
  constructor(
    @InjectRepository(ConsentGrant)
    private readonly consentRepo: Repository<ConsentGrant>,
  ) {}

  async create(dto: CreateConsentGrantDto) {
    try {
      const consent = this.consentRepo.create(dto);
      await this.consentRepo.save(consent);
      return consent;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create consent grant',
      } as ServiceError);
    }
  }

  async findAll(query: PaginationDto): Promise<PaginationResponseDto<ConsentGrant>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    try {
      const [data, total] = await this.consentRepo.findAndCount({
        where: query.id ? { patient_id: query.id } : {},
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: 'DESC' },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get consent grants',
      } as ServiceError);
    }
  }

  async findOne(id: string) {
    try {
      return await this.consentRepo.findOne({ where: { id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get consent grant',
      } as ServiceError);
    }
  }

  async update(id: string | undefined, dto: UpdateConsentGrantDto) {
    try {
      const existing = await this.consentRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Consent grant not found',
        } as ServiceError);
      }
      const result = await this.consentRepo.update({ id }, dto);
      return result.raw;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to update consent grant',
          } as ServiceError);
    }
  }

  async revoke(id: string) {
    try {
      const existing = await this.consentRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Consent grant not found',
        } as ServiceError);
      }
      await this.consentRepo.update({ id }, { status: ConsentStatus.REVOKED });
      return { message: 'Consent grant revoked successfully' };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to revoke consent grant',
          } as ServiceError);
    }
  }
}