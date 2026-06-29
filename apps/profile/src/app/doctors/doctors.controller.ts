import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DoctorsService } from './doctors.service';
import {
  AdminPatterns,
  BusinessHoursDto,
  CreateDoctorDto,
  DoctorPatterns,
  EducationItemDto,
  DoctorQueryDto,
  SettingsDto,
  UpdateDoctorDto,
  UpdateDoctorEducationDto,
} from '@medicpadi-backend/contracts';

@Controller()
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @MessagePattern(DoctorPatterns.CREATE)
  create(@Payload('data') createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.create(createDoctorDto);
  }

  @MessagePattern(DoctorPatterns.FIND_ALL)
  findAll(@Payload('data') query: DoctorQueryDto) {
    return this.doctorsService.findAll(query);
  }

  @MessagePattern('findOneDoctor')
  findOne(@Payload('data') id: string) {
    return this.doctorsService.findOne(id);
  }

  @MessagePattern(DoctorPatterns.RETRIEVE)
  retrieve(@Payload('data') id: string) {
    return this.doctorsService.findOne(id);
  }

  @MessagePattern(DoctorPatterns.UPDATE)
  async update(@Payload('data') updateDoctorDto: UpdateDoctorDto) {
    return await this.doctorsService.update(
      updateDoctorDto.id,
      updateDoctorDto,
    );
  }

  @MessagePattern(DoctorPatterns.UPDATE_BUSINESS_HOURS)
  async updateBusinessHours(
    @Payload('data') businessHoursDto: BusinessHoursDto & { id: string },
  ) {
    return await this.doctorsService.updateBusinessHours(
      businessHoursDto.id,
      businessHoursDto,
    );
  }

  @MessagePattern(DoctorPatterns.UPDATE_EDUCATION)
  async updateEducation(
    @Payload('data') data: UpdateDoctorEducationDto & { id: string },
  ) {
    const { id, education } = data;
    return this.doctorsService.updateEducation(id, education);
  }

  @MessagePattern(DoctorPatterns.UPDATE_SETTINGS)
  async updateSettings(@Payload('data') data: SettingsDto & { id: string }) {
    const { id, ...settings } = data;
    return this.doctorsService.updateSettings(id, settings);
  }

  @MessagePattern('removeDoctor')
  remove(@Payload('data') id: string) {
    return this.doctorsService.remove(id);
  }
}
