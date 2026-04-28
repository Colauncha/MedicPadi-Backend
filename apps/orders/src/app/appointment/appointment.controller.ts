import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from '../../../../../contracts/src/lib/dtos/orders/appointments/create-appointment.dto';
import { UpdateAppointmentDto } from '../../../../../contracts/src/lib/dtos/orders/appointments/update-appointment.dto';

@Controller()
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @MessagePattern('createAppointment')
  create(@Payload() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentService.create(createAppointmentDto);
  }

  @MessagePattern('findAllAppointment')
  findAll() {
    return this.appointmentService.findAll();
  }

  @MessagePattern('findOneAppointment')
  findOne(@Payload() id: number) {
    return this.appointmentService.findOne(id);
  }

  @MessagePattern('updateAppointment')
  update(@Payload() updateAppointmentDto: UpdateAppointmentDto) {
    return this.appointmentService.update(
      updateAppointmentDto.id,
      updateAppointmentDto,
    );
  }

  @MessagePattern('removeAppointment')
  remove(@Payload() id: number) {
    return this.appointmentService.remove(id);
  }
}
