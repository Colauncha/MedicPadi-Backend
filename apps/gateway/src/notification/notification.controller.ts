import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegisterDeviceDto, UnregisterDeviceDto } from '@medicpadi-backend/contracts';
import { AuthGuard, RequestWithUser } from '../guards/auth/auth.guard';
import { NotificationService } from './notification.service';

// The notification service receives these wrapped as { userId, dto }, which bypasses its
// global ValidationPipe, so validate at the edge. Not forbidNonWhitelisted: browsers include
// extra fields (e.g. expirationTime) in PushSubscription.toJSON().
const validateBody = new ValidationPipe({ whitelist: true, transform: true });

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ──────────────────────────────────────────────
  // Push devices
  // ──────────────────────────────────────────────

  @Post('/devices')
  @ApiOperation({
    summary: 'Register a device for push notifications',
    description: `Registers (or refreshes) the current device so it receives push notifications for the authenticated user. Call on login and whenever the push token changes.
- **ios / android**: send the Expo push token in \`token\` (from \`Notifications.getExpoPushTokenAsync()\`).
- **web**: send the browser \`PushSubscription\` JSON in \`subscription\` (from \`pushManager.subscribe()\` with the server's VAPID public key).

If the token is already registered to another user, it is moved to the current user.`,
  })
  @ApiResponse({ status: 201, description: 'Device registered.' })
  @ApiResponse({ status: 400, description: 'Invalid token or subscription.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  registerDevice(@Body(validateBody) dto: RegisterDeviceDto, @Req() req: RequestWithUser) {
    return this.notificationService.registerDevice(dto, req.user.id);
  }

  @Delete('/devices')
  @ApiOperation({
    summary: 'Unregister a device',
    description: 'Stops push notifications to the given device. Call before logging out. For web devices, pass the subscription endpoint as `token`.',
  })
  @ApiResponse({ status: 200, description: 'Device unregistered.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  unregisterDevice(@Body(validateBody) dto: UnregisterDeviceDto, @Req() req: RequestWithUser) {
    return this.notificationService.unregisterDevice(dto, req.user.id);
  }

  @Get('/devices')
  @ApiOperation({
    summary: 'List registered devices',
    description: 'Returns the devices registered for push notifications by the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'List of registered devices.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  findAllDevices(@Req() req: RequestWithUser) {
    return this.notificationService.findAllDevices(req.user.id);
  }
}
