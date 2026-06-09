import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BusinessHoursDto,
  CreateLaboratoryDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  SettingsDto,
  UpdateLaboratoryDto,
} from '@medicpadi-backend/contracts';
import { Laboratory } from '../../entities/laboratory.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
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

  async findAll(
    query: PaginationDto,
  ): Promise<PaginationResponseDto<Laboratory>> {
    let page = query.page || 1;
    let limit = query.limit || 10;

    let profileResponse: PaginationResponseDto<Laboratory> = {
      data: [],
      total: 0,
      page: page,
      limit: limit,
    };

    try {
      [profileResponse.data, profileResponse.total] =
        await this.labRepository.findAndCount({
          take: limit,
          skip: (page - 1) * limit,
          where: query.search
            ? [
                { name: ILike(`%${query.search}%`) },
                { registrationNumber: ILike(`%${query.search}%`) },
                { address: ILike(`%${query.search}%`) },
              ]
            : {},
          order: { createdAt: 'DESC' },
        });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Laboratory profiles',
      } as ServiceError);
    }
    return profileResponse;
  }

  async findOne(id: string) {
    let profile: Laboratory | null;
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

  async update(
    id: string | undefined,
    updateLaboratoryDto: UpdateLaboratoryDto,
  ) {
    let existingLaboratoryProfile: Laboratory | null;
    try {
      existingLaboratoryProfile = await this.labRepository.findOne({
        where: { user_id: id },
      });

      if (!existingLaboratoryProfile) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Laboratory profile not found',
        } as ServiceError);
      }
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
    let existingLaboratoryProfile: Laboratory | null;
    try {
      existingLaboratoryProfile = await this.labRepository.findOne({
        where: { user_id: id },
      });

      if (!existingLaboratoryProfile) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Laboratory profile not found',
        } as ServiceError);
      }
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

  async updateSettings(id: string, settingsDto: SettingsDto) {
    try {
      await this.labRepository.findOne({ where: { user_id: id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to update Laboratory's settings",
      } as ServiceError);
    }
    return this.labRepository.update({ user_id: id }, { settings: settingsDto });
  }

  remove(id: string) {
    return `This action removes a #${id} laboratory`;
  }
}
