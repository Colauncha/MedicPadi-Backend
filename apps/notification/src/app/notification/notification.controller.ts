import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateNotificationDto,
  NotificationPatterns,
  NotificationQueryDto,
  UpdateNotificationDto,
} from '@medicpadi-backend/contracts';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @MessagePattern(NotificationPatterns.NOTIFICATIONS.CREATE)
  create(@Payload('data') dto: CreateNotificationDto) {
    return this.notificationService.create(dto);
  }

  @MessagePattern(NotificationPatterns.NOTIFICATIONS.FIND_ALL)
  findAll(@Payload('data') payload: { userId: string; query: NotificationQueryDto }) {
    return this.notificationService.findAll(payload.userId, payload.query ?? {});
  }

  @MessagePattern(NotificationPatterns.NOTIFICATIONS.RETRIEVE)
  findOne(@Payload('data') payload: { userId: string; id: string }) {
    return this.notificationService.findOne(payload.userId, payload.id);
  }

  @MessagePattern(NotificationPatterns.NOTIFICATIONS.MARK_READ)
  markRead(@Payload('data') payload: { userId: string; id: string }) {
    return this.notificationService.markRead(payload.userId, payload.id);
  }

  @MessagePattern(NotificationPatterns.NOTIFICATIONS.MARK_ALL_READ)
  markAllRead(@Payload('data') userId: string) {
    return this.notificationService.markAllRead(userId);
  }

  @MessagePattern(NotificationPatterns.NOTIFICATIONS.UNREAD_COUNT)
  unreadCount(@Payload('data') userId: string) {
    return this.notificationService.unreadCount(userId);
  }

  @MessagePattern(NotificationPatterns.NOTIFICATIONS.UPDATE)
  update(@Payload('data') dto: UpdateNotificationDto) {
    return this.notificationService.update(dto.id, dto);
  }

  @MessagePattern(NotificationPatterns.NOTIFICATIONS.DELETE)
  remove(@Payload('data') payload: { userId: string; id: string }) {
    return this.notificationService.remove(payload.userId, payload.id);
  }
}