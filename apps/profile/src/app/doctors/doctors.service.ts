import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AuthPatterns,
  CreateDoctorDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  SettingsDto,
  UpdateDoctorDto,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse, withServiceAuth } from '@medicpadi-backend/utils';
import { InjectRepository } from '@nestjs/typeorm';
import { Doctor } from '../../entities/doctor.entity';
import { ILike, Repository } from 'typeorm';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorsRepository: Repository<Doctor>,
    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>('appConfig.internalServiceToken');
  }

  create(createDoctorDto: CreateDoctorDto) {
    try {
      const adminProfile = this.doctorsRepository.create({
        ...createDoctorDto,
      });
      this.doctorsRepository.save(adminProfile);
      return adminProfile;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to Create Doctor's profile",
      } as ServiceError);
    }
  }

  async findAll(query: PaginationDto): Promise<PaginationResponseDto<Doctor>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    try {
      const [data, total] = await this.doctorsRepository.findAndCount({
        take: limit,
        skip: (page - 1) * limit,
        where: query.search
          ? [
              { firstName: ILike(`%${query.search}%`) },
              { lastName: ILike(`%${query.search}%`) },
              { licenceNumber: ILike(`%${query.search}%`) },
            ]
          : {},
        order: { createdAt: 'DESC' },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Doctors profiles',
      } as ServiceError);
    }
  }

  async findOne(id: string) {
    let profile: Doctor | null;
    try {
      profile = await this.doctorsRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to retrieve Doctor's profile",
      } as ServiceError);
    }
    return profile;
  }

  async update(id: string | undefined, updateDoctorDto: UpdateDoctorDto) {
    try {
      await this.doctorsRepository.findOne({ where: { user_id: id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to update Doctor's profile",
      } as ServiceError);
    }
    const doctorsProfile = await this.doctorsRepository.update(
      { user_id: id },
      { ...updateDoctorDto },
    );
    await this.syncProfileComplete(id!);
    return doctorsProfile;
  }

  private async syncProfileComplete(userId: string): Promise<void> {
    const [profile, auth] = await Promise.all([
      this.doctorsRepository.findOne({ where: { user_id: userId } }),
      firstValueFrom(
        this.authClient.send(
          AuthPatterns.FIND_BY_ID,
          withServiceAuth(userId, this.serviceToken),
        ),
      ),
    ]);
    const isProfileComplete =
      !!profile?.firstName &&
      !!profile?.lastName &&
      !!profile?.phoneNumber &&
      !!profile?.licenceNumber &&
      !!profile?.bio &&
      profile?.costPerSession != null &&
      !!profile?.profilePicture?.url &&
      !!profile?.placeOfWork &&
      !!profile?.about &&
      profile?.yearsOfService != null &&
      !!auth?.isVerified;
    await this.doctorsRepository.update({ user_id: userId }, { isProfileComplete });
  }

  async updateSettings(id: string, settingsDto: SettingsDto) {
    try {
      await this.doctorsRepository.findOne({ where: { user_id: id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to update Doctor's settings",
      } as ServiceError);
    }
    return this.doctorsRepository.update({ user_id: id }, { settings: settingsDto });
  }

  remove(id: string) {
    return `This action removes a #${id} doctor`;
  }
}
