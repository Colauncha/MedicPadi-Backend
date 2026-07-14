import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsOrderValue, FindOptionsWhere, Repository } from 'typeorm';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
  AppointmentCancelledEventDto,
  AppointmentConfirmedEventDto,
  AppointmentCreatedEventDto,
  AppointmentPaymentConfirmedEventDto,
  AppointmentQueryDto,
  AppointmentStatus,
  AuthPatterns,
  CreateAppointmentDto,
  DoctorPatterns,
  NotificationEvents,
  PatientPatterns,
  PaginationResponseDto,
  ServiceError,
  UpdateAppointmentDto,
  CreateTransactionDto,
  TransactionSourceType,
  PaymentGateway,
  PaystackInitializeResponse,
  AppointmentPaymentStatus,
  TransactionPatterns,
  AuthRole,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse, withServiceAuth, logError } from '@medicpadi-backend/utils';
import { Appointment } from '../../entities/appointment.entity';
import { ZoomService } from './providers/zoom.service';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AppointmentService {
  private logger = new Logger(AppointmentService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    @Inject() private readonly zoomService: ZoomService,
    @Inject('PROFILE_SERVICE') private readonly profileClient: ClientProxy,
    @Inject('TRANSACTIONS_SERVICE')
    private readonly transactionsClient: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>(
      'appConfig.internalServiceToken',
    );
  }

  private get sdkCredentials(): Record<string, string> {
    let sdkKey = this.configService.getOrThrow<string>(
      'zoomConfig.sdkClientId',
    );
    let sdkSecret = this.configService.getOrThrow<string>(
      'zoomConfig.sdkClientSecret',
    );
    return {
      sdkKey,
      sdkSecret,
    };
  }

  private get serverUrls(): { frontend: string; backend: string } {
    return {
      frontend:
        this.configService.get<string>('appConfig.frontendUrl') ||
        'https://medicpadi.com',
      backend:
        this.configService.get<string>('appConfig.backendUrl') ||
        'http://localhost:3000/api',
    };
  }

  async create(dto: CreateAppointmentDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let zoomMeetingId: number | undefined;

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

      const token = this.serviceToken;
      const [doctor, patient] = await Promise.all([
        firstValueFrom(
          this.profileClient.send(
            DoctorPatterns.RETRIEVE,
            withServiceAuth(dto.provider_id, token),
          ),
        ),
        firstValueFrom(
          this.profileClient.send(
            PatientPatterns.RETRIEVE,
            withServiceAuth(dto.patient_id, token),
          ),
        ),
      ]);

      const meeting = await this.zoomService.createMeeting(
        `Appointment between ${dto.patient_id} and ${dto.provider_id}`,
        appointmentTime.toISOString(),
        doctor.sessionLength * dto.sessions,
      );

      if (!meeting) {
        throw new RpcException({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Unable to create Zoom meeting',
        } as ServiceError);
      }

      zoomMeetingId = meeting.meeting_id;

      type ZoomResponse = {
        meeting_id: number;
        meeting_link: string;
        join_link: string;
        meeting_password: string;
      };
      type AppointmentDataType = CreateAppointmentDto & ZoomResponse;
      const appointmentData: AppointmentDataType = {
        ...dto,
        meeting_password: meeting.meeting_password,
        meeting_id: meeting.meeting_id,
        meeting_link: meeting.start_url,
        join_link: meeting.join_url,
        sessionCost: doctor.costPerSession * dto.sessions,
        sessionLen: doctor.sessionLength || 30,
      };
      const appointment = queryRunner.manager.create(Appointment, {
        ...appointmentData,
      });
      const savedAppointment = await queryRunner.manager.save(appointment);

      await queryRunner.commitTransaction();

      const eventDto: AppointmentCreatedEventDto = {
        appointmentId: savedAppointment.id,
        patientId: dto.patient_id || '',
        doctorId: dto.provider_id || '',
        appointmentTime: appointmentTime.toISOString(),
        acceptLink: `${this.serverUrls.backend}/orders/appointments/${savedAppointment.id}/accept`,
      };
      this.notificationClient.emit(
        NotificationEvents.APPOINTMENT_CREATED,
        withServiceAuth(eventDto, token),
      );

      const { join_link, meeting_id, meeting_link, meeting_password, ...rest } =
        savedAppointment;
      return rest;
    } catch (error) {
      logError(error, `${AppointmentService.name}.create`);
      await queryRunner.rollbackTransaction();
      if (zoomMeetingId) {
        await this.zoomService.deleteMeeting(zoomMeetingId).catch(() => {});
      }
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Unable to create appointment',
            error: error instanceof Error ? error.message : String(error),
          } as ServiceError);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    query: AppointmentQueryDto,
  ): Promise<PaginationResponseDto<Appointment>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { id, order, status, paymentStatus, appointmentTime } = query;

    const baseFilter: FindOptionsWhere<Appointment> = {};
    if (status) baseFilter.status = status;
    if (paymentStatus) baseFilter.paymentStatus = paymentStatus;
    if (appointmentTime) baseFilter.appointment_time = appointmentTime;

    const where:
      | FindOptionsWhere<Appointment>
      | FindOptionsWhere<Appointment>[] = id
      ? [
          { ...baseFilter, patient_id: id },
          { ...baseFilter, provider_id: id },
        ]
      : baseFilter;

    try {
      const [data, total] = await this.appointmentRepo.findAndCount({
        where,
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: (order || 'DESC') as FindOptionsOrderValue },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      logError(error, `${AppointmentService.name}.findAll`);
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get appointments',
      } as ServiceError);
    }
  }

  async findOne(id: string) {
    try {
      let appointment = await this.appointmentRepo.findOne({ where: { id } });
      if (!appointment) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Appointment not found',
        } as ServiceError);
      }
      if (
        appointment.status === AppointmentStatus.CONFIRMED &&
        appointment.paymentStatus === AppointmentPaymentStatus.P_PENDING
      ) {
        const token = this.serviceToken;
        const transaction = await firstValueFrom(
          this.transactionsClient.send(
            TransactionPatterns.TRANSACTIONS.FIND_BY_ORDER_ID,
            withServiceAuth(appointment.id, token),
          ),
        );
        const { meeting_link, join_link, meeting_id, ...rest } = appointment;
        let gatewayUrl =
          transaction.gateway === PaymentGateway.PAYSTACK
            ? 'https://checkout.paystack.com'
            : '';
        return {
          authorization_url: `${gatewayUrl}/${transaction.access_code}`,
          reference: transaction.gateway_reference,
          access_code: transaction.access_code,
          total_amount: transaction.amount,
          currency: transaction.currency,
          ...rest,
        };
      } else if (appointment.status === AppointmentStatus.PENDING) {
        const { meeting_link, join_link, meeting_id, ...rest } = appointment;
        return rest;
      }
      return appointment;
    } catch (error) {
      logError(error, `${AppointmentService.name}.findOne`);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get appointment',
        error: error instanceof Error ? error.message : String(error),
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

      if (existing.meeting_id) {
        await this.zoomService.updateMeeting(
          existing.meeting_id,
          dto.topic,
          dto.appointment_time instanceof Date
            ? dto.appointment_time.toISOString()
            : undefined,
        );
      }

      const result = await this.appointmentRepo.update({ id }, dto);
      return result.raw;
    } catch (error) {
      logError(error, `${AppointmentService.name}.update`);
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
      const existing = await this.appointmentRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Appointment not found',
        } as ServiceError);
      }
      if (existing.status === AppointmentStatus.CONFIRMED) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Appointment accepted already.',
        } as ServiceError);
      }
      existing.status = AppointmentStatus.CONFIRMED;
      await this.appointmentRepo.save(existing);

      const transactionDto: CreateTransactionDto = {
        user_id: existing.patient_id || '',
        source_type: TransactionSourceType.APPOINTMENT,
        source_id: existing.id,
        provider_id: existing.provider_id,
        amount: existing.sessionCost || 0,
        gateway: PaymentGateway.PAYSTACK,
      };

      const token = this.serviceToken;
      const initTransaction: PaystackInitializeResponse = await firstValueFrom(
        this.transactionsClient.send(
          TransactionPatterns.TRANSACTIONS.CREATE,
          withServiceAuth(transactionDto, token),
        ),
      );

      const eventDto: AppointmentConfirmedEventDto = {
        appointmentId: existing.id,
        patientId: existing.patient_id || '',
        doctorId: existing.provider_id || '',
        appointmentTime: existing.appointment_time?.toISOString() ?? '',
        paymentLink: initTransaction.data.authorization_url,
      };
      this.notificationClient.emit(
        NotificationEvents.APPOINTMENT_CONFIRMED,
        withServiceAuth(eventDto, token),
      );

      return existing;
    } catch (error) {
      logError(error, `${AppointmentService.name}.accept`);
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to accept appointment',
            error: error instanceof Error ? error.message : String(error),
          } as ServiceError);
    }
  }

  async completePayment(id: string) {
    try {
      const existing = await this.appointmentRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Appointment not found',
        } as ServiceError);
      }
      existing.paymentStatus = AppointmentPaymentStatus.P_CONFIRMED;
      await this.appointmentRepo.save(existing);

      const token = this.serviceToken;
      const eventDto: AppointmentPaymentConfirmedEventDto = {
        appointmentId: existing.id,
        patientId: existing.patient_id || '',
        doctorId: existing.provider_id || '',
        appointmentTime: existing.appointment_time?.toISOString() ?? '',
        joinLink: existing.join_link || undefined,
        meetingLink: existing.meeting_link || undefined,
      };
      this.notificationClient.emit(
        NotificationEvents.APPOINTMENT_PAYMENT_CONFIRMED,
        withServiceAuth(eventDto, token),
      );
    } catch (error) {
      logError(error, `${AppointmentService.name}.completePayment`);
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to complete appointment payment',
            error: error instanceof Error ? error.message : String(error),
          } as ServiceError);
    }
  }

  async getSignature(id: string, role: AuthRole) {
    try {
      const existing = await this.appointmentRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Appointment not found',
        } as ServiceError);
      }
      if (!existing.meeting_id) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'No Zoom meeting exists for this appointment',
        } as ServiceError);
      }
      const now = Date.now();
      const apptTimestamp =
        existing.appointment_time instanceof Date
          ? existing.appointment_time.getTime()
          : Number(existing.appointment_time);
      const sessionLenMs =
        typeof existing.sessionLen === 'number' ? existing.sessionLen : 30;
      const elapsedAppointmentTime = apptTimestamp + sessionLenMs * 1000 * 60;

      if (now >= elapsedAppointmentTime) {
        // Reschedule or refund
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Appointed time elapsed, reschedule or request a refund',
        } as ServiceError);
      }

      const iat = Math.round(Date.now() / 1000) - 30;
      const exp = iat + 60 * 60 * 2;

      const { sdkKey, sdkSecret } = this.sdkCredentials;
      const payload = {
        appKey: sdkKey,
        sdkKey: sdkKey,
        mn: existing.meeting_id,
        role: role === AuthRole.CONSULTANT ? 1 : 0, // 0 = attendee (patient), 1 = host (provider)
        iat: iat,
        exp: exp,
        tokenExp: exp,
      };

      const signature = this.jwtService.sign(payload, {
        secret: sdkSecret,
        algorithm: 'HS256',
      });
      return { signature };
    } catch (error) {
      logError(error, `${AppointmentService.name}.getSignature`);
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Unable to generate meeting signature',
            error: error instanceof Error ? error.message : String(error),
          } as ServiceError);
    }
  }

  async completeAppointment(id: string) {
    try {
      const existing = await this.appointmentRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Appointment not found',
        } as ServiceError);
      }
      if (existing.status === AppointmentStatus.COMPLETED) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Appointment already completed.',
        } as ServiceError);
      }
      existing.status = AppointmentStatus.COMPLETED;
      await this.appointmentRepo.save(existing);
    } catch (error) {
      logError(error, `${AppointmentService.name}.completeAppointment`);
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to complete appointment',
            error: error instanceof Error ? error.message : String(error),
          } as ServiceError);
    }
  }

  async cancel(id: string, reason: string) {
    try {
      const existing = await this.appointmentRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Appointment not found',
        } as ServiceError);
      }
      if (existing.meeting_id) {
        await this.zoomService.deleteMeeting(existing.meeting_id);
      }
      await this.appointmentRepo.update(
        { id },
        { status: AppointmentStatus.CANCELLED, doctorsNote: reason },
      );

      const token = this.serviceToken;
      const eventDto: AppointmentCancelledEventDto = {
        appointmentId: existing.id,
        patientId: existing.patient_id || '',
        appointmentTime: existing.appointment_time?.toISOString() ?? '',
        reason,
      };
      this.notificationClient.emit(
        NotificationEvents.APPOINTMENT_CANCELLED,
        withServiceAuth(eventDto, token),
      );

      return { message: 'Appointment removed successfully' };
    } catch (error) {
      logError(error, `${AppointmentService.name}.cancel`);
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to remove appointment',
          } as ServiceError);
    }
  }

  async remove(id: string) {
    try {
      const existing = await this.appointmentRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Appointment not found',
        } as ServiceError);
      }
      if (existing.meeting_id) {
        await this.zoomService.deleteMeeting(existing.meeting_id);
      }
      await this.appointmentRepo.remove(existing);

      const token = this.serviceToken;
      const eventDto: AppointmentCancelledEventDto = {
        appointmentId: existing.id,
        patientId: existing.patient_id || '',
        appointmentTime: existing.appointment_time?.toISOString() ?? '',
      };
      this.notificationClient.emit(
        NotificationEvents.APPOINTMENT_CANCELLED,
        withServiceAuth(eventDto, token),
      );

      return { message: 'Appointment removed successfully' };
    } catch (error) {
      logError(error, `${AppointmentService.name}.remove`);
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to remove appointment',
          } as ServiceError);
    }
  }
}
