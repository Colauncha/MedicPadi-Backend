import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';
import {
  ConsentAccessLevel,
  ConsentStatus,
} from '../../enums/ehr.enum';
import { AuthRole } from '../../enums/auth.enum';

export class CreateConsentGrantDto {
  @ApiPropertyOptional({
    description:
      'UUID of the patient. Ignored for patients (set from the authenticated user); required for admins.',
  })
  @IsUUID()
  @IsOptional()
  patient_id?: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  granted_to_user_id!: string;

  @ApiProperty({ enum: AuthRole })
  @IsEnum(AuthRole)
  grantee_role!: AuthRole;

  @ApiProperty({ enum: ConsentAccessLevel })
  @IsEnum(ConsentAccessLevel)
  access_level!: ConsentAccessLevel;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expires_at?: string;
}