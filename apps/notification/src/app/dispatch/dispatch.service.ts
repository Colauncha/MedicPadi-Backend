import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import {
  AuthPatterns,
  DoctorPatterns,
  LaboratoryPatterns,
  PatientPatterns,
} from '@medicpadi-backend/contracts';
import { withServiceAuth } from '@medicpadi-backend/utils';
import { firstValueFrom } from 'rxjs';

export interface ResolvedUser {
  email: string;
  fullName: string;
}

export interface ResolvedPatient {
  firstName: string;
  lastName: string;
  emailNotificationsEnabled: boolean;
}

export interface ResolvedDoctor {
  firstName: string;
  lastName: string;
  emailNotificationsEnabled: boolean;
}

export interface ResolvedLab {
  name: string;
  emailNotificationsEnabled: boolean;
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('PROFILE_SERVICE') private readonly profileClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get token(): string {
    return this.configService.getOrThrow<string>('appConfig.internalServiceToken');
  }

  async resolveUserAuth(userId: string): Promise<ResolvedUser> {
    const auth = await firstValueFrom(
      this.authClient.send(AuthPatterns.FIND_BY_ID, withServiceAuth(userId, this.token)),
    );
    return { email: auth.email, fullName: auth.fullName ?? auth.email };
  }

  async resolvePatient(userId: string): Promise<ResolvedPatient> {
    const profile = await firstValueFrom(
      this.profileClient.send(PatientPatterns.RETRIEVE, withServiceAuth(userId, this.token)),
    );
    return {
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      emailNotificationsEnabled: profile.settings?.emailNotifications ?? true,
    };
  }

  async resolveDoctor(userId: string): Promise<ResolvedDoctor> {
    const profile = await firstValueFrom(
      this.profileClient.send(DoctorPatterns.RETRIEVE, withServiceAuth(userId, this.token)),
    );
    return {
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      emailNotificationsEnabled: profile.settings?.emailNotifications ?? true,
    };
  }

  async resolveLab(userId: string): Promise<ResolvedLab> {
    const profile = await firstValueFrom(
      this.profileClient.send(LaboratoryPatterns.RETRIEVE, withServiceAuth(userId, this.token)),
    );
    return {
      name: profile.name ?? 'the laboratory',
      emailNotificationsEnabled: profile.settings?.emailNotifications ?? true,
    };
  }

  displayName(firstName: string, lastName: string, fallback: string, prefix = ''): string {
    const full = `${firstName} ${lastName}`.trim();
    return full ? `${prefix}${full}` : fallback;
  }
}
