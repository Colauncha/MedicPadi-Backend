import { Injectable } from '@nestjs/common';
import {
  CreateLaboratoryDto,
  UpdateLaboratoryDto,
} from '@medicpadi-backend/contracts';

@Injectable()
export class LaboratoryService {
  create(createLaboratoryDto: CreateLaboratoryDto) {
    return createLaboratoryDto;
  }

  findAll() {
    return `This action returns all laboratory`;
  }

  findOne(id: number) {
    return `This action returns a #${id} laboratory`;
  }

  update(id: number, updateLaboratoryDto: UpdateLaboratoryDto) {
    return `This action updates a #${id} laboratory`;
  }

  remove(id: number) {
    return `This action removes a #${id} laboratory`;
  }
}
