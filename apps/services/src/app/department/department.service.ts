import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  CreateDepartmentDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdateDepartmentDto,
} from '@medicpadi-backend/contracts';
import { Department } from '../../entities/department.entity';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  async create(dto: CreateDepartmentDto) {
    try {
      const department = this.departmentRepo.create(dto);
      await this.departmentRepo.save(department);
      return department;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create department',
      } as ServiceError);
    }
  }

  async findAll(
    query: PaginationDto,
  ): Promise<PaginationResponseDto<Department>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const response: PaginationResponseDto<Department> = {
      data: [],
      total: 0,
      page,
      limit,
    };
    try {
      const result = await this.departmentRepo.findAndCount({
        where: query.id ? { user_id: query.id } : {},
        take: limit,
        skip: (page - 1) * limit,
        order: { name: 'ASC' },
      });
      response.data = result[0];
      response.total = result[1];
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get departments',
      } as ServiceError);
    }
    return response;
  }

  async findOne(id: string) {
    try {
      return await this.departmentRepo.findOne({ where: { id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get department',
      } as ServiceError);
    }
  }

  async update(id: string | undefined, dto: UpdateDepartmentDto) {
    try {
      const existing = await this.departmentRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Department not found',
        } as ServiceError);
      }
      const result = await this.departmentRepo.update({ id }, dto);
      return result.raw;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to update department',
          } as ServiceError);
    }
  }

  async remove(id: string) {
    try {
      const existing = await this.departmentRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Department not found',
        } as ServiceError);
      }
      await this.departmentRepo.remove(existing);
      return { message: 'Department removed successfully' };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to remove department',
          } as ServiceError);
    }
  }
}
