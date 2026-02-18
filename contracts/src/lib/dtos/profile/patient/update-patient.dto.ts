import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientDto } from './create-patient.dto';
import { IsString } from 'class-validator';

export class UpdatePatientDto extends PartialType(CreatePatientDto) {
  @IsString()
  id?: string;
}
