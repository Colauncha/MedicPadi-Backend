import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  CreateAuthDto,
  AuthPatterns,
  LoginDto,
  UpdateAuthDto,
  EmailPatterns,
  WaitlistEmailDto,
  WelcomeEmailDto,
} from '@medicpadi-backend/contracts';
import { getPatternFromRole } from '@medicpadi-backend/utils';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('PROFILE_SERVICE') private readonly profileClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE') private readonly emailClient: ClientProxy,
    @Inject() private readonly configService: ConfigService,
  ) {}

  async create(createAuthDto: CreateAuthDto) {
    try {
      const user = await firstValueFrom(
        this.authClient.send(AuthPatterns.CREATE, createAuthDto),
      );

      const { pattern: Pattern, dto: Dto } = await getPatternFromRole(
        createAuthDto.role,
      );
      console.log(Dto);
      Dto.user_id = user.id;
      try {
        const profile = await firstValueFrom(
          this.profileClient.send(Pattern.CREATE, Dto),
        );

        if (profile && user) {
          if (this.configService.get<boolean>('appConfig.waitlist')) {
            const waitlistEmailDto = new WaitlistEmailDto();
            ((waitlistEmailDto.email = user.email),
              (waitlistEmailDto.name = createAuthDto.fullName || 'User'),
              console.log('sending waitlist mail', waitlistEmailDto));
            await firstValueFrom(
              this.emailClient.emit(EmailPatterns.WAITLIST, waitlistEmailDto),
            );
          } else {
            const welcomeEmailDto = new WelcomeEmailDto();
            ((welcomeEmailDto.email = user.email),
              (welcomeEmailDto.name = createAuthDto.fullName || 'User'),
              (welcomeEmailDto.verifyUrl = `https://fixserv.com/verify-email`),
              console.log('sending welcome mail', welcomeEmailDto));
            await firstValueFrom(
              this.emailClient.emit(EmailPatterns.WELCOME, welcomeEmailDto),
            );
          }
        }
        return { ...user, ...profile };
      } catch (error) {
        const _ = await firstValueFrom(
          this.authClient.send(AuthPatterns.DELETE, user.id),
        );
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  login(loginDto: LoginDto) {
    try {
      return this.authClient.send(AuthPatterns.LOGIN, loginDto);
    } catch (error) {
      throw new UnauthorizedException({
        error: error,
        cause: 'Login failed',
        description: error.message,
      });
    }
  }

  async update(updateAuthDto: UpdateAuthDto, id?: string) {
    try {
      updateAuthDto.id = id;
      const updatedAccount = await firstValueFrom(
        this.authClient.send(AuthPatterns.UPDATE, updateAuthDto),
      );
      return updatedAccount;
    } catch (error) {
      throw error;
    }
  }

  async requestPasswordReset(email: string) {
    try {
      await firstValueFrom(
        this.authClient.send(AuthPatterns.REQUEST_PASSWORD_RESET, email),
      );
      return { message: 'Password reset requested successfully' };
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(
    otp: number | string,
    email: string,
    newPassword: string,
  ) {
    try {
      await firstValueFrom(
        this.authClient.send(AuthPatterns.RESET_PASSWORD, {
          otp,
          email,
          newPassword,
        }),
      );
      return { message: 'Password reset successfully' };
    } catch (error) {
      throw error;
    }
  }

  async delete(id: string) {
    try {
      await firstValueFrom(this.authClient.send(AuthPatterns.DELETE, id));
      return { message: 'Account deleted successfully' };
    } catch (error) {
      throw error;
    }
  }
}
