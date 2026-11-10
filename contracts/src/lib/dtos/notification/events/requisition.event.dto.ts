import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { AuthRole } from '../../../enums/auth.enum';
import { RequisitionStatus } from '../../../enums/requisition-status.enum';

// Test requisitions
export class TestRequisitionCreatedEventDto {
  @IsUUID()
  requisitionId!: string;

  @IsUUID()
  patientId!: string;

  @IsUUID()
  labId!: string;

  @IsOptional()
  @IsString()
  acceptLink?: string;
}

export class TestRequisitionAcceptedEventDto {
  @IsUUID()
  requisitionId!: string;

  @IsUUID()
  patientId!: string;

  @IsUUID()
  labId!: string;

  @IsOptional()
  @IsString()
  paymentLink?: string;
}

export class TestRequisitionDeclinedEventDto {
  @IsUUID()
  requisitionId!: string;

  @IsUUID()
  patientId!: string;

  @IsUUID()
  labId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// Drug requisitions
export class DrugRequisitionCreatedEventDto {
  @IsUUID()
  requisitionId!: string;

  @IsUUID()
  patientId!: string;

  @IsUUID()
  pharmacyId!: string;

  @IsOptional()
  @IsString()
  paymentLink?: string;
}
export class DrugRequisitionStatusChangedEventDto {
  @IsUUID()
  requisitionId!: string;

  @IsUUID()
  patientId!: string;

  @IsUUID()
  pharmacyId!: string;

  @IsEnum(RequisitionStatus)
  status!: RequisitionStatus;

  // Who made the change; decides which party is notified on cancellation
  @IsEnum(AuthRole)
  changedBy!: AuthRole;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  refunded?: boolean;
}
