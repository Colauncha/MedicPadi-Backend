import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
  AppointmentEmailDto,
  AppointmentStatus,
  AuthPatterns,
  CreateAppointmentDto,
  DoctorPatterns,
  EmailPatterns,
  PatientPatterns,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdateAppointmentDto,
  CreateTransactionDto,
  TransactionSourceType,
  PaymentGateway,
  PaystackInitializeResponse,
  AppointmentPaymentStatus,
  TransactionPatterns,
} from '@medicpadi-backend/contracts';
import { withServiceAuth, logError } from '@medicpadi-backend/utils';
import { Appointment } from '../../entities/appointment.entity';
import { ZoomService } from './providers/zoom.service';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { access } from 'fs';

@Injectable()
export class AppointmentService {
  private logger = new Logger(AppointmentService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    private readonly dataSource: DataSource,
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

  private get serverUrls(): { frontend: string; backend: string } {
    return {
      frontend: this.configService.get<string>('appConfig.frontendUrl') ||
      'https://medicpadi.com',
      backend: this.configService.get<string>('appConfig.backendUrl') ||
      'http://localhost:3000/api',
    }
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
      const [doctor, patient, patientAuth, doctorAuth] = await Promise.all([
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
        firstValueFrom(
          this.authClient.send(
            AuthPatterns.FIND_BY_ID,
            withServiceAuth(dto.patient_id, token),
          ),
        ),
        firstValueFrom(
          this.authClient.send(
            AuthPatterns.FIND_BY_ID,
            withServiceAuth(dto.provider_id, token),
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
      dto.meeting_link = meeting.start_url;
      dto.meeting_id = meeting.meeting_id;
      dto.join_link = meeting.join_url;
      dto.sessionCost = doctor.costPerSession * dto.sessions;

      const appointment = queryRunner.manager.create(Appointment, { ...dto });
      const savedAppointment = await queryRunner.manager.save(appointment);

      await queryRunner.commitTransaction();

      // Notify patient — fire-and-forget
      const emailDto: AppointmentEmailDto = {
        email: patientAuth.email,
        doctorEmail: doctorAuth.email,
        patientName:
          `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() ||
          patientAuth.email,
        doctorName:
          `Dr. ${doctor.firstName ?? ''} ${doctor.lastName ?? ''}`.trim() ||
          doctorAuth.email,
        appointmentTime: appointmentTime.toISOString(),
        // acceptLink: `${this.serverUrls.frontend}/appointments/${savedAppointment.id}/?accept=true`, // TODO: frontend route for accepting appointment
        acceptLink: `${this.serverUrls.backend}/orders/appointments/${savedAppointment.id}/accept`, // TODO: change to frontend route for accepting appointment
      };
      this.notificationClient.emit(
        EmailPatterns.APPOINTMENT_CREATED,
        withServiceAuth(emailDto, token),
      );

      const { join_link, meeting_id, meeting_link, ...rest } = savedAppointment;
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
      logError(error, `${AppointmentService.name}.findAll`);
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get appointments',
      } as ServiceError);
    }
    return response;
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
      if (appointment.paymentStatus === AppointmentPaymentStatus.P_PENDING) {
        const token = this.serviceToken;
        const transaction = await firstValueFrom(
          this.transactionsClient.send(
            TransactionPatterns.TRANSACTIONS.FIND_BY_ORDER_ID,
            withServiceAuth(appointment.id, token),
          ),
        );
        let gatewayUrl =
          transaction.gateway === PaymentGateway.PAYSTACK
            ? 'https://checkout.paystack.com'
            : '';
        return {
          authorization_url: `${gatewayUrl}/${transaction.access_code}`,
          reference: transaction.gateway_reference,
          access_code: transaction.access_code,
        };
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
      console.log('Transaction DTO:', transactionDto);

      const token = this.serviceToken;

      const initTransaction: PaystackInitializeResponse = await firstValueFrom(
        this.transactionsClient.send(
          TransactionPatterns.TRANSACTIONS.CREATE,
          withServiceAuth(transactionDto, token),
        ),
      );

      console.log('Initialized Transaction:', initTransaction);

      // Notify patient their appointment was confirmed — fire-and-forget
      const [doctor, patient, patientAuth, doctorAuth] = await Promise.all([
        firstValueFrom(
          this.profileClient.send(
            DoctorPatterns.RETRIEVE,
            withServiceAuth(existing.provider_id, token),
          ),
        ),
        firstValueFrom(
          this.profileClient.send(
            PatientPatterns.RETRIEVE,
            withServiceAuth(existing.patient_id, token),
          ),
        ),
        firstValueFrom(
          this.authClient.send(
            AuthPatterns.FIND_BY_ID,
            withServiceAuth(existing.patient_id, token),
          ),
        ),
        firstValueFrom(
          this.authClient.send(
            AuthPatterns.FIND_BY_ID,
            withServiceAuth(existing.provider_id, token),
          ),
        ),
      ]);
      const emailDto: AppointmentEmailDto = {
        email: patientAuth.email,
        doctorEmail: doctorAuth.email,
        patientName:
          `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() ||
          patientAuth.email,
        doctorName:
          `${doctor.firstName ?? ''} ${doctor.lastName ?? ''}`.trim() ||
          doctorAuth.email,
        appointmentTime: existing.appointment_time?.toISOString() ?? '',
        paymentLink: initTransaction.data.authorization_url,
      };

      this.notificationClient.emit(
        EmailPatterns.APPOINTMENT_CONFIRMED,
        withServiceAuth(emailDto, token),
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

      // Notify patient of payment confirmation — fire-and-forget
      const token = this.serviceToken;
      const [doctor, patient, patientAuth, doctorAuth] = await Promise.all([
        firstValueFrom(
          this.profileClient.send(
            DoctorPatterns.RETRIEVE,
            withServiceAuth(existing.provider_id, token),
          ),
        ),
        firstValueFrom(
          this.profileClient.send(
            PatientPatterns.RETRIEVE,
            withServiceAuth(existing.patient_id, token),
          ),
        ),
        firstValueFrom(
          this.authClient.send(
            AuthPatterns.FIND_BY_ID,
            withServiceAuth(existing.patient_id, token),
          ),
        ),
        firstValueFrom(
          this.authClient.send(
            AuthPatterns.FIND_BY_ID,
            withServiceAuth(existing.provider_id, token),
          ),
        ),
      ]);

      const emailDto: AppointmentEmailDto = {
        email: patientAuth.email,
        doctorEmail: doctorAuth.email,
        patientName:
          `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() ||
          patientAuth.email,
        doctorName:
          `${doctor.firstName ?? ''} ${doctor.lastName ?? ''}`.trim() ||
          doctorAuth.email,
        appointmentTime: existing.appointment_time?.toISOString() ?? '',
        joinLink: existing.join_link || '',
        meetingLink: existing.meeting_link || '',
      };

      this.notificationClient.emit(
        EmailPatterns.APPOINTMENT_PAYMENT_CONFIRMED,
        withServiceAuth(emailDto, token),
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

      // Notify patient of cancellation — fire-and-forget
      const token = this.serviceToken;
      this.authClient
        .send(
          AuthPatterns.FIND_BY_ID,
          withServiceAuth(existing.patient_id, token),
        )
        .subscribe((patientAuth) => {
          const emailDto: AppointmentEmailDto = {
            email: patientAuth.email,
            patientName: patientAuth.fullName ?? patientAuth.email,
            doctorName: '',
            doctorsNote: reason,
            appointmentTime: existing.appointment_time?.toISOString() ?? '',
          };
          this.notificationClient.emit(
            EmailPatterns.APPOINTMENT_CANCELLED,
            withServiceAuth(emailDto, token),
          );
        });

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

      // Notify patient of cancellation — fire-and-forget
      const token = this.serviceToken;
      this.authClient
        .send(
          AuthPatterns.FIND_BY_ID,
          withServiceAuth(existing.patient_id, token),
        )
        .subscribe((patientAuth) => {
          const emailDto: AppointmentEmailDto = {
            email: patientAuth.email,
            patientName: patientAuth.fullName ?? patientAuth.email,
            doctorName: '',
            appointmentTime: existing.appointment_time?.toISOString() ?? '',
          };
          this.notificationClient.emit(
            EmailPatterns.APPOINTMENT_CANCELLED,
            withServiceAuth(emailDto, token),
          );
        });

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
