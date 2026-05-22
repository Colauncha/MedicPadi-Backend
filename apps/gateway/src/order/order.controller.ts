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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@Controller('orders')
@UseGuards(AuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ──────────────────────────────────────────────
  // Appointments
  // ──────────────────────────────────────────────

  @Post('/appointments')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Book an appointment',
    description:
      'Creates a new appointment between a patient and a consultant. The `patient_id` is automatically set from the authenticated user. Accessible by `patient`, `consultant`, and `admin` roles.',
  })
  @ApiResponse({ status: 201, description: 'Appointment booked.' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or scheduling conflict.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
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
  @ApiOperation({
    summary: 'List appointments',
    description:
      'Returns a paginated list of appointments. Results are scoped to the authenticated user. Accessible by `patient`, `consultant`, and `admin` roles.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of appointments.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  findAllAppointments(@Query() query: PaginationDto) {
    return this.orderService.findAllAppointments(query);
  }

  @Get('/appointments/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Get an appointment by ID',
    description:
      'Returns a single appointment. The response detail level may differ by role. Accessible by `patient`, `consultant`, and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the appointment.' })
  @ApiResponse({ status: 200, description: 'Appointment found.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
  findOneAppointment(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.orderService.findOneAppointment(id, req.user.role);
  }

  @Get('/appointments/:id/accept')
  @Roles(AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Doctor accept an appointment',
    description:
      'Returns a single appointment. The response detail level may differ by role. Accessible by `patient`, `consultant`, and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the appointment.' })
  @ApiResponse({ status: 200, description: 'Appointment found.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
  acceptAppointment(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.orderService.acceptAppointment(id);
  }

  @Patch('/appointments/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Update an appointment',
    description:
      'Updates appointment details such as time, status, or meeting link. Accessible by `patient`, `consultant`, and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the appointment to update.' })
  @ApiResponse({ status: 200, description: 'Appointment updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
  updateAppointment(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.orderService.updateAppointment(id, dto);
  }

  @Delete('/appointments/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Cancel an appointment',
    description:
      'Cancels (removes) an appointment. Accessible by `patient`, `consultant`, and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the appointment to cancel.' })
  @ApiResponse({ status: 200, description: 'Appointment cancelled.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
  removeAppointment(@Param('id') id: string) {
    return this.orderService.removeAppointment(id);
  }

  // ──────────────────────────────────────────────
  // Prescriptions
  // ──────────────────────────────────────────────

  @Post('/prescriptions')
  @Roles(AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Create a prescription',
    description:
      'Issues a prescription for a patient following a consultation. Accessible by `consultant` and `admin` roles.',
  })
  @ApiResponse({ status: 201, description: 'Prescription created.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({
    status: 403,
    description:
      'Insufficient permissions — consultant or admin role required.',
  })
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
  @ApiOperation({
    summary: 'List prescriptions',
    description:
      'Returns a paginated list of prescriptions. Accessible by `patient`, `consultant`, `pharmacy`, and `admin` roles.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of prescriptions.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
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
  @ApiOperation({
    summary: 'Get a prescription by ID',
    description:
      'Returns a single prescription. Accessible by `patient`, `consultant`, `pharmacy`, and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the prescription.' })
  @ApiResponse({ status: 200, description: 'Prescription found.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Prescription not found.' })
  findOnePrescription(@Param('id') id: string) {
    return this.orderService.findOnePrescription(id);
  }

  @Patch('/prescriptions/:id')
  @Roles(AuthRole.CONSULTANT, AuthRole.PHARMACY, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Update a prescription',
    description:
      'Updates prescription details (e.g. dispensing status). Accessible by `consultant`, `pharmacy`, and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the prescription to update.' })
  @ApiResponse({ status: 200, description: 'Prescription updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Prescription not found.' })
  updatePrescription(
    @Param('id') id: string,
    @Body() dto: UpdatePrescriptionDto,
  ) {
    return this.orderService.updatePrescription(id, dto);
  }

  @Delete('/prescriptions/:id')
  @Roles(AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Delete a prescription',
    description:
      'Removes a prescription. Accessible by `consultant` and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the prescription to delete.' })
  @ApiResponse({ status: 200, description: 'Prescription deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({
    status: 403,
    description:
      'Insufficient permissions — consultant or admin role required.',
  })
  @ApiResponse({ status: 404, description: 'Prescription not found.' })
  removePrescription(@Param('id') id: string) {
    return this.orderService.removePrescription(id);
  }

  // ──────────────────────────────────────────────
  // Drug Requisitions
  // ──────────────────────────────────────────────

  @Post('/drug-requisitions')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Place a drug requisition',
    description:
      'Submits a request to purchase drugs from a pharmacy, typically linked to a prescription. Accessible by `patient` and `admin` roles.',
  })
  @ApiResponse({ status: 201, description: 'Drug requisition placed.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions — patient or admin role required.',
  })
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
  @ApiOperation({
    summary: 'List drug requisitions',
    description:
      'Returns a paginated list of drug requisitions. Accessible by `patient`, `pharmacy`, `consultant`, and `admin` roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of drug requisitions.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
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
  @ApiOperation({
    summary: 'Get a drug requisition by ID',
    description:
      'Returns a single drug requisition. Accessible by `patient`, `pharmacy`, `consultant`, and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the drug requisition.' })
  @ApiResponse({ status: 200, description: 'Drug requisition found.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Drug requisition not found.' })
  findOneDrugRequisition(@Param('id') id: string) {
    return this.orderService.findOneDrugRequisition(id);
  }

  @Patch('/drug-requisitions/:id')
  @Roles(AuthRole.PATIENT, AuthRole.PHARMACY, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Update a drug requisition',
    description:
      'Updates a drug requisition (e.g. status or quantity). Accessible by `patient`, `pharmacy`, and `admin` roles.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the drug requisition to update.',
  })
  @ApiResponse({ status: 200, description: 'Drug requisition updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Drug requisition not found.' })
  updateDrugRequisition(
    @Param('id') id: string,
    @Body() dto: UpdateDrugRequisitionDto,
  ) {
    return this.orderService.updateDrugRequisition(id, dto);
  }

  @Delete('/drug-requisitions/:id')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Cancel a drug requisition',
    description:
      'Cancels a pending drug requisition. Accessible by `patient` and `admin` roles.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the drug requisition to cancel.',
  })
  @ApiResponse({ status: 200, description: 'Drug requisition cancelled.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions — patient or admin role required.',
  })
  @ApiResponse({ status: 404, description: 'Drug requisition not found.' })
  removeDrugRequisition(@Param('id') id: string) {
    return this.orderService.removeDrugRequisition(id);
  }

  // ──────────────────────────────────────────────
  // Test Requisitions
  // ──────────────────────────────────────────────

  @Post('/test-requisitions')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Place a lab test requisition',
    description:
      'Submits a request for a lab test, typically ordered by a consultant on behalf of a patient. Accessible by `patient`, `consultant`, and `admin` roles.',
  })
  @ApiResponse({ status: 201, description: 'Test requisition placed.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  createTestRequisition(@Body() dto: CreateTestRequisitionDto) {
    return this.orderService.createTestRequisition(dto);
  }

  @Get('/test-requisitions')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.LAB, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'List lab test requisitions',
    description:
      'Returns a paginated list of test requisitions. Accessible by `patient`, `consultant`, `lab`, and `admin` roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of test requisitions.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  findAllTestRequisitions(@Query() query: PaginationDto) {
    return this.orderService.findAllTestRequisitions(query);
  }

  @Get('/test-requisitions/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.LAB, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Get a test requisition by ID',
    description:
      'Returns a single test requisition. Accessible by `patient`, `consultant`, `lab`, and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the test requisition.' })
  @ApiResponse({ status: 200, description: 'Test requisition found.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Test requisition not found.' })
  findOneTestRequisition(@Param('id') id: string) {
    return this.orderService.findOneTestRequisition(id);
  }

  @Patch('/test-requisitions/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.LAB, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Update a test requisition',
    description:
      'Updates a test requisition (e.g. result status or notes). Accessible by `patient`, `consultant`, `lab`, and `admin` roles.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the test requisition to update.',
  })
  @ApiResponse({ status: 200, description: 'Test requisition updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Test requisition not found.' })
  updateTestRequisition(
    @Param('id') id: string,
    @Body() dto: UpdateTestRequisitionDto,
  ) {
    return this.orderService.updateTestRequisition(id, dto);
  }

  @Delete('/test-requisitions/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Cancel a test requisition',
    description:
      'Cancels a pending test requisition. Accessible by `patient`, `consultant`, and `admin` roles.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the test requisition to cancel.',
  })
  @ApiResponse({ status: 200, description: 'Test requisition cancelled.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Test requisition not found.' })
  removeTestRequisition(@Param('id') id: string) {
    return this.orderService.removeTestRequisition(id);
  }
}
