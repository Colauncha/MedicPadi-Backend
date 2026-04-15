import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BusinessHoursDto,
  CreateLaboratoryDto,
  PaginationDto,
  ServiceError,
  UpdateLaboratoryDto,
} from '@medicpadi-backend/contracts';
import { Laboratory } from '../../entities/laboratory.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class LaboratoryService {
  constructor(
    @InjectRepository(Laboratory)
    private readonly labRepository: Repository<Laboratory>,
  ) {}

  create(createLaboratoryDto: CreateLaboratoryDto) {
    try {
      const adminProfile = this.labRepository.create({
        ...createLaboratoryDto,
      });
      this.labRepository.save(adminProfile);
      return adminProfile;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create Labs profile',
      } as ServiceError);
    }
  }

  async findAll(query: PaginationDto) {
    let profile: Laboratory[];
    try {
      profile = await this.labRepository.find({
        take: query.limit,
        skip: (query.page - 1) * query.limit,
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Laboratory profiles',
      } as ServiceError);
    }
    return profile;
  }

  async findOne(id: string) {
    let profile: Laboratory;
    try {
      profile = await this.labRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Laboratory profile',
      } as ServiceError);
    }
    return profile;
  }

  async update(id: string, updateLaboratoryDto: UpdateLaboratoryDto) {
    let existingLaboratoryProfile: Laboratory;
    try {
      existingLaboratoryProfile = await this.labRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to update Laboratory's profile",
      } as ServiceError);
    }
    const labProfile = await this.labRepository.update(
      { user_id: id },
      updateLaboratoryDto,
    );
    return labProfile;
  }

  async updateBusinessHours(id: string, businessHoursDto: BusinessHoursDto) {
    let existingLaboratoryProfile: Laboratory;
    try {
      existingLaboratoryProfile = await this.labRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to update Laboratory's profile",
      } as ServiceError);
    }
    const labProfile = await this.labRepository.update(
      { user_id: id },
      { businessHours: businessHoursDto },
    );
    return labProfile;
  }

  remove(id: string) {
    return `This action removes a #${id} laboratory`;
  }
}
