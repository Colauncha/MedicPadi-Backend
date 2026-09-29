import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DeviceToken } from './entities/device-token.entity';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { PushService } from './push.service';
import { NOTIFICATION_QUEUE } from '../dispatch/dispatch.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceToken]),
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
  ],
  controllers: [DeviceController],
  providers: [DeviceService, PushService],
  exports: [PushService],
})
export class PushModule {}
