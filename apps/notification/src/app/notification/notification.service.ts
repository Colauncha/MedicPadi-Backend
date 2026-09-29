import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  CreateNotificationDto,
  NotificationQueryDto,
  PaginationResponseDto,
  ServiceError,
  UpdateNotificationDto,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse } from '@medicpadi-backend/utils';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async create(dto: CreateNotificationDto) {
    try {
      const notification = this.notificationRepo.create({
        ...dto,
        sent_at: new Date(),
      });
      await this.notificationRepo.save(notification);
      return notification;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create notification',
      } as ServiceError);
    }
  }

  async findAll(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<PaginationResponseDto<Notification>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    try {
      const [data, total] = await this.notificationRepo.findAndCount({
        where: {
          user_id: userId,
          ...(query.unreadOnly && { is_read: false }),
        },
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: 'DESC' },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get notifications',
      } as ServiceError);
    }
  }

  async findOne(userId: string, id: string) {
    let notification: Notification | null;
    try {
      notification = await this.notificationRepo.findOne({
        where: { id, user_id: userId },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get notification',
      } as ServiceError);
    }
    // Same 404 for missing and not-owned, so other users' ids aren't discoverable
    if (!notification) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Notification not found',
      } as ServiceError);
    }
    return notification;
  }

  async markRead(userId: string, id: string) {
    let affected: number | undefined;
    try {
      const result = await this.notificationRepo.update(
        { id, user_id: userId },
        { is_read: true },
      );
      affected = result.affected;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to mark notification as read',
      } as ServiceError);
    }
    if (!affected) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Notification not found',
      } as ServiceError);
    }
    return { message: 'Notification marked as read' };
  }

  async markAllRead(userId: string) {
    try {
      const result = await this.notificationRepo.update(
        { user_id: userId, is_read: false },
        { is_read: true },
      );
      return {
        message: 'All notifications marked as read',
        updated: result.affected ?? 0,
      };
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to mark notifications as read',
      } as ServiceError);
    }
  }

  async unreadCount(userId: string) {
    try {
      const count = await this.notificationRepo.count({
        where: { user_id: userId, is_read: false },
      });
      return { count };
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get unread notification count',
      } as ServiceError);
    }
  }

  async update(id: string | undefined, dto: UpdateNotificationDto) {
    try {
      const existing = await this.notificationRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Notification not found',
        } as ServiceError);
      }
      const result = await this.notificationRepo.update({ id }, dto);
      return result.raw;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to update notification',
          } as ServiceError);
    }
  }

  async remove(userId: string, id: string) {
    const existing = await this.findOne(userId, id);
    try {
      await this.notificationRepo.remove(existing);
      return { message: 'Notification removed successfully' };
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to remove notification',
      } as ServiceError);
    }
  }
}
