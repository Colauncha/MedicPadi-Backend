import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  PushPlatform,
  RegisterDeviceDto,
  ServiceError,
} from '@medicpadi-backend/contracts';
import { DeviceToken } from './entities/device-token.entity';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceRepo: Repository<DeviceToken>,
  ) {}

  async register(userId: string, dto: RegisterDeviceDto) {
    const isWeb = dto.platform === PushPlatform.WEB;
    const token = isWeb ? dto.subscription?.endpoint : dto.token;
    if (!token) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: isWeb
          ? 'subscription is required for web devices'
          : 'token is required for mobile devices',
      } as ServiceError);
    }

    try {
      // A token belongs to one physical device, so re-registering moves it to the current user
      await this.deviceRepo.upsert(
        {
          user_id: userId,
          platform: dto.platform,
          token,
          web_push_keys: isWeb ? dto.subscription!.keys : null,
          device_name: dto.deviceName ?? null,
          last_seen_at: new Date(),
          updatedAt: new Date(),
        },
        { conflictPaths: ['token'] },
      );
      return await this.deviceRepo.findOne({ where: { token } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to register device',
      } as ServiceError);
    }
  }

  async unregister(userId: string, token: string) {
    try {
      await this.deviceRepo.delete({ user_id: userId, token });
      return { message: 'Device unregistered successfully' };
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to unregister device',
      } as ServiceError);
    }
  }

  async findAllForUser(userId: string) {
    try {
      return await this.deviceRepo.find({
        where: { user_id: userId },
        order: { last_seen_at: 'DESC' },
      });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get devices',
      } as ServiceError);
    }
  }

  async removeByTokens(tokens: string[]) {
    if (!tokens.length) return;
    await this.deviceRepo.delete({ token: In(tokens) });
  }
}
