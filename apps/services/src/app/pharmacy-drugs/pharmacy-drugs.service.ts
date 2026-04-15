import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CreatePharmacyDrugDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdatePharmacyDrugDto,
} from '@medicpadi-backend/contracts';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PharmacyDrug } from '../../entities/pharmacy-drug.entity';

@Injectable()
export class PharmacyDrugsService {
  constructor(
    @InjectRepository(PharmacyDrug)
    private readonly pharmacyDrugRepository: Repository<PharmacyDrug>,
  ) {}
  create(createPharmacyDrugDto: CreatePharmacyDrugDto) {
    try {
      const pharmacyDrug = this.pharmacyDrugRepository.create({
        ...createPharmacyDrugDto,
      });
      this.pharmacyDrugRepository.save(pharmacyDrug);
      return pharmacyDrug;
    } catch (error) {
      console.error('Error creating Pharmacy drug:', error);
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create Pharmacy drugs',
      } as ServiceError);
    }
  }

  async findAll(
    query: PaginationDto,
  ): Promise<PaginationResponseDto<PharmacyDrug>> {
    let response: PaginationResponseDto<PharmacyDrug> = {
      data: [],
      total: 0,
      page: query.page,
      limit: query.limit,
    };

    try {
      const result = await this.pharmacyDrugRepository.findAndCount({
        where: { user_id: query.id },
        take: query.limit,
        skip: (query.page - 1) * query.limit,
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
      const test = await this.pharmacyDrugRepository.findOne({
        where: { id },
      });
      return test;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get Pharmacy drug',
      } as ServiceError);
    }
  }

  async update(id: string, updatePharmacyDrugDto: UpdatePharmacyDrugDto) {
    let existingPharmDrug: PharmacyDrug;
    try {
      existingPharmDrug = await this.pharmacyDrugRepository.findOne({
        where: { id },
      });
      if (!existingPharmDrug) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Pharmacy drug not found',
        } as ServiceError);
      }

      const updatedPharmacyDrug = await this.pharmacyDrugRepository.update(
        { id },
        updatePharmacyDrugDto,
      );
      return updatedPharmacyDrug.raw;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to update Pharmacy drug',
      } as ServiceError);
    }
  }

  async remove(id: string) {
    let existingPharmDrug: PharmacyDrug;
    try {
      existingPharmDrug = await this.findOne(id);
      if (!existingPharmDrug) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Pharmacy drug not found',
        } as ServiceError);
      }

      await this.pharmacyDrugRepository.remove(existingPharmDrug);
      return { message: 'Pharmacy drug removed successfully' };
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to update Pharmacy drug',
      } as ServiceError);
    }
  }
}
