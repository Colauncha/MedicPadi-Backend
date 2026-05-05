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
  Req,
} from '@nestjs/common';
import { OrderService } from './order.service';
import {
  AuthRole,
  CreateAppointmentDto,
  UpdateAppointmentDto,
  CreatePrescriptionDto,
  UpdatePrescriptionDto,
  CreateDrugRequisitionDto,
  UpdateDrugRequisitionDto,
  CreateTestRequisitionDto,
  UpdateTestRequisitionDto,
  PaginationDto,
} from '@medicpadi-backend/contracts';
import { AuthGuard, RequestWithUser } from '../guards/auth/auth.guard';
import { Roles } from '../guards/decorators/roles.decorator';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // Appointments

  @Post('/appointments')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  createAppointment(
    @Body() dto: CreateAppointmentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.orderService.createAppointment({
      ...dto,
      patient_id: req.user.id,
    });
  }

  @Get('/appointments')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  findAllAppointments(@Query() query: PaginationDto) {
    return this.orderService.findAllAppointments(query);
  }

  @Get('/appointments/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  findOneAppointment(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.orderService.findOneAppointment(id, req.user.role);
  }

  @Patch('/appointments/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  updateAppointment(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.orderService.updateAppointment(id, dto);
  }

  @Delete('/appointments/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  removeAppointment(@Param('id') id: string) {
    return this.orderService.removeAppointment(id);
  }

  // Prescriptions

  @Post('/prescriptions')
  @Roles(AuthRole.CONSULTANT, AuthRole.ADMIN)
  createPrescription(@Body() dto: CreatePrescriptionDto) {
    return this.orderService.createPrescription(dto);
  }

  @Get('/prescriptions')
  @Roles(
    AuthRole.PATIENT,
    AuthRole.CONSULTANT,
    AuthRole.PHARMACY,
    AuthRole.ADMIN,
  )
  findAllPrescriptions(@Query() query: PaginationDto) {
    return this.orderService.findAllPrescriptions(query);
  }

  @Get('/prescriptions/:id')
  @Roles(
    AuthRole.PATIENT,
    AuthRole.CONSULTANT,
    AuthRole.PHARMACY,
    AuthRole.ADMIN,
  )
  findOnePrescription(@Param('id') id: string) {
    return this.orderService.findOnePrescription(id);
  }

  @Patch('/prescriptions/:id')
  @Roles(AuthRole.CONSULTANT, AuthRole.PHARMACY, AuthRole.ADMIN)
  updatePrescription(
    @Param('id') id: string,
    @Body() dto: UpdatePrescriptionDto,
  ) {
    return this.orderService.updatePrescription(id, dto);
  }

  @Delete('/prescriptions/:id')
  @Roles(AuthRole.CONSULTANT, AuthRole.ADMIN)
  removePrescription(@Param('id') id: string) {
    return this.orderService.removePrescription(id);
  }

  // Drug Requisitions

  @Post('/drug-requisitions')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  createDrugRequisition(@Body() dto: CreateDrugRequisitionDto) {
    return this.orderService.createDrugRequisition(dto);
  }

  @Get('/drug-requisitions')
  @Roles(
    AuthRole.PATIENT,
    AuthRole.PHARMACY,
    AuthRole.CONSULTANT,
    AuthRole.ADMIN,
  )
  findAllDrugRequisitions(@Query() query: PaginationDto) {
    return this.orderService.findAllDrugRequisitions(query);
  }

  @Get('/drug-requisitions/:id')
  @Roles(
    AuthRole.PATIENT,
    AuthRole.PHARMACY,
    AuthRole.CONSULTANT,
    AuthRole.ADMIN,
  )
  findOneDrugRequisition(@Param('id') id: string) {
    return this.orderService.findOneDrugRequisition(id);
  }

  @Patch('/drug-requisitions/:id')
  @Roles(AuthRole.PATIENT, AuthRole.PHARMACY, AuthRole.ADMIN)
  updateDrugRequisition(
    @Param('id') id: string,
    @Body() dto: UpdateDrugRequisitionDto,
  ) {
    return this.orderService.updateDrugRequisition(id, dto);
  }

  @Delete('/drug-requisitions/:id')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  removeDrugRequisition(@Param('id') id: string) {
    return this.orderService.removeDrugRequisition(id);
  }

  // Test Requisitions

  @Post('/test-requisitions')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  createTestRequisition(@Body() dto: CreateTestRequisitionDto) {
    return this.orderService.createTestRequisition(dto);
  }

  @Get('/test-requisitions')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.LAB, AuthRole.ADMIN)
  findAllTestRequisitions(@Query() query: PaginationDto) {
    return this.orderService.findAllTestRequisitions(query);
  }

  @Get('/test-requisitions/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.LAB, AuthRole.ADMIN)
  findOneTestRequisition(@Param('id') id: string) {
    return this.orderService.findOneTestRequisition(id);
  }

  @Patch('/test-requisitions/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.LAB, AuthRole.ADMIN)
  updateTestRequisition(
    @Param('id') id: string,
    @Body() dto: UpdateTestRequisitionDto,
  ) {
    return this.orderService.updateTestRequisition(id, dto);
  }

  @Delete('/test-requisitions/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  removeTestRequisition(@Param('id') id: string) {
    return this.orderService.removeTestRequisition(id);
  }
}
