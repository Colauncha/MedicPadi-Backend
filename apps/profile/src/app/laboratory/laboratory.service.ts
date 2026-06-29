import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AuthPatterns,
  BusinessHoursDto,
  CreateLaboratoryDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  SettingsDto,
  UpdateLaboratoryDto,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse, withServiceAuth } from '@medicpadi-backend/utils';
import { Laboratory } from '../../entities/laboratory.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LaboratoryService {
  constructor(
    @InjectRepository(Laboratory)
    private readonly labRepository: Repository<Laboratory>,
    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>('appConfig.internalServiceToken');
  }

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
    const page = query.page || 1;
    const limit = query.limit || 10;
    try {
      const [data, total] = await this.labRepository.findAndCount({
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
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Laboratory profiles',
      } as ServiceError);
    }
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
    try {
      const existing = await this.labRepository.findOne({ where: { user_id: id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Laboratory profile not found',
        } as ServiceError);
      }
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: "Unable to update Laboratory's profile",
          } as ServiceError);
    }
    const labProfile = await this.labRepository.update(
      { user_id: id },
      updateLaboratoryDto,
    );
    await this.syncProfileComplete(id!);
    return labProfile;
  }

  private async syncProfileComplete(userId: string): Promise<void> {
    const [profile, auth] = await Promise.all([
      this.labRepository.findOne({ where: { user_id: userId } }),
      firstValueFrom(
        this.authClient.send(
          AuthPatterns.FIND_BY_ID,
          withServiceAuth(userId, this.serviceToken),
        ),
      ),
    ]);
    const isProfileComplete =
      !!profile?.name &&
      !!profile?.phoneNumber &&
      !!profile?.registrationNumber &&
      !!profile?.address &&
      !!profile?.profilePicture?.url &&
      !!profile?.about &&
      !!auth?.isEmailVerified;
    await this.labRepository.update({ user_id: userId }, { isProfileComplete });
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
