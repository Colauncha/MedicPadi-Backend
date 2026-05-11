import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAppointmentDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  patient_id?: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  provider_id!: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  appointment_time!: Date | string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  meeting_link?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  meeting_id?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  join_link?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sessionCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sessions: number = 1;
}
