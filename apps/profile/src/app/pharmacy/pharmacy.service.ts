import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BusinessHoursDto,
  CreatePharmacyDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  SettingsDto,
  UpdatePharmacyDto,
} from '@medicpadi-backend/contracts';
import { Pharmacy } from '../../entities/pharmacy.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
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

  async findAll(
    query: PaginationDto,
  ): Promise<PaginationResponseDto<Pharmacy>> {
    let page = query.page || 1;
    let limit = query.limit || 10;

    let response: PaginationResponseDto<Pharmacy> = {
      data: [],
      total: 0,
      page: page,
      limit: limit,
    };

    try {
      [response.data, response.total] =
        await this.pharmacyRepository.findAndCount({
          take: limit,
          skip: (page - 1) * limit,
          where: query.search
            ? [
                { name: ILike(`%${query.search}%`) },
                { registrationNumber: ILike(`%${query.search}%`) },
                { address: ILike(`%${query.search}%`) },
              ]
            : {},
          order: {
            createdAt: 'DESC',
          },
        });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Admin profiles',
      } as ServiceError);
    }
    return response;
  }

  async findOne(id: string) {
    let profile: Pharmacy | null;
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

  async update(id: string | undefined, updatePharmacyDto: UpdatePharmacyDto) {
    let existingPharmacyProfile: Pharmacy | null;
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
    let existingPharmacyProfile: Pharmacy | null;
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

  async updateSettings(id: string, settingsDto: SettingsDto) {
    try {
      await this.pharmacyRepository.findOne({ where: { user_id: id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to update Pharmacy's settings",
      } as ServiceError);
    }
    return this.pharmacyRepository.update({ user_id: id }, { settings: settingsDto });
  }

  remove(id: string) {
    return `This action removes a #${id} pharmacy`;
  }
}
