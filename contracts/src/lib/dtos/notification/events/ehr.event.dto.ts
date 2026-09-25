import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ConsentAccessLevel } from '../../../enums/ehr.enum';

export class EhrAccessRequestedEventDto {
  @IsUUID()
  consentId!: string;

  @IsUUID()
  patientId!: string;

  @IsUUID()
  doctorId!: string;

  @IsEnum(ConsentAccessLevel)
  accessLevel!: ConsentAccessLevel;

  @IsOptional()
  @IsString()
  message?: string;

  @IsString()
  reviewLink!: string;
}
