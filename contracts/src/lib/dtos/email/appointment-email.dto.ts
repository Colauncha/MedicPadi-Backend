import { IsEmail, IsString, IsDateString, IsOptional } from 'class-validator';

export class AppointmentEmailDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEmail()
  doctorEmail?: string;

  @IsString()
  patientName!: string;

  @IsString()
  doctorName!: string;

  @IsDateString()
  appointmentTime!: string;

  @IsOptional()
  @IsString()
  joinLink?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsString()
  acceptLink?: string;

  @IsOptional()
  @IsString()
  paymentLink?: string;

  @IsOptional()
  @IsString()
  doctorsNote?: string;
}
