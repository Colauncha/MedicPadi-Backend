import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PatientService } from './patient.service';
import {
  CreatePatientDto,
  UpdatePatientDto,
  PatientPatterns,
  DoctorPatterns,
  PaginationDto,
} from '@medicpadi-backend/contracts';

@Controller()
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @MessagePattern(PatientPatterns.CREATE)
  create(@Payload() createPatientDto: CreatePatientDto) {
    return this.patientService.create(createPatientDto);
  }

  @MessagePattern(PatientPatterns.FIND_ALL)
  findAll(@Payload() query: PaginationDto) {
    return this.patientService.findAll(query);
  }

  @MessagePattern('findOnePatient')
  findOne(@Payload() id: string) {
    return this.patientService.findOne(id);
  }

  @MessagePattern(PatientPatterns.RETRIEVE)
  retrieve(@Payload() id: string) {
    return this.patientService.findOne(id);
  }

  @MessagePattern(PatientPatterns.UPDATE)
  async update(@Payload() updatePatientDto: UpdatePatientDto) {
    return this.patientService.update(updatePatientDto.id, updatePatientDto);
  }

  @MessagePattern('removePatient')
  remove(@Payload() id: string) {
    return this.patientService.remove(id);
  }
}
