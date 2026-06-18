import { IsOptional, IsString, IsUUID } from 'class-validator';

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