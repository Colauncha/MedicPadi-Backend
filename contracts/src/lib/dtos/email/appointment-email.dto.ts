import { IsEmail, IsString, IsDateString, IsOptional } from 'class-validator';

export class AppointmentEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  patientName!: string;

  @IsString()
  doctorName!: string;

  @IsDateString()
  appointmentTime!: string;

  @IsOptional()
  @IsString()
  joinLink?: string;
}
