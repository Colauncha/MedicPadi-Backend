import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  CreateDrugCategoryDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdateDrugCategoryDto,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse } from '@medicpadi-backend/utils';
import { DrugCategory } from '../../entities/drug_category.entity';

@Injectable()
export class DrugCategoryService {
  constructor(
    @InjectRepository(DrugCategory)
    private readonly drugCategoryRepo: Repository<DrugCategory>,
  ) {}

  async create(dto: CreateDrugCategoryDto) {
    try {
      const drugCategory = this.drugCategoryRepo.create(dto);
      await this.drugCategoryRepo.save(drugCategory);
      return drugCategory;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create drug category',
      } as ServiceError);
    }
  }

  async findAll(
    query: PaginationDto,
  ): Promise<PaginationResponseDto<DrugCategory>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    try {
      const [data, total] = await this.drugCategoryRepo.findAndCount({
        where: query.id ? { user_id: query.id } : {},
        take: limit,
        skip: (page - 1) * limit,
        order: { name: 'ASC' },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get Categories',
      } as ServiceError);
    }
  }

  async findOne(id: string) {
    try {
      return await this.drugCategoryRepo.findOne({ where: { id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get drug category',
      } as ServiceError);
    }
  }

  async update(id: string | undefined, dto: UpdateDrugCategoryDto) {
    try {
      const existing = await this.drugCategoryRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Drug category not found',
        } as ServiceError);
      }
      const result = await this.drugCategoryRepo.update({ id }, dto);
      return result.raw;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to update drug category',
          } as ServiceError);
    }
  }

  async remove(id: string) {
    try {
      const existing = await this.drugCategoryRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Drug category not found',
        } as ServiceError);
      }
      await this.drugCategoryRepo.remove(existing);
      return { message: 'Drug category removed successfully' };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to remove drug category',
          } as ServiceError);
    }
  }
}
