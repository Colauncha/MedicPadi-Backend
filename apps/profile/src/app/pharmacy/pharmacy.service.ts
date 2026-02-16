import { Injectable } from '@nestjs/common';
import {
  CreatePharmacyDto,
  UpdatePharmacyDto,
} from '@medicpadi-backend/contracts';

@Injectable()
export class PharmacyService {
  create(createPharmacyDto: CreatePharmacyDto) {
    return createPharmacyDto;
  }

  findAll() {
    return `This action returns all pharmacy`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pharmacy`;
  }

  update(id: number, updatePharmacyDto: UpdatePharmacyDto) {
    return `This action updates a #${id} pharmacy`;
  }

  remove(id: number) {
    return `This action removes a #${id} pharmacy`;
  }
}
