import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelAppointmentDto {
  @ApiProperty({ description: 'Reason for cancelling the appointment.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
