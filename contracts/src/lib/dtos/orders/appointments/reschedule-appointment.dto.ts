import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RescheduleAppointmentDto {
  @ApiProperty({
    description: 'New appointment time (ISO 8601). Must be in the future.',
    example: '2026-10-20T10:00:00.000Z',
  })
  @IsDateString()
  appointment_time!: string;

  @ApiPropertyOptional({ description: 'Reason for rescheduling the appointment.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
