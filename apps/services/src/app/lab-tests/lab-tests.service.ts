import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CreateLabTestDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdateLabTestDto,
} from '@medicpadi-backend/contracts';
import { RpcException } from '@nestjs/microservices';
import { LabTest } from '../../entities/lab-test.entity';
import { ILike, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

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

  async findAll(query: PaginationDto): Promise<PaginationResponseDto<LabTest>> {
    let page = query.page || 1;
    let limit = query.limit || 10;

    let response: PaginationResponseDto<LabTest> = {
      data: [],
      total: 0,
      page: page,
      limit: limit,
    };

    try {
      const result = await this.labRepository.findAndCount({
        where: query.search
          ? [
              { user_id: query.id, name: ILike(`%${query.search}%`) },
              { user_id: query.id, shortName: ILike(`%${query.search}%`) },
            ]
          : { user_id: query.id },
        take: limit,
        skip: (page - 1) * limit,
        order: {
          createdAt: 'DESC',
        },
      });
      response.data = result[0];
      response.total = result[1];
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get Lab tests',
      } as ServiceError);
    }
    return response;
  }

  async findOne(id: string) {
    try {
      const test = await this.labRepository.findOne({
        where: { id },
      });
      return test;
    } catch (error) {
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
