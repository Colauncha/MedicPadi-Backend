import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { EhrSourceType } from '../../enums/ehr.enum';

export class CreateEhrRecordDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  provider_id?: string;

  @ApiProperty({ enum: EhrSourceType })
  @IsEnum(EhrSourceType)
  source_type!: EhrSourceType;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  source_id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content_encrypted!: string;
}