import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AdminService } from './admin.service';
import {
  AdminPatterns,
  CreateAdminDto,
  PaginationDto,
  SettingsDto,
  UpdateAdminDto,
} from '@medicpadi-backend/contracts';

@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @MessagePattern(AdminPatterns.CREATE)
  create(@Payload('data') createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  @MessagePattern(AdminPatterns.FIND_ALL)
  findAll(@Payload('data') query: PaginationDto) {
    return this.adminService.findAll(query);
  }

  @MessagePattern('findOneAdmin')
  findOne(@Payload('data') id: string) {
    return this.adminService.findOne(id);
  }

  @MessagePattern(AdminPatterns.RETRIEVE)
  retrieve(@Payload('data') id: string) {
    return this.adminService.findOne(id);
  }

  @MessagePattern(AdminPatterns.UPDATE)
  async update(@Payload('data') updateAdminDto: UpdateAdminDto) {
    return await this.adminService.update(updateAdminDto.id, updateAdminDto);
  }

  @MessagePattern(AdminPatterns.UPDATE_SETTINGS)
  async updateSettings(@Payload('data') data: SettingsDto & { id: string }) {
    const { id, ...settings } = data;
    return this.adminService.updateSettings(id, settings);
  }

  @MessagePattern('removeAdmin')
  remove(@Payload('data') id: string) {
    return this.adminService.remove(id);
  }
}
