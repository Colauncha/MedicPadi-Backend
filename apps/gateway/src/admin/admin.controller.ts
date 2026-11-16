import { Controller, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../guards/auth/auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminController {}
