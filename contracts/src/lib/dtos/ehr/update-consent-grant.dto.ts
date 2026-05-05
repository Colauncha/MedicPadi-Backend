import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ConsentStatus } from '../../enums/ehr.enum';
import { CreateConsentGrantDto } from './create-consent-grant.dto';

export class UpdateConsentGrantDto extends PartialType(CreateConsentGrantDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ enum: ConsentStatus })
  @IsEnum(ConsentStatus)
  @IsOptional()
  status?: ConsentStatus;
}