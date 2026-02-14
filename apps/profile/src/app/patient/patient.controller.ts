import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Controller()
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @MessagePattern('createPatient')
  create(@Payload() createPatientDto: CreatePatientDto) {
    return this.patientService.create(createPatientDto);
  }

  @MessagePattern('findAllPatient')
  findAll() {
    return this.patientService.findAll();
  }

  @MessagePattern('findOnePatient')
  findOne(@Payload() id: number) {
    return this.patientService.findOne(id);
  }

  @MessagePattern('updatePatient')
  update(@Payload() updatePatientDto: UpdatePatientDto) {
    return this.patientService.update(updatePatientDto.id, updatePatientDto);
  }

  @MessagePattern('removePatient')
  remove(@Payload() id: number) {
    return this.patientService.remove(id);
  }
}
