import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CreateLabTestDto,
  LabTestQueryDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdateLabTestDto,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse } from '@medicpadi-backend/utils';
import { RpcException } from '@nestjs/microservices';
import { LabTest } from '../../entities/lab-test.entity';
import {
  FindOptionsOrder,
  FindOptionsOrderValue,
  FindOptionsWhere,
  ILike,
  Repository,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PharmacyDrug } from '../../entities/pharmacy-drug.entity';

@Injectable()
export class LabTestsService {
  constructor(
    @InjectRepository(LabTest)
    private readonly labRepository: Repository<LabTest>,
  ) {}

  create(createLabTestDto: CreateLabTestDto) {
    try {
      const labTest = this.labRepository.create({
        ...createLabTestDto,
      });
      this.labRepository.save(labTest);
      return labTest;
    } catch (error) {
      console.error('Error creating Lab test:', error);
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create Lab tests',
      } as ServiceError);
    }
  }

  async findAll(
    query: LabTestQueryDto,
  ): Promise<PaginationResponseDto<LabTest>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { id, search, order, department, available, price, hasImage } = query;
    const baseWhere: FindOptionsWhere<LabTest> = { user_id: id };

    if (available !== undefined) baseWhere.available = available;
    if (hasImage !== undefined) baseWhere.hasImage = hasImage;
    if (price !== undefined) baseWhere.price = price;

    if (department) {
      baseWhere.department = {
        name: ILike(`%${department}%`),
      };
    }

    let whereCondition: FindOptionsWhere<LabTest> | FindOptionsWhere<LabTest>[];

    if (search) {
      whereCondition = [
        { ...baseWhere, name: ILike(`%${search}%`) },
        { ...baseWhere, shortName: ILike(`%${search}%`) },
        { ...baseWhere, description: ILike(`%${search}%`) },
      ];
    } else {
      whereCondition = baseWhere;
    }
    try {
      const [data, total] = await this.labRepository.findAndCount({
        where: whereCondition,
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: order as FindOptionsOrderValue },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get Lab tests',
      } as ServiceError);
    }
  }

  async findOne(id: string) {
    try {
      const test = await this.labRepository.findOne({
        where: { id },
        relations: ['department'],
      });
      return test;
    } catch (error) {
      console.error(error);
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get Lab test',
      } as ServiceError);
    }
  }

  async update(id: string | undefined, updateLabTestDto: UpdateLabTestDto) {
    let existingLabTest: LabTest | null;
    try {
      existingLabTest = await this.labRepository.findOne({
        where: { id },
      });
      if (!existingLabTest) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Lab test not found',
        } as ServiceError);
      }

      const updatedLabTest = await this.labRepository.update(
        { id },
        updateLabTestDto,
      );
      return updatedLabTest.raw;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to update Lab test',
      } as ServiceError);
    }
  }

  async remove(id: string) {
    let existingLabTest: LabTest | null;
    try {
      existingLabTest = await this.findOne(id);
      if (!existingLabTest) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Lab test not found',
        } as ServiceError);
      }

      await this.labRepository.remove(existingLabTest);
      return { message: 'Lab test removed successfully' };
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to update Lab test',
      } as ServiceError);
    }
  }
}
