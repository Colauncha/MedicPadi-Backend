import { Injectable } from '@nestjs/common';
import { CreateAppointmentDto } from '../../../../../contracts/src/lib/dtos/orders/appointments/create-appointment.dto';
import { UpdateAppointmentDto } from '../../../../../contracts/src/lib/dtos/orders/appointments/update-appointment.dto';

@Injectable()
export class AppointmentService {
  create(createAppointmentDto: CreateAppointmentDto) {
    return 'This action adds a new appointment';
  }

  findAll() {
    return `This action returns all appointment`;
  }

  findOne(id: number) {
    return `This action returns a #${id} appointment`;
  }

  update(id: number, updateAppointmentDto: UpdateAppointmentDto) {
    return `This action updates a #${id} appointment`;
  }

  remove(id: number) {
    return `This action removes a #${id} appointment`;
  }
}
