import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  ProfileDtoType,
  UpdateProfileDtoType,
  AuthPatterns,
  BusinessHoursDto,
  AuthRole,
  GetAuthDto,
  SettingsDto,
} from '@medicpadi-backend/contracts';
import type {
  EducationItemDto,
  ProfileQueryDtoType,
} from '@medicpadi-backend/contracts';
import { getPatternFromRole, withServiceAuth, logError } from '@medicpadi-backend/utils';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProfileService {
  private logger = new Logger(ProfileService.name);

  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('PROFILE_SERVICE') private readonly profileClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>(
      'appConfig.internalServiceToken',
    );
  }

  create(createProfileDto: ProfileDtoType) {
    return createProfileDto;
  }

  async findAll(query: ProfileQueryDtoType) {
    try {
      const { pattern: Pattern, dto: _ } = await getPatternFromRole(
        query.role || AuthRole.PATIENT,
      );
      return await firstValueFrom(
        this.profileClient.send(
          Pattern.FIND_ALL,
          withServiceAuth(query, this.serviceToken),
        ),
      );
    } catch (error) {
      logError(error, `${ProfileService.name}.findAll`);
      throw error;
    }
  }

  async retrieve(id: string) {
    try {
      const token = this.serviceToken;
      let user = await firstValueFrom(
        this.authClient.send(
          AuthPatterns.FIND_BY_ID,
          withServiceAuth(id, token),
        ),
      );
      let { passwordhash, ...rest } = user;
      user = rest as GetAuthDto;

      const { pattern: Pattern, dto: _ } = await getPatternFromRole(user.role);

      const profile = await firstValueFrom(
        this.profileClient.send(Pattern.RETRIEVE, withServiceAuth(id, token)),
      );
      return { rest, profile };
    } catch (error) {
      throw new BadRequestException(
        'Something went wrong while retieving profile',
      );
    }
  }

  async findOne(id: string, role: string) {
    try {
      const { pattern: Pattern, dto: _ } = await getPatternFromRole(role);

      const profile = await firstValueFrom(
        this.profileClient.send(
          Pattern.RETRIEVE,
          withServiceAuth(id, this.serviceToken),
        ),
      );
      return { profile };
    } catch (error) {
      throw new BadRequestException(
        'Something went wrong while retieving profile',
      );
    }
  }

  async update(user: any, updateProfileDto: UpdateProfileDtoType) {
    try {
      const { pattern: Pattern, dto: _ } = await getPatternFromRole(user.role);

      const profile = await firstValueFrom(
        this.profileClient.send(
          Pattern.UPDATE,
          withServiceAuth(
            { id: user.id, ...updateProfileDto },
            this.serviceToken,
          ),
        ),
      );
      return profile;
    } catch (error) {
      throw new BadRequestException(
        error,
        'Something went wrong while updating profile',
      );
    }
  }

  async updateBusinessHours(user: any, businessHoursDto: BusinessHoursDto) {
    try {
      const { pattern: Pattern, dto: _ } = await getPatternFromRole(user.role);

      const profile = await firstValueFrom(
        this.profileClient.send(
          Pattern.UPDATE_BUSINESS_HOURS,
          withServiceAuth(
            { id: user.id, ...businessHoursDto },
            this.serviceToken,
          ),
        ),
      );
      return profile;
    } catch (error) {
      throw new BadRequestException(
        error,
        'Something went wrong while updating profile',
      );
    }
  }

  async updateEducation(user: any, education: EducationItemDto[]) {
    try {
      const { pattern: Pattern } = await getPatternFromRole(user.role);
      return await firstValueFrom(
        this.profileClient.send(
          Pattern.UPDATE_EDUCATION,
          withServiceAuth({ id: user.id, education }, this.serviceToken),
        ),
      );
    } catch (error) {
      throw new BadRequestException(
        error,
        'Something went wrong while updating education',
      );
    }
  }

  async updateSettings(user: any, settingsDto: SettingsDto) {
    try {
      const { pattern: Pattern } = await getPatternFromRole(user.role);
      return await firstValueFrom(
        this.profileClient.send(
          Pattern.UPDATE_SETTINGS,
          withServiceAuth({ id: user.id, ...settingsDto }, this.serviceToken),
        ),
      );
    } catch (error) {
      throw new BadRequestException(
        error,
        'Something went wrong while updating settings',
      );
    }
  }

  remove(id: string) {
    return `This action removes a #${id} profile`;
  }
}
