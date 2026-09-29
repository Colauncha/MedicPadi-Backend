import { Inject, Injectable } from '@nestjs/common';
import {
  NotificationPatterns,
  NotificationQueryDto,
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

  // In-app notifications

  async findAll(query: NotificationQueryDto, userId: string) {
    return this.send(NotificationPatterns.NOTIFICATIONS.FIND_ALL, { userId, query });
  }

  async unreadCount(userId: string) {
    return this.send(NotificationPatterns.NOTIFICATIONS.UNREAD_COUNT, userId);
  }

  async markAllRead(userId: string) {
    return this.send(NotificationPatterns.NOTIFICATIONS.MARK_ALL_READ, userId);
  }

  async findOne(id: string, userId: string) {
    return this.send(NotificationPatterns.NOTIFICATIONS.RETRIEVE, { userId, id });
  }

  async markRead(id: string, userId: string) {
    return this.send(NotificationPatterns.NOTIFICATIONS.MARK_READ, { userId, id });
  }

  async remove(id: string, userId: string) {
    return this.send(NotificationPatterns.NOTIFICATIONS.DELETE, { userId, id });
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
