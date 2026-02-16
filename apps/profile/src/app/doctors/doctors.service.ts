import { Injectable } from '@nestjs/common';
import { CreateDoctorDto, UpdateDoctorDto } from '@medicpadi-backend/contracts';

@Injectable()
export class DoctorsService {
  create(createDoctorDto: CreateDoctorDto) {
    return 'This action adds a new doctor';
  }

  findAll() {
    return `This action returns all doctors`;
  }

  findOne(id: number) {
    return `This action returns a #${id} doctor`;
  }

  update(id: number, updateDoctorDto: UpdateDoctorDto) {
    return `This action updates a #${id} doctor`;
  }

  remove(id: number) {
    return `This action removes a #${id} doctor`;
  }
}
