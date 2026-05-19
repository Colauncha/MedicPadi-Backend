import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  content_encrypted?: string;

  @ApiPropertyOptional({ description: 'URL to the uploaded document (pdf, docx, doc)' })
  @IsUrl()
  @IsOptional()
  document_url?: string;
}