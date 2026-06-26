import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CreatePharmacyDrugDto,
  DrugQueryDto,
  // PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdatePharmacyDrugDto,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse } from '@medicpadi-backend/utils';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ILike,
  Repository,
  FindOptionsWhere,
  FindOptionsOrderValue,
} from 'typeorm';
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
    query: DrugQueryDto,
  ): Promise<PaginationResponseDto<PharmacyDrug>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    try {
      const {
        id,
        search,
        requiresPrescription,
        available,
        price,
        category,
        order,
      } = query;
      const baseWhere: FindOptionsWhere<PharmacyDrug> = { user_id: id };

      if (available !== undefined) baseWhere.available = available;
      if (requiresPrescription !== undefined)
        baseWhere.requiresPrescription = requiresPrescription;
      if (price !== undefined) baseWhere.price = price;

      if (category) {
        baseWhere.category = {
          name: ILike(`%${category}%`),
        };
      }

      let whereCondition:
        | FindOptionsWhere<PharmacyDrug>
        | FindOptionsWhere<PharmacyDrug>[];

      if (search) {
        whereCondition = [
          { ...baseWhere, name: ILike(`%${search}%`) },
          { ...baseWhere, description: ILike(`%${search}%`) },
        ];
      } else {
        whereCondition = baseWhere;
      }

      const [data, total] = await this.pharmacyDrugRepository.findAndCount({
        where: whereCondition,
        relations: ['category'],
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: order as FindOptionsOrderValue },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get Pharmacy drugs',
      } as ServiceError);
    }
  }

  async findOne(id: string) {
    try {
      const test = await this.pharmacyDrugRepository.findOne({
        where: { id },
        relations: ['category'],
      });
      return test;
    } catch (error) {
      console.error(error);
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get Pharmacy drug',
      } as ServiceError);
    }
  }

  async update(
    id: string | undefined,
    updatePharmacyDrugDto: UpdatePharmacyDrugDto,
  ) {
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

  async countByPeriod(
    userId: string,
    from: Date,
    to?: Date,
  ): Promise<{ count: number }> {
    try {
      const qb = this.pharmacyDrugRepository
        .createQueryBuilder('drug')
        .where('drug.user_id = :userId', { userId })
        .andWhere('drug.createdAt >= :from', { from });

      if (to) {
        qb.andWhere('drug.createdAt < :to', { to });
      }

      const count = await qb.getCount();
      return { count };
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to count pharmacy drugs',
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
