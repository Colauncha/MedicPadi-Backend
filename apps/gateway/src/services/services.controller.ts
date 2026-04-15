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
} from '@medicpadi-backend/contracts';
import { AuthGuard, RequestWithUser } from '../guards/auth/auth.guard';
import { Roles } from '../guards/decorators/roles.decorator';

@Controller('services')
@UseGuards(AuthGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  ////////////////////////////////////////////////////
  // LabTest endpoints //////////////////////////////
  //////////////////////////////////////////////////
  @Post('/lab/tests')
  @Roles(AuthRole.LAB, AuthRole.ADMIN)
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
  findAllLabTests(@Query() query: PaginationDto) {
    return this.servicesService.findAllLabTests(query);
  }

  @Get('/lab/tests/:id')
  @Roles(AuthRole.LAB, AuthRole.ADMIN, AuthRole.CONSULTANT, AuthRole.PATIENT)
  findOneLabTest(@Param('id') id: string) {
    return this.servicesService.findOneLabTest(id);
  }

  @Patch('/lab/tests/:id')
  @Roles(AuthRole.LAB, AuthRole.ADMIN)
  updateLabTest(
    @Param('id') id: string,
    @Body() updateLabTestDto: UpdateLabTestDto,
  ) {
    return this.servicesService.updateLabTest(id, updateLabTestDto);
  }

  @Delete('/lab/tests/:id')
  @Roles(AuthRole.LAB, AuthRole.ADMIN)
  removeLabTest(@Param('id') id: string) {
    return this.servicesService.removeLabTest(id);
  }

  /////////////////////////////////////////////////////////////
  // Pharmacy Drugs endpoints (to be implemented) ////////////
  ///////////////////////////////////////////////////////////
  @Post('/pharmacy/drugs')
  @Roles(AuthRole.PHARMACY, AuthRole.ADMIN)
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
  findOnePharmacyDrug(@Param('id') id: string) {
    return this.servicesService.findOnePharmacyDrug(id);
  }

  @Patch('/pharmacy/drugs/:id')
  @Roles(AuthRole.PHARMACY, AuthRole.ADMIN)
  updatePharmacyDrug(
    @Param('id') id: string,
    @Body() updatePharmacyDrugDto: UpdatePharmacyDrugDto,
  ) {
    return this.servicesService.updatePharmacyDrug(id, updatePharmacyDrugDto);
  }

  @Delete('/pharmacy/drugs/:id')
  @Roles(AuthRole.PHARMACY, AuthRole.ADMIN)
  removePharmacyDrug(@Param('id') id: string) {
    return this.servicesService.removePharmacyDrug(id);
  }
}
