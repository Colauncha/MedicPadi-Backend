import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AuthPatterns,
  BusinessHoursDto,
  CreatePharmacyDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  SettingsDto,
  UpdatePharmacyDto,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse, withServiceAuth } from '@medicpadi-backend/utils';
import { Pharmacy } from '../../entities/pharmacy.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PharmacyService {
  constructor(
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepository: Repository<Pharmacy>,
    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>('appConfig.internalServiceToken');
  }

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
    const page = query.page || 1;
    const limit = query.limit || 10;
    try {
      const [data, total] = await this.pharmacyRepository.findAndCount({
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
        message: 'Unable to retrieve Pharmacy profiles',
      } as ServiceError);
    }
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
    try {
      await this.pharmacyRepository.findOne({ where: { user_id: id } });
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
    await this.syncProfileComplete(id!);
    return pharmacyProfile;
  }

  private async syncProfileComplete(userId: string): Promise<void> {
    const [profile, auth] = await Promise.all([
      this.pharmacyRepository.findOne({ where: { user_id: userId } }),
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
    await this.pharmacyRepository.update({ user_id: userId }, { isProfileComplete });
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
