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
import { getPatternFromRole, withServiceAuth } from '@medicpadi-backend/utils';
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

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>('appConfig.internalServiceToken');
  }

  async create(createAuthDto: CreateAuthDto) {
    try {
      const token = this.serviceToken;
      const user = await firstValueFrom(
        this.authClient.send(AuthPatterns.CREATE, withServiceAuth(createAuthDto, token)),
      );

      const { pattern: Pattern, dto: Dto } = await getPatternFromRole(
        createAuthDto.role,
      );
      Dto.user_id = user.id;
      try {
        const profile = await firstValueFrom(
          this.profileClient.send(Pattern.CREATE, withServiceAuth(Dto, token)),
        );

        // Create wallet for the new user (fire-and-forget; non-blocking)
        const walletDto: CreateWalletDto = { user_id: user.id };
        this.transactionsClient
          .send(TransactionPatterns.WALLET.CREATE, withServiceAuth(walletDto, token))
          .subscribe();

        if (profile && user) {
          if (this.configService.get<boolean>('appConfig.waitlist')) {
            const waitlistEmailDto = new WaitlistEmailDto();
            waitlistEmailDto.email = user.email;
            waitlistEmailDto.name = createAuthDto.fullName || 'User';
            this.emailClient.emit(EmailPatterns.WAITLIST, withServiceAuth(waitlistEmailDto, token));
          } else {
            const welcomeEmailDto = new WelcomeEmailDto();
            welcomeEmailDto.email = user.email;
            welcomeEmailDto.name = createAuthDto.fullName || 'User';
            welcomeEmailDto.verifyUrl = `https://medicpadi.com/verify-email`;
            this.emailClient.emit(EmailPatterns.WELCOME, withServiceAuth(welcomeEmailDto, token));
          }
        }
        return { ...user, ...profile };
      } catch (error) {
        await firstValueFrom(
          this.authClient.send(AuthPatterns.DELETE, withServiceAuth(user.id, token)),
        );
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  login(loginDto: LoginDto) {
    try {
      return this.authClient.send(AuthPatterns.LOGIN, withServiceAuth(loginDto, this.serviceToken));
    } catch (error) {
      throw error;
    }
  }

  async update(updateAuthDto: UpdateAuthDto, id?: string) {
    try {
      updateAuthDto.id = id;
      return await firstValueFrom(
        this.authClient.send(AuthPatterns.UPDATE, withServiceAuth(updateAuthDto, this.serviceToken)),
      );
    } catch (error) {
      throw error;
    }
  }

  async requestPasswordReset(email: string) {
    try {
      await firstValueFrom(
        this.authClient.send(AuthPatterns.REQUEST_PASSWORD_RESET, withServiceAuth(email, this.serviceToken)),
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
        this.authClient.send(AuthPatterns.RESET_PASSWORD, withServiceAuth({ otp, email, newPassword }, this.serviceToken)),
      );
      return { message: 'Password reset successfully' };
    } catch (error) {
      throw error;
    }
  }

  async delete(id: string) {
    try {
      await firstValueFrom(this.authClient.send(AuthPatterns.DELETE, withServiceAuth(id, this.serviceToken)));
      return { message: 'Account deleted successfully' };
    } catch (error) {
      throw error;
    }
  }
}
