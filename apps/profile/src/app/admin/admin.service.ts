import { Injectable } from '@nestjs/common';
import { CreateAdminDto, UpdateAdminDto } from '@medicpadi-backend/contracts';

@Injectable()
export class AdminService {
  create(createAdminDto: CreateAdminDto) {
    return createAdminDto;
  }

  findAll() {
    return `This action returns all admin`;
  }

  findOne(id: number) {
    return `This action returns a #${id} admin`;
  }

  update(id: number, updateAdminDto: UpdateAdminDto) {
    return updateAdminDto;
  }

  remove(id: number) {
    return `This action removes a #${id} admin`;
  }
}
