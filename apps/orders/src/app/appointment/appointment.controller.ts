import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateAppointmentDto,
  OrderPatterns,
  PaginationDto,
  UpdateAppointmentDto,
} from '@medicpadi-backend/contracts';
import { AppointmentService } from './appointment.service';

@Controller()
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @MessagePattern(OrderPatterns.APPOINTMENTS.CREATE)
  create(@Payload() dto: CreateAppointmentDto) {
    return this.appointmentService.create(dto);
  }

  @MessagePattern(OrderPatterns.APPOINTMENTS.FIND_ALL)
  findAll(@Payload() query: PaginationDto) {
    return this.appointmentService.findAll(query);
  }

  @MessagePattern(OrderPatterns.APPOINTMENTS.RETRIEVE)
  findOne(@Payload() id: string) {
    return this.appointmentService.findOne(id);
  }

  @MessagePattern(OrderPatterns.APPOINTMENTS.UPDATE)
  update(@Payload() dto: UpdateAppointmentDto) {
    return this.appointmentService.update(dto.id, dto);
  }

  @MessagePattern(OrderPatterns.APPOINTMENTS.DELETE)
  remove(@Payload() id: string) {
    return this.appointmentService.remove(id);
  }
}