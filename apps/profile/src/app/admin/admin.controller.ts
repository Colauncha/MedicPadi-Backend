import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AdminService } from './admin.service';
import {
  AdminPatterns,
  CreateAdminDto,
  UpdateAdminDto,
} from '@medicpadi-backend/contracts';

@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @MessagePattern(AdminPatterns.CREATE)
  create(@Payload() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  @MessagePattern('findAllAdmin')
  findAll() {
    return this.adminService.findAll();
  }

  @MessagePattern('findOneAdmin')
  findOne(@Payload() id: string) {
    return this.adminService.findOne(id);
  }

  @MessagePattern(AdminPatterns.UPDATE)
  async update(@Payload() updateAdminDto: UpdateAdminDto) {
    return await this.adminService.update(updateAdminDto.id, updateAdminDto);
  }

  @MessagePattern('removeAdmin')
  remove(@Payload() id: string) {
    return this.adminService.remove(id);
  }
}
