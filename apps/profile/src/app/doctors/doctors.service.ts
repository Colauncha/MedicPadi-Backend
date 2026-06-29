import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AuthPatterns,
  BusinessHoursDto,
  CreateDoctorDto,
  EducationItemDto,
  DoctorQueryDto,
  PaginationResponseDto,
  ServiceError,
  SettingsDto,
  UpdateDoctorDto,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse, withServiceAuth } from '@medicpadi-backend/utils';
import { InjectRepository } from '@nestjs/typeorm';
import { Doctor } from '../../entities/doctor.entity';
import {
  FindOptionsOrderValue,
  FindOptionsWhere,
  ILike,
  Repository,
} from 'typeorm';
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
    return this.configService.getOrThrow<string>(
      'appConfig.internalServiceToken',
    );
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

  async findAll(query: DoctorQueryDto): Promise<PaginationResponseDto<Doctor>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { id, order, search, gender, speciality, price, yearsOfService } =
      query;
    try {
      const baseFilter: FindOptionsWhere<Doctor> = {};
      if (gender) baseFilter.gender = gender;
      if (speciality) baseFilter.speciality = speciality;
      if (price) baseFilter.costPerSession = price;
      if (yearsOfService) baseFilter.yearsOfService = yearsOfService;

      let where: FindOptionsWhere<Doctor> | FindOptionsWhere<Doctor>[];

      if (search) {
        where = [
          { ...baseFilter, firstName: ILike(`%${search}%`) },
          { ...baseFilter, lastName: ILike(`%${search}%`) },
          { ...baseFilter, licenceNumber: ILike(`%${search}%`) },
          { ...baseFilter, placeOfWork: ILike(`%${search}%`) },
        ];
      } else if (id) {
        where = [
          { ...baseFilter, id: ILike(`%${id}%`) },
          { ...baseFilter, user_id: ILike(`%${id}%`) },
        ];
      } else {
        where = baseFilter;
      }

      const [data, total] = await this.doctorsRepository.findAndCount({
        where,
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: order as FindOptionsOrderValue },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      console.error(error);
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Doctors profiles',
        error: error,
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
        error: error,
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
    const { id: _, ...updateData } = updateDoctorDto;
    const doctorsProfile = await this.doctorsRepository.update(
      { user_id: id },
      updateData,
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
      profile?.yearsOfService != null &&
      !!auth?.isEmailVerified;
    await this.doctorsRepository.update(
      { user_id: userId },
      { isProfileComplete },
    );
  }

  async updateBusinessHours(id: string, businessHoursDto: BusinessHoursDto) {
    let existingDoctorProfile: Doctor | null;
    try {
      existingDoctorProfile = await this.doctorsRepository.findOne({
        where: { user_id: id },
      });

      if (!existingDoctorProfile) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Doctor profile not found',
        } as ServiceError);
      }
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to update Doctor's profile",
      } as ServiceError);
    }
    const doctorsProfile = await this.doctorsRepository.update(
      { user_id: id },
      { businessHours: businessHoursDto },
    );
    return doctorsProfile;
  }

  async updateEducation(id: string, education: EducationItemDto[]) {
    try {
      await this.doctorsRepository.findOne({ where: { user_id: id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to update Doctor's education",
      } as ServiceError);
    }
    return this.doctorsRepository.update({ user_id: id }, { education });
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
    return this.doctorsRepository.update(
      { user_id: id },
      { settings: settingsDto },
    );
  }

  remove(id: string) {
    return `This action removes a #${id} doctor`;
  }
}
