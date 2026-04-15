import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BusinessHoursDto,
  CreatePharmacyDto,
  PaginationDto,
  ServiceError,
  UpdatePharmacyDto,
} from '@medicpadi-backend/contracts';
import { Pharmacy } from '../../entities/pharmacy.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class PharmacyService {
  constructor(
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepository: Repository<Pharmacy>,
  ) {}

  create(createPharmacyDto: CreatePharmacyDto) {
    try {
      const pharmacyProfile = this.pharmacyRepository.create({
        ...createPharmacyDto,
      });
      this.pharmacyRepository.save(pharmacyProfile);
      return pharmacyProfile;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to create Pharmacy's profile",
      } as ServiceError);
    }
  }

  async findAll(query: PaginationDto) {
    let profile: Pharmacy[];
    try {
      profile = await this.pharmacyRepository.find({
        take: query.limit,
        skip: (query.page - 1) * query.limit,
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Admin profiles',
      } as ServiceError);
    }
    return profile;
  }

  async findOne(id: string) {
    let profile: Pharmacy;
    try {
      profile = await this.pharmacyRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Pharmacy profile',
      } as ServiceError);
    }
    return profile;
  }

  async update(id: string, updatePharmacyDto: UpdatePharmacyDto) {
    let existingPharmacyProfile: Pharmacy;
    try {
      existingPharmacyProfile = await this.pharmacyRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to update Pharmacy's profile",
      } as ServiceError);
    }
    const pharmacyProfile = await this.pharmacyRepository.update(
      { user_id: id },
      { ...updatePharmacyDto },
    );
    return pharmacyProfile;
  }

  async updateBusinessHours(id: string, businessHoursDto: BusinessHoursDto) {
    let existingPharmacyProfile: Pharmacy;
    try {
      existingPharmacyProfile = await this.pharmacyRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to update Pharmacy's profile",
      } as ServiceError);
    }
    const pharmacyProfile = await this.pharmacyRepository.update(
      { user_id: id },
      { businessHours: businessHoursDto },
    );
    return pharmacyProfile;
  }

  remove(id: string) {
    return `This action removes a #${id} pharmacy`;
  }
}
