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
  create(@Payload() createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.create(createDoctorDto);
  }

  @MessagePattern(DoctorPatterns.FIND_ALL)
  findAll(@Payload() query: PaginationDto) {
    return this.doctorsService.findAll(query);
  }

  @MessagePattern('findOneDoctor')
  findOne(@Payload() id: string) {
    return this.doctorsService.findOne(id);
  }

  @MessagePattern(DoctorPatterns.RETRIEVE)
  retrieve(@Payload() id: string) {
    return this.doctorsService.findOne(id);
  }

  @MessagePattern(DoctorPatterns.UPDATE)
  async update(@Payload() updateDoctorDto: UpdateDoctorDto) {
    return await this.doctorsService.update(
      updateDoctorDto.id,
      updateDoctorDto,
    );
  }

  @MessagePattern('removeDoctor')
  remove(@Payload() id: string) {
    return this.doctorsService.remove(id);
  }
}
