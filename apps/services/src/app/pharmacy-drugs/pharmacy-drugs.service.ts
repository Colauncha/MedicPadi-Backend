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
import { ILike, Repository } from 'typeorm';
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
    let page = query.page || 1;
    let limit = query.limit || 10;

    let response: PaginationResponseDto<PharmacyDrug> = {
      data: [],
      total: 0,
      page: page,
      limit: limit,
    };

    try {
      const result = await this.pharmacyDrugRepository.findAndCount({
        where: query.search
          ? [
              { user_id: query.id, name: ILike(`%${query.search}%`) },
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
        message: 'Unable to get Pharmacy drugs',
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

  async update(id: string | undefined, updatePharmacyDrugDto: UpdatePharmacyDrugDto) {
    let existingPharmDrug: PharmacyDrug | null;
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
    let existingPharmDrug: PharmacyDrug | null;
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
