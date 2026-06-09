import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class AppointmentCreatedEventDto {
  @IsUUID()
  appointmentId!: string;

  @IsUUID()
  patientId!: string;

  @IsUUID()
  doctorId!: string;

  @IsDateString()
  appointmentTime!: string;

  @IsOptional()
  @IsString()
  acceptLink?: string;
}

export class AppointmentConfirmedEventDto {
  @IsUUID()
  appointmentId!: string;

  @IsUUID()
  patientId!: string;

  @IsUUID()
  doctorId!: string;

  @IsDateString()
  appointmentTime!: string;

  @IsOptional()
  @IsString()
  paymentLink?: string;
}

export class AppointmentPaymentConfirmedEventDto {
  @IsUUID()
  appointmentId!: string;

  @IsUUID()
  patientId!: string;

  @IsUUID()
  doctorId!: string;

  @IsDateString()
  appointmentTime!: string;

  @IsOptional()
  @IsString()
  joinLink?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;
}

export class AppointmentCancelledEventDto {
  @IsUUID()
  appointmentId!: string;

  @IsUUID()
  patientId!: string;

  @IsDateString()
  appointmentTime!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
