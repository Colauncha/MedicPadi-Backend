import { IsEmail, IsOptional, IsString } from 'class-validator';

export class TestRequisitionEmailDto {
  @IsEmail()
  patientEmail!: string;

  @IsString()
  patientName!: string;

  @IsOptional()
  @IsEmail()
  labEmail?: string;

  @IsOptional()
  @IsString()
  labName?: string;

  @IsString()
  requisitionId!: string;

  @IsOptional()
  @IsString()
  acceptLink?: string;

  @IsOptional()
  @IsString()
  paymentLink?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
