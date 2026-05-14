import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  AuthPatterns,
  NotificationPatterns,
  ProfilePatterns,
  ServicePatterns,
} from '@medicpadi-backend/contracts';
import { withServiceAuth } from '@medicpadi-backend/utils';
import { ApiHideProperty } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('PROFILE_SERVICE') private readonly profileClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
    @Inject('SERVICES_SERVICE') private readonly servicesClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>('appConfig.internalServiceToken');
  }

  @ApiHideProperty()
  getData(): { message: string } {
    return { message: 'Hello API' };
  }

  getStatus(): Record<string, any> {
    return {
      status: 'Ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async getServiceStatus(): Promise<Record<string, any>> {
    const token = this.serviceToken;
    const auth_status = await firstValueFrom(
      this.authClient.send(AuthPatterns.STATUS, withServiceAuth({}, token)),
    );
    const profile_status = await firstValueFrom(
      this.profileClient.send(ProfilePatterns.STATUS, withServiceAuth({}, token)),
    );
    const notification_status = await firstValueFrom(
      this.notificationClient.send(NotificationPatterns.STATUS, withServiceAuth({}, token)),
    );
    const services_status = await firstValueFrom(
      this.servicesClient.send(ServicePatterns.STATUS, withServiceAuth({}, token)),
    );
    return {
      authService: this.authClient ? auth_status : 'Disconnected',
      profileService: this.profileClient ? profile_status : 'Disconnected',
      notificationService: this.notificationClient
        ? notification_status
        : 'Disconnected',
      servicesService: this.servicesClient ? services_status : 'Disconnected',
    };
  }
}
