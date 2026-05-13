import { Inject, Injectable } from '@nestjs/common';
import {
  CreateAuthDto,
  AuthPatterns,
  LoginDto,
  UpdateAuthDto,
  EmailPatterns,
  WaitlistEmailDto,
  WelcomeEmailDto,
  TransactionPatterns,
  CreateWalletDto,
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
    @Inject('TRANSACTIONS_SERVICE')
    private readonly transactionsClient: ClientProxy,
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
      Dto.user_id = user.id;
      try {
        const profile = await firstValueFrom(
          this.profileClient.send(Pattern.CREATE, Dto),
        );

        // Create wallet for the new user (fire-and-forget; non-blocking)
        const walletDto: CreateWalletDto = { user_id: user.id };
        this.transactionsClient
          .send(TransactionPatterns.WALLET.CREATE, walletDto)
          .subscribe();

        if (profile && user) {
          if (this.configService.get<boolean>('appConfig.waitlist')) {
            const waitlistEmailDto = new WaitlistEmailDto();
            waitlistEmailDto.email = user.email;
            waitlistEmailDto.name = createAuthDto.fullName || 'User';
            this.emailClient.emit(EmailPatterns.WAITLIST, waitlistEmailDto);
          } else {
            const welcomeEmailDto = new WelcomeEmailDto();
            welcomeEmailDto.email = user.email;
            welcomeEmailDto.name = createAuthDto.fullName || 'User';
            welcomeEmailDto.verifyUrl = `https://medicpadi.com/verify-email`;
            this.emailClient.emit(EmailPatterns.WELCOME, welcomeEmailDto);
          }
        }
        return { ...user, ...profile };
      } catch (error) {
        await firstValueFrom(
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
      throw error;
    }
  }

  async update(updateAuthDto: UpdateAuthDto, id?: string) {
    try {
      updateAuthDto.id = id;
      return await firstValueFrom(
        this.authClient.send(AuthPatterns.UPDATE, updateAuthDto),
      );
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
