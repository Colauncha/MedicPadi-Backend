import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  AppointmentStatus,
  CreateAppointmentDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdateAppointmentDto,
} from '@medicpadi-backend/contracts';
import { Appointment } from '../../entities/appointment.entity';
import { ZoomService } from './providers/zoom.service';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @Inject() private readonly zoomService: ZoomService,
  ) {}

  async create(dto: CreateAppointmentDto) {
    try {
      const appointmentTime =
        typeof dto.appointment_time === 'string'
          ? new Date(dto.appointment_time)
          : dto.appointment_time || new Date(0);

      const existing = await this.appointmentRepo.findOne({
        where: {
          provider_id: dto.provider_id || '',
          patient_id: dto.patient_id || '',
          appointment_time: appointmentTime,
        },
      });

      if (existing) {
        throw new RpcException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Appointment already exists',
        } as ServiceError);
      }

      const meeting = await this.zoomService.createMeeting(
        `Appointment between ${dto.patient_id} and ${dto.provider_id}`,
        appointmentTime.toISOString(),
      );

      if (meeting) {
        dto.meeting_link = meeting.start_url;
        dto.meeting_id = meeting.meeting_id;
        dto.join_link = meeting.join_url;
      }

      const appointment = this.appointmentRepo.create({ ...dto });
      this.appointmentRepo.save(appointment);

      // Call transactions service to deduct funds from patient
      // ...

      return appointment;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create appointment',
      } as ServiceError);
    }
  }

  async findAll(
    query: PaginationDto,
  ): Promise<PaginationResponseDto<Appointment>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const response: PaginationResponseDto<Appointment> = {
      data: [],
      total: 0,
      page,
      limit,
    };
    try {
      const result = await this.appointmentRepo.findAndCount({
        where: query.id
          ? [{ patient_id: query.id }, { provider_id: query.id }]
          : {},
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: 'DESC' },
      });
      response.data = result[0];
      response.total = result[1];
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get appointments',
      } as ServiceError);
    }
    return response;
  }

  async findOne(id: string) {
    try {
      return await this.appointmentRepo.findOne({ where: { id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get appointment',
      } as ServiceError);
    }
  }

  async update(id: string | undefined, dto: UpdateAppointmentDto) {
    try {
      const existing = await this.appointmentRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Appointment not found',
        } as ServiceError);
      }
      const result = await this.appointmentRepo.update({ id }, dto);
      return result.raw;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to update appointment',
          } as ServiceError);
    }
  }

  async accept(id: string) {
    try {
      let existing = await this.appointmentRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Appointment not found',
        } as ServiceError);
      }
      existing.status = AppointmentStatus.CONFIRMED;
      await this.appointmentRepo.save(existing);
      return existing;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to accept appointment',
          } as ServiceError);
    }
  }

  async remove(id: string) {
    try {
      let existing = await this.findOne(id);
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Appointment not found',
        } as ServiceError);
      }
      await this.appointmentRepo.remove(existing);
      return { message: 'Appointment removed successfully' };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to remove appointment',
          } as ServiceError);
    }
  }
}
