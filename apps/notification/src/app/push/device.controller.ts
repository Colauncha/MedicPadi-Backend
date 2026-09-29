import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  NotificationPatterns,
  RegisterDeviceDto,
  UnregisterDeviceDto,
} from '@medicpadi-backend/contracts';
import { DeviceService } from './device.service';

@Controller()
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @MessagePattern(NotificationPatterns.DEVICES.REGISTER)
  register(@Payload('data') payload: { userId: string; dto: RegisterDeviceDto }) {
    return this.deviceService.register(payload.userId, payload.dto);
  }

  @MessagePattern(NotificationPatterns.DEVICES.UNREGISTER)
  unregister(@Payload('data') payload: { userId: string; dto: UnregisterDeviceDto }) {
    return this.deviceService.unregister(payload.userId, payload.dto.token);
  }

  @MessagePattern(NotificationPatterns.DEVICES.FIND_ALL)
  findAll(@Payload('data') userId: string) {
    return this.deviceService.findAllForUser(userId);
  }
}
