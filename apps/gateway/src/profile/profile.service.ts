import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  ProfileDtoType,
  UpdateProfileDtoType,
  AuthPatterns,
  BusinessHoursDto,
  PaginationDto,
  AuthRole,
} from '@medicpadi-backend/contracts';
import { getPatternFromRole } from '@medicpadi-backend/utils';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProfileService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('PROFILE_SERVICE') private readonly profileClient: ClientProxy,
  ) {}
  create(createProfileDto: ProfileDtoType) {
    return createProfileDto;
  }

  async findAll(query: PaginationDto) {
    try {
      const { pattern: Pattern, dto: _ } = await getPatternFromRole(
        query.role || AuthRole.PATIENT,
      );
      return await firstValueFrom(
        this.profileClient.send(Pattern.FIND_ALL, query),
      );
    } catch (error) {
      throw error;
    }
  }

  async retrieve(id: string) {
    try {
      const user = await firstValueFrom(
        this.authClient.send(AuthPatterns.FIND_BY_ID, id),
      );

      const { pattern: Pattern, dto: _ } = await getPatternFromRole(user.role);

      const profile = await firstValueFrom(
        this.profileClient.send(Pattern.RETRIEVE, id),
      );
      return { user, profile };
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
        this.profileClient.send(Pattern.RETRIEVE, id),
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
        this.profileClient.send(Pattern.UPDATE, {
          id: user.id,
          ...updateProfileDto,
        }),
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
        this.profileClient.send(Pattern.UPDATE_BUSINESS_HOURS, {
          id: user.id,
          ...businessHoursDto,
        }),
      );
      return profile;
    } catch (error) {
      throw new BadRequestException(
        error,
        'Something went wrong while updating profile',
      );
    }
  }

  // Laboratory specific method
  // async addLabTestOffered(id: string, testOffered: TestOfferedDto) {
  //   try {
  //     const response = await firstValueFrom(
  //       this.profileClient.send(LaboratoryPatterns.ADD_TEST_OFFERED, {
  //         id,
  //         testOffered,
  //       }),
  //     );
  //     return response;
  //   } catch (error) {
  //     throw new BadRequestException(
  //       error,
  //       'Something went wrong while adding test offered',
  //     );
  //   }
  // }

  remove(id: string) {
    return `This action removes a #${id} profile`;
  }
}
