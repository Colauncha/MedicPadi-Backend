import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto, UpdateDoctorDto } from '@medicpadi-backend/contracts';

@Controller()
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @MessagePattern('createDoctor')
  create(@Payload() createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.create(createDoctorDto);
  }

  @MessagePattern('findAllDoctors')
  findAll() {
    return this.doctorsService.findAll();
  }

  @MessagePattern('findOneDoctor')
  findOne(@Payload() id: number) {
    return this.doctorsService.findOne(id);
  }

  @MessagePattern('updateDoctor')
  update(@Payload() updateDoctorDto: UpdateDoctorDto) {
    return this.doctorsService.update(updateDoctorDto.id, updateDoctorDto);
  }

  @MessagePattern('removeDoctor')
  remove(@Payload() id: number) {
    return this.doctorsService.remove(id);
  }
}
