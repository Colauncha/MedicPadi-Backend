import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateEhrRecordDto } from './create-ehr-record.dto';

export class UpdateEhrRecordDto extends PartialType(CreateEhrRecordDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;
}