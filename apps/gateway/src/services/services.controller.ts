import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import {
  AuthRole,
  CreateLabTestDto,
  CreatePharmacyDrugDto,
  PaginationDto,
  UpdateLabTestDto,
  UpdatePharmacyDrugDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
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

@ApiTags('Services')
@ApiBearerAuth('access-token')
@Controller('services')
@UseGuards(AuthGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // ──────────────────────────────────────────────
  // Lab Tests
  // ──────────────────────────────────────────────

  @Post('/lab/tests')
  @Roles(AuthRole.LAB, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Create a lab test offering',
    description: 'Registers a new test that the authenticated laboratory offers. Accessible by `lab` and `admin` roles.',
  })
  @ApiResponse({ status: 201, description: 'Lab test created.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — lab or admin role required.' })
  createLabTests(
    @Body() createLabTestDto: CreateLabTestDto,
    @Req() request: RequestWithUser,
  ) {
    return this.servicesService.createLabTest({
      ...createLabTestDto,
      user_id: request.user.id,
    });
  }

  @Get('/lab/tests')
  @Roles(AuthRole.LAB, AuthRole.ADMIN, AuthRole.CONSULTANT, AuthRole.PATIENT)
  @ApiOperation({
    summary: 'List all lab tests',
    description: 'Returns a paginated list of available lab tests. Accessible by `lab`, `admin`, `consultant`, and `patient` roles.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of lab tests.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  findAllLabTests(@Query() query: PaginationDto) {
    return this.servicesService.findAllLabTests(query);
  }

  @Get('/lab/tests/:id')
  @Roles(AuthRole.LAB, AuthRole.ADMIN, AuthRole.CONSULTANT, AuthRole.PATIENT)
  @ApiOperation({
    summary: 'Get a lab test by ID',
    description: 'Returns a single lab test record. Accessible by `lab`, `admin`, `consultant`, and `patient` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the lab test.' })
  @ApiResponse({ status: 200, description: 'Lab test found.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Lab test not found.' })
  findOneLabTest(@Param('id') id: string) {
    return this.servicesService.findOneLabTest(id);
  }

  @Patch('/lab/tests/:id')
  @Roles(AuthRole.LAB, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Update a lab test',
    description: 'Updates details of an existing lab test. Accessible by `lab` and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the lab test to update.' })
  @ApiResponse({ status: 200, description: 'Lab test updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — lab or admin role required.' })
  @ApiResponse({ status: 404, description: 'Lab test not found.' })
  updateLabTest(
    @Param('id') id: string,
    @Body() updateLabTestDto: UpdateLabTestDto,
  ) {
    return this.servicesService.updateLabTest(id, updateLabTestDto);
  }

  @Delete('/lab/tests/:id')
  @Roles(AuthRole.LAB, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Delete a lab test',
    description: 'Removes a lab test offering. Accessible by `lab` and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the lab test to delete.' })
  @ApiResponse({ status: 200, description: 'Lab test deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — lab or admin role required.' })
  @ApiResponse({ status: 404, description: 'Lab test not found.' })
  removeLabTest(@Param('id') id: string) {
    return this.servicesService.removeLabTest(id);
  }

  // ──────────────────────────────────────────────
  // Pharmacy Drugs
  // ──────────────────────────────────────────────

  @Post('/pharmacy/drugs')
  @Roles(AuthRole.PHARMACY, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Add a drug to the pharmacy catalogue',
    description: 'Registers a new drug available at the authenticated pharmacy. Accessible by `pharmacy` and `admin` roles.',
  })
  @ApiResponse({ status: 201, description: 'Drug created.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — pharmacy or admin role required.' })
  createPharmacyDrugs(
    @Body() createPharmacyDrugDto: CreatePharmacyDrugDto,
    @Req() request: RequestWithUser,
  ) {
    return this.servicesService.createPharmacyDrug({
      ...createPharmacyDrugDto,
      user_id: request.user.id,
    });
  }

  @Get('/pharmacy/drugs')
  @Roles(
    AuthRole.PHARMACY,
    AuthRole.ADMIN,
    AuthRole.CONSULTANT,
    AuthRole.PATIENT,
  )
  @ApiOperation({
    summary: 'List all pharmacy drugs',
    description: 'Returns a paginated list of drugs across all pharmacies. Accessible by `pharmacy`, `admin`, `consultant`, and `patient` roles.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of drugs.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  findAllPharmacyDrugs(@Query() query: PaginationDto) {
    return this.servicesService.findAllPharmacyDrugs(query);
  }

  @Get('/pharmacy/drugs/:id')
  @Roles(
    AuthRole.PHARMACY,
    AuthRole.ADMIN,
    AuthRole.CONSULTANT,
    AuthRole.PATIENT,
  )
  @ApiOperation({
    summary: 'Get a pharmacy drug by ID',
    description: 'Returns a single drug record. Accessible by `pharmacy`, `admin`, `consultant`, and `patient` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the drug.' })
  @ApiResponse({ status: 200, description: 'Drug found.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Drug not found.' })
  findOnePharmacyDrug(@Param('id') id: string) {
    return this.servicesService.findOnePharmacyDrug(id);
  }

  @Patch('/pharmacy/drugs/:id')
  @Roles(AuthRole.PHARMACY, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Update a pharmacy drug',
    description: 'Updates details of an existing drug in the pharmacy catalogue. Accessible by `pharmacy` and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the drug to update.' })
  @ApiResponse({ status: 200, description: 'Drug updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — pharmacy or admin role required.' })
  @ApiResponse({ status: 404, description: 'Drug not found.' })
  updatePharmacyDrug(
    @Param('id') id: string,
    @Body() updatePharmacyDrugDto: UpdatePharmacyDrugDto,
  ) {
    return this.servicesService.updatePharmacyDrug(id, updatePharmacyDrugDto);
  }

  @Delete('/pharmacy/drugs/:id')
  @Roles(AuthRole.PHARMACY, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Remove a pharmacy drug',
    description: 'Removes a drug from the pharmacy catalogue. Accessible by `pharmacy` and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the drug to remove.' })
  @ApiResponse({ status: 200, description: 'Drug removed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — pharmacy or admin role required.' })
  @ApiResponse({ status: 404, description: 'Drug not found.' })
  removePharmacyDrug(@Param('id') id: string) {
    return this.servicesService.removePharmacyDrug(id);
  }

  // ──────────────────────────────────────────────
  // Departments
  // ──────────────────────────────────────────────

  @Post('/lab/departments')
  @Roles(AuthRole.LAB, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Create a department',
    description:
      'Creates a new department for the authenticated laboratory. Accessible by `lab` and `admin` roles.',
  })
  @ApiResponse({ status: 201, description: 'Department created.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — lab or admin role required.' })
  createDepartment(
    @Body() dto: CreateDepartmentDto,
    @Req() request: RequestWithUser,
  ) {
    return this.servicesService.createDepartment({
      ...dto,
      user_id: request.user.id,
    });
  }

  @Get('/lab/departments')
  @Roles(AuthRole.LAB, AuthRole.ADMIN, AuthRole.CONSULTANT, AuthRole.PATIENT)
  @ApiOperation({
    summary: 'List departments',
    description:
      'Returns a paginated list of lab departments. Accessible by `lab`, `admin`, `consultant`, and `patient` roles.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of departments.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  findAllDepartments(@Query() query: PaginationDto) {
    return this.servicesService.findAllDepartments(query);
  }

  @Get('/lab/departments/:id')
  @Roles(AuthRole.LAB, AuthRole.ADMIN, AuthRole.CONSULTANT, AuthRole.PATIENT)
  @ApiOperation({
    summary: 'Get a department by ID',
    description:
      'Returns a single department. Accessible by `lab`, `admin`, `consultant`, and `patient` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the department.' })
  @ApiResponse({ status: 200, description: 'Department found.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Department not found.' })
  findOneDepartment(@Param('id') id: string) {
    return this.servicesService.findOneDepartment(id);
  }

  @Patch('/lab/departments/:id')
  @Roles(AuthRole.LAB, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Update a department',
    description:
      'Updates an existing department. Accessible by `lab` and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the department to update.' })
  @ApiResponse({ status: 200, description: 'Department updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — lab or admin role required.' })
  @ApiResponse({ status: 404, description: 'Department not found.' })
  updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.servicesService.updateDepartment(id, dto);
  }

  @Delete('/lab/departments/:id')
  @Roles(AuthRole.LAB, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Delete a department',
    description:
      'Removes a department. Will fail if lab tests are still assigned to it. Accessible by `lab` and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the department to delete.' })
  @ApiResponse({ status: 200, description: 'Department deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — lab or admin role required.' })
  @ApiResponse({ status: 404, description: 'Department not found.' })
  removeDepartment(@Param('id') id: string) {
    return this.servicesService.removeDepartment(id);
  }
}
