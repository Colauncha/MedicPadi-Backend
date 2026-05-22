import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
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
  create(@Payload('data') dto: CreateAppointmentDto) {
    return this.appointmentService.create(dto);
  }

  @MessagePattern(OrderPatterns.APPOINTMENTS.FIND_ALL)
  findAll(@Payload('data') query: PaginationDto) {
    return this.appointmentService.findAll(query);
  }

  @MessagePattern(OrderPatterns.APPOINTMENTS.RETRIEVE)
  findOne(@Payload('data') id: string) {
    return this.appointmentService.findOne(id);
  }

  @MessagePattern(OrderPatterns.APPOINTMENTS.UPDATE)
  update(@Payload('data') dto: UpdateAppointmentDto) {
    return this.appointmentService.update(dto.id, dto);
  }

  @MessagePattern(OrderPatterns.APPOINTMENTS.ACCEPT)
  accept(@Payload('data') id: string) {
    return this.appointmentService.accept(id);
  }

  @EventPattern(OrderPatterns.APPOINTMENTS.COMPLETE_PAYMENT)
  completePayment(@Payload('data') id: string) {
    return this.appointmentService.completePayment(id);
  }

  @MessagePattern(OrderPatterns.APPOINTMENTS.DELETE)
  remove(@Payload('data') id: string) {
    return this.appointmentService.remove(id);
  }
}