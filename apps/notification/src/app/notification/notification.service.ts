import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  CreateNotificationDto,
  PaginationDto,
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
    query: PaginationDto,
  ): Promise<PaginationResponseDto<Notification>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    try {
      const [data, total] = await this.notificationRepo.findAndCount({
        where: query.id ? { user_id: query.id } : {},
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

  async findOne(id: string) {
    try {
      return await this.notificationRepo.findOne({ where: { id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get notification',
      } as ServiceError);
    }
  }

  async markRead(id: string) {
    try {
      await this.notificationRepo.update({ id }, { is_read: true });
      return { message: 'Notification marked as read' };
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to mark notification as read',
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

  async remove(id: string) {
    try {
      const existing = await this.findOne(id);
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Notification not found',
        } as ServiceError);
      }
      await this.notificationRepo.remove(existing);
      return { message: 'Notification removed successfully' };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to remove notification',
          } as ServiceError);
    }
  }
}