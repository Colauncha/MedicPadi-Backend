import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateNotificationDto,
  NotificationPatterns,
  PaginationDto,
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
  findAll(@Payload('data') query: PaginationDto) {
    return this.notificationService.findAll(query);
  }

  @MessagePattern(NotificationPatterns.NOTIFICATIONS.RETRIEVE)
  findOne(@Payload('data') id: string) {
    return this.notificationService.findOne(id);
  }

  @MessagePattern(NotificationPatterns.NOTIFICATIONS.MARK_READ)
  markRead(@Payload('data') id: string) {
    return this.notificationService.markRead(id);
  }

  @MessagePattern(NotificationPatterns.NOTIFICATIONS.UPDATE)
  update(@Payload('data') dto: UpdateNotificationDto) {
    return this.notificationService.update(dto.id, dto);
  }

  @MessagePattern(NotificationPatterns.NOTIFICATIONS.DELETE)
  remove(@Payload('data') id: string) {
    return this.notificationService.remove(id);
  }
}