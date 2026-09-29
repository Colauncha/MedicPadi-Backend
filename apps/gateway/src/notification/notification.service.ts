import { Inject, Injectable } from '@nestjs/common';
import {
  NotificationPatterns,
  RegisterDeviceDto,
  UnregisterDeviceDto,
} from '@medicpadi-backend/contracts';
import { withServiceAuth } from '@medicpadi-backend/utils';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationService {
  constructor(
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>('appConfig.internalServiceToken');
  }

  private send<T>(pattern: string, data: T) {
    return firstValueFrom(
      this.notificationClient.send(pattern, withServiceAuth(data, this.serviceToken)),
    );
  }

  // Devices

  async registerDevice(dto: RegisterDeviceDto, userId: string) {
    return this.send(NotificationPatterns.DEVICES.REGISTER, { userId, dto });
  }

  async unregisterDevice(dto: UnregisterDeviceDto, userId: string) {
    return this.send(NotificationPatterns.DEVICES.UNREGISTER, { userId, dto });
  }

  async findAllDevices(userId: string) {
    return this.send(NotificationPatterns.DEVICES.FIND_ALL, userId);
  }
}
