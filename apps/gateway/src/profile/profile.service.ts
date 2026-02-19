import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  ProfileDtoType,
  UpdateProfileDtoType,
  AuthPatterns,
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

  findAll() {
    return `This action returns all profile`;
  }

  findOne(id: number) {
    return `This action returns a #${id} profile`;
  }

  async update(id: string, updateProfileDto: UpdateProfileDtoType) {
    try {
      const user = await firstValueFrom(
        this.authClient.send(AuthPatterns.FIND_BY_ID, id),
      );

      const { pattern: Pattern, dto: _ } = await getPatternFromRole(user.role);

      const profile = await firstValueFrom(
        this.profileClient.send(Pattern.UPDATE, { id, ...updateProfileDto }),
      );
      return profile;
    } catch (error) {
      throw new BadRequestException(
        'Something went wrong while updating profile',
      );
    }
  }

  remove(id: number) {
    return `This action removes a #${id} profile`;
  }
}
