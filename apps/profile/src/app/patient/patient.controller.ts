import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PatientService } from './patient.service';
import {
  CreatePatientDto,
  UpdatePatientDto,
  PatientPatterns,
  DoctorPatterns,
  PaginationDto,
  SettingsDto,
} from '@medicpadi-backend/contracts';

@Controller()
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @MessagePattern(PatientPatterns.CREATE)
  create(@Payload('data') createPatientDto: CreatePatientDto) {
    return this.patientService.create(createPatientDto);
  }

  @MessagePattern(PatientPatterns.FIND_ALL)
  findAll(@Payload('data') query: PaginationDto) {
    return this.patientService.findAll(query);
  }

  @MessagePattern('findOnePatient')
  findOne(@Payload('data') id: string) {
    return this.patientService.findOne(id);
  }

  @MessagePattern(PatientPatterns.RETRIEVE)
  retrieve(@Payload('data') id: string) {
    return this.patientService.findOne(id);
  }

  @MessagePattern(PatientPatterns.UPDATE)
  async update(@Payload('data') updatePatientDto: UpdatePatientDto) {
    return this.patientService.update(updatePatientDto.id, updatePatientDto);
  }

  @MessagePattern(PatientPatterns.UPDATE_SETTINGS)
  async updateSettings(@Payload('data') data: SettingsDto & { id: string }) {
    const { id, ...settings } = data;
    return this.patientService.updateSettings(id, settings);
  }

  @MessagePattern('removePatient')
  remove(@Payload('data') id: string) {
    return this.patientService.remove(id);
  }
}
