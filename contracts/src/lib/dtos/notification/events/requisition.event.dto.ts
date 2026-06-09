import { IsOptional, IsString, IsUUID } from 'class-validator';

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
