import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ConsentAccessLevel } from '../../enums/ehr.enum';

export class RequestConsentDto {
  @ApiProperty({ description: 'UUID of the patient whose records are requested.' })
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @ApiProperty({ enum: ConsentAccessLevel })
  @IsEnum(ConsentAccessLevel)
  access_level!: ConsentAccessLevel;

  @ApiPropertyOptional({
    description: 'Optional note to the patient explaining why access is needed.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
