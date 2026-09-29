import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  NotificationQueryDto,
  RegisterDeviceDto,
  UnregisterDeviceDto,
} from '@medicpadi-backend/contracts';
import { AuthGuard, RequestWithUser } from '../guards/auth/auth.guard';
import { NotificationService } from './notification.service';

// The notification service receives these wrapped as { userId, ... }, which bypasses its
// global ValidationPipe, so validate at the edge. The user is always taken from req.user;
// the notification service ignores any id/ids in list queries. Not forbidNonWhitelisted: browsers include
// extra fields (e.g. expirationTime) in PushSubscription.toJSON().
const validate = new ValidationPipe({ whitelist: true, transform: true });

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ──────────────────────────────────────────────
  // In-app notifications
  // Static routes must stay above the /:id routes
  // ──────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List my notifications',
    description: 'Returns a paginated list of the authenticated user\'s in-app notifications, newest first. Pass `unreadOnly=true` to return only unread notifications.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of notifications.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  findAll(@Query(validate) query: NotificationQueryDto, @Req() req: RequestWithUser) {
    return this.notificationService.findAll(query, req.user.id);
  }

  @Get('/unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Returns `{ count }` — the number of unread in-app notifications for the authenticated user. Use for the notification badge.',
  })
  @ApiResponse({ status: 200, description: 'Unread count.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  unreadCount(@Req() req: RequestWithUser) {
    return this.notificationService.unreadCount(req.user.id);
  }

  @Patch('/read-all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Marks every unread notification of the authenticated user as read. Returns the number updated.',
  })
  @ApiResponse({ status: 200, description: 'Notifications marked as read.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  markAllRead(@Req() req: RequestWithUser) {
    return this.notificationService.markAllRead(req.user.id);
  }

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
  registerDevice(@Body(validate) dto: RegisterDeviceDto, @Req() req: RequestWithUser) {
    return this.notificationService.registerDevice(dto, req.user.id);
  }

  @Delete('/devices')
  @ApiOperation({
    summary: 'Unregister a device',
    description: 'Stops push notifications to the given device. Call before logging out. For web devices, pass the subscription endpoint as `token`.',
  })
  @ApiResponse({ status: 200, description: 'Device unregistered.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  unregisterDevice(@Body(validate) dto: UnregisterDeviceDto, @Req() req: RequestWithUser) {
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

  // ──────────────────────────────────────────────
  // Single notification
  // ──────────────────────────────────────────────

  @Get('/:id')
  @ApiOperation({
    summary: 'Get a notification by ID',
    description: 'Returns one of the authenticated user\'s notifications. Notifications belonging to other users return 404.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the notification.' })
  @ApiResponse({ status: 200, description: 'Notification found.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) {
    return this.notificationService.findOne(id, req.user.id);
  }

  @Patch('/:id/read')
  @ApiOperation({
    summary: 'Mark a notification as read',
    description: 'Marks one of the authenticated user\'s notifications as read.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the notification.' })
  @ApiResponse({ status: 200, description: 'Notification marked as read.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  markRead(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) {
    return this.notificationService.markRead(id, req.user.id);
  }

  @Delete('/:id')
  @ApiOperation({
    summary: 'Delete a notification',
    description: 'Deletes one of the authenticated user\'s notifications.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the notification.' })
  @ApiResponse({ status: 200, description: 'Notification deleted.' })
  @ApiResponse({ status: 400, description: 'Invalid UUID.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) {
    return this.notificationService.remove(id, req.user.id);
  }
}
