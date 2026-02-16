import { Injectable } from '@nestjs/common';
import {
  CreatePatientDto,
  UpdatePatientDto,
} from '@medicpadi-backend/contracts';

@Injectable()
export class PatientService {
  create(createPatientDto: CreatePatientDto) {
    return createPatientDto;
  }

  findAll() {
    return `This action returns all patient`;
  }

  findOne(id: number) {
    return `This action returns a #${id} patient`;
  }

  update(id: number, updatePatientDto: UpdatePatientDto) {
    return updatePatientDto;
  }

  remove(id: number) {
    return `This action removes a #${id} patient`;
  }
}
