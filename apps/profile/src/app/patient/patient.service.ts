import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AuthPatterns,
  CreatePatientDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  SettingsDto,
  UpdatePatientDto,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse, withServiceAuth } from '@medicpadi-backend/utils';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../../entities/patient.entity';
import { RpcException, ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>('appConfig.internalServiceToken');
  }

  create(createPatientDto: CreatePatientDto) {
    try {
      const patientProfile = this.patientRepository.create({
        ...createPatientDto,
      });
      this.patientRepository.save(patientProfile);
      return patientProfile;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to create Patient's profile",
      } as ServiceError);
    }
  }

  async findAll(query: PaginationDto): Promise<PaginationResponseDto<Patient>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    try {
      const [data, total] = await this.patientRepository.findAndCount({
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: 'DESC' },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Patient profiles',
      } as ServiceError);
    }
  }

  async findOne(id: string) {
    let profile: Patient | null;
    try {
      profile = await this.patientRepository.findOne({
        where: { user_id: id },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to retrieve Patient profile',
      } as ServiceError);
    }
    return profile;
  }

  async update(id: string | undefined, updatePatientDto: UpdatePatientDto) {
    try {
      await this.patientRepository.findOne({ where: { user_id: id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to update Patient's profile",
      } as ServiceError);
    }
    const patientProfile = await this.patientRepository.update(
      { user_id: id },
      { ...updatePatientDto },
    );
    await this.syncProfileComplete(id!);
    return patientProfile;
  }

  private async syncProfileComplete(userId: string): Promise<void> {
    const [profile, auth] = await Promise.all([
      this.patientRepository.findOne({ where: { user_id: userId } }),
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
      !!profile?.dateOfBirth &&
      !!profile?.phoneNumber &&
      !!profile?.emergencyContact &&
      !!profile?.profilePicture?.url &&
      !!auth?.isEmailVerified;
    await this.patientRepository.update({ user_id: userId }, { isProfileComplete });
  }

  async updateSettings(id: string, settingsDto: SettingsDto) {
    try {
      await this.patientRepository.findOne({ where: { user_id: id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "Unable to update Patient's settings",
      } as ServiceError);
    }
    return this.patientRepository.update({ user_id: id }, { settings: settingsDto });
  }

  remove(id: string) {
    return `This action removes a #${id} patient`;
  }
}
