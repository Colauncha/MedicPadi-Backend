import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  CreateAuthDto,
  AuthPatterns,
  LoginDto,
  UpdateAuthDto,
} from '@medicpadi-backend/contracts';
import { getPatternFromRole } from '@medicpadi-backend/utils';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('PROFILE_SERVICE') private readonly profileClient: ClientProxy,
  ) {}

  async create(createAuthDto: CreateAuthDto) {
    try {
      const user = await firstValueFrom(
        this.authClient.send(AuthPatterns.CREATE, createAuthDto),
      );

      const { pattern: Pattern, dto: Dto } = await getPatternFromRole(
        createAuthDto.role,
      );
      console.log(Dto)
      Dto.user_id = user.id;

      const profile = await firstValueFrom(
        this.profileClient.send(Pattern.CREATE, Dto),
      );
      return { ...user, ...profile };
    } catch (error) {
      console.error(error);
      throw new BadRequestException({
        error: 'Account could not be created',
        cause: error,
        description: error.message,
      });
    }
  }

  login(loginDto: LoginDto) {
    return this.authClient.send(AuthPatterns.LOGIN, loginDto);
    // throw new Error('Method not implemented.');
  }

  async update(updateAuthDto: UpdateAuthDto, id: string) {
    try {
      updateAuthDto.id = id
      const updatedAccount = await firstValueFrom(
        this.authClient.send(AuthPatterns.UPDATE, updateAuthDto)
      )
      return updatedAccount;
    } catch (error) {
      throw new Error('Error updating account');
    }
  }
}
