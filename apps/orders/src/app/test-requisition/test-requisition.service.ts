import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  CreateTestRequisitionDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdateTestRequisitionDto,
} from '@medicpadi-backend/contracts';
import { TestRequisition } from '../../entities/test-requisition.entity';
import { TestRequisitionItem } from '../../entities/test-requisition-item.entity';

@Injectable()
export class TestRequisitionService {
  constructor(
    @InjectRepository(TestRequisition)
    private readonly requisitionRepo: Repository<TestRequisition>,
    @InjectRepository(TestRequisitionItem)
    private readonly itemRepo: Repository<TestRequisitionItem>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTestRequisitionDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { items, ...requisitionData } = dto;
      const requisition = queryRunner.manager.create(TestRequisition, requisitionData);
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
          ? [{ patient_id: query.id }, { lab_id: query.id }]
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
      await queryRunner.manager.delete(TestRequisitionItem, { requisition_id: id });
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