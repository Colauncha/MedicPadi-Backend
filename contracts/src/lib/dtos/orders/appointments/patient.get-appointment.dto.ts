import { OmitType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';
import { CreateAppointmentDto } from './create-appointment.dto';
import { AppointmentStatus } from 'contracts/src/lib/enums/appointment-status.enum';

export class PatientGetAppointmentDto extends OmitType(CreateAppointmentDto, [
  'meeting_id',
  'meeting_link',
] as const) {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsString()
  status!: AppointmentStatus;
}
