import { PartialType } from '@nestjs/mapped-types';
import { CreateDoctorDto } from './create-doctor.dto';
import { IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDoctorDto extends PartialType(CreateDoctorDto) {
  @ApiPropertyOptional()
  @IsString()
  id?: string;
}
