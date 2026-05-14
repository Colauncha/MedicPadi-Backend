import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DoctorsService } from './doctors.service';
import {
  AdminPatterns,
  CreateDoctorDto,
  DoctorPatterns,
  PaginationDto,
  UpdateDoctorDto,
} from '@medicpadi-backend/contracts';

@Controller()
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @MessagePattern(DoctorPatterns.CREATE)
  create(@Payload('data') createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.create(createDoctorDto);
  }

  @MessagePattern(DoctorPatterns.FIND_ALL)
  findAll(@Payload('data') query: PaginationDto) {
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

  @MessagePattern('removeDoctor')
  remove(@Payload('data') id: string) {
    return this.doctorsService.remove(id);
  }
}
