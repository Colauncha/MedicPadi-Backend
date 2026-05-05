import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { EhrService } from './ehr.service';
import {
  AuthRole,
  CreateEhrRecordDto,
  UpdateEhrRecordDto,
  CreateConsentGrantDto,
  UpdateConsentGrantDto,
  PaginationDto,
} from '@medicpadi-backend/contracts';
import { AuthGuard } from '../guards/auth/auth.guard';
import { Roles } from '../guards/decorators/roles.decorator';

@Controller('ehr')
@UseGuards(AuthGuard)
export class EhrController {
  constructor(private readonly ehrService: EhrService) {}

  // EHR Records

  @Post('/records')
  @Roles(AuthRole.CONSULTANT, AuthRole.ADMIN)
  createRecord(@Body() dto: CreateEhrRecordDto) {
    return this.ehrService.createRecord(dto);
  }

  @Get('/records')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  findAllRecords(@Query() query: PaginationDto) {
    return this.ehrService.findAllRecords(query);
  }

  @Get('/records/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  findOneRecord(@Param('id') id: string) {
    return this.ehrService.findOneRecord(id);
  }

  @Patch('/records/:id')
  @Roles(AuthRole.CONSULTANT, AuthRole.ADMIN)
  updateRecord(@Param('id') id: string, @Body() dto: UpdateEhrRecordDto) {
    return this.ehrService.updateRecord(id, dto);
  }

  @Delete('/records/:id')
  @Roles(AuthRole.ADMIN)
  removeRecord(@Param('id') id: string) {
    return this.ehrService.removeRecord(id);
  }

  // Consents

  @Post('/consents')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  createConsent(@Body() dto: CreateConsentGrantDto) {
    return this.ehrService.createConsent(dto);
  }

  @Get('/consents')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  findAllConsents(@Query() query: PaginationDto) {
    return this.ehrService.findAllConsents(query);
  }

  @Get('/consents/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  findOneConsent(@Param('id') id: string) {
    return this.ehrService.findOneConsent(id);
  }

  @Patch('/consents/:id')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  updateConsent(@Param('id') id: string, @Body() dto: UpdateConsentGrantDto) {
    return this.ehrService.updateConsent(id, dto);
  }

  @Delete('/consents/:id')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  revokeConsent(@Param('id') id: string) {
    return this.ehrService.revokeConsent(id);
  }
}
