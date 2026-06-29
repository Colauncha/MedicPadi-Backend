import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OmitType } from '@nestjs/mapped-types';
import {
  AppointmentStatus,
  AppointmentPaymentStatus,
} from '../../enums/appointment-status.enum';
import { PrescriptionStatus } from '../../enums/prescription-status.enum';
import { RequisitionStatus } from '../../enums/requisition-status.enum';
import { PaymentStatus } from '../../enums/payment-status.enum';
import { DoctorsGender, DoctorsSpecialies } from '../../enums/doctor.enum';

export class PaginationDto {
  @ApiProperty({ description: 'Number of records per page', default: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ description: 'Page number (1-indexed)', default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Filter by resource ID' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Full-text search keyword' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Filter by user role' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ description: 'Sort order of results', default: 'desc' })
  @IsOptional()
  @IsString()
  order?: string = 'desc';
}

// Pagination request - profiles
// Doctor
export class DoctorQueryDto extends PaginationDto {
  @ApiProperty({ description: 'Filter by Doctors gender', enum: DoctorsGender, default: DoctorsGender.Male })
  @IsOptional()
  @IsEnum(DoctorsGender)
  gender?: DoctorsGender;

  @ApiProperty({ description: 'Filter by Doctors speciality', enum: DoctorsSpecialies, default: DoctorsSpecialies.General })
  @IsOptional()
  @IsEnum(DoctorsSpecialies)
  speciality?: DoctorsSpecialies;

  @ApiProperty({ description: 'Filter by consultation price per session' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @ApiProperty({ description: 'Filter by consultation price per session' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  yearsOfService?: number;
}

// Pharmacy
export class PharmacyQueryDto extends PaginationDto {
  @ApiProperty({ description: 'Filter by years of service' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  yearsOfService?: number;
}

// Laboratory
export class LaboratoryQueryDto extends PaginationDto {
  @ApiProperty({ description: 'Filter by years of service' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  yearsOfService?: number;
}

// Pagination request - orders
// Appointment
export class AppointmentQueryDto extends OmitType(PaginationDto, ['role'] as const) {
  @ApiProperty({description: 'Appointment date and time', example: '2026-06-27T10:00:00.000Z'})
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  appointmentTime?: Date;

  @ApiProperty({description: 'Zoom meeting ID'})
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  meetingId?: number;

  @ApiProperty({ description: 'Filter by appointment status', enum: AppointmentStatus, default: AppointmentStatus.PENDING })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiProperty({ description: 'Filter by appointment payment status', enum: AppointmentPaymentStatus, default: AppointmentPaymentStatus.P_PENDING })
  @IsOptional()
  @IsEnum(AppointmentPaymentStatus)
  paymentStatus?: AppointmentPaymentStatus;
}

export class PrescriptionQueryDto extends OmitType(PaginationDto, ['role'] as const) {
  @ApiProperty({ description: 'Filter by prescription status', enum: PrescriptionStatus, default: PrescriptionStatus.ISSUED })
  @IsOptional()
  @IsEnum(PrescriptionStatus)
  status?: PrescriptionStatus;
}

export class TestRequisitionQueryDto extends OmitType(PaginationDto, ['role'] as const) {
  @ApiProperty({ description: 'Filter by requisition status', enum: RequisitionStatus, default: RequisitionStatus.PENDING })
  @IsOptional()
  @IsEnum(RequisitionStatus)
  status?: RequisitionStatus;

  @ApiProperty({ description: 'Filter by payment status', enum: PaymentStatus, default: PaymentStatus.PENDING })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}

export class DrugRequisitionQueryDto extends OmitType(PaginationDto, ['role'] as const) {
  @ApiProperty({ description: 'Filter by requisition status', enum: RequisitionStatus, default: RequisitionStatus.PENDING })
  @IsOptional()
  @IsEnum(RequisitionStatus)
  status?: RequisitionStatus;

  @ApiProperty({ description: 'Filter by payment status', enum: PaymentStatus, default: PaymentStatus.PENDING })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}

// Pagination requests - services
export class DrugQueryDto extends PaginationDto {
  @ApiProperty({ description: 'Filter by drug availability' })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiProperty({ description: 'Filter by whether the drug requires a prescription' })
  @IsOptional()
  @IsBoolean()
  requiresPrescription?: boolean;

  @ApiProperty({ description: 'Filter by drug price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @ApiProperty({ description: 'Filter by drug category' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class LabTestQueryDto extends PaginationDto {
  @ApiProperty({ description: 'Filter by lab test availability' })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiProperty({ description: 'Filter by lab test price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @ApiProperty({ description: 'Filter by medical department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ description: 'Filter to only lab tests that have an image' })
  @IsOptional()
  @IsBoolean()
  hasImage?: boolean;
}

// Pagination response structures

export class PaginationMetaDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  count!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  total_pages!: number;
}

export class PaginationLinksDto {
  @ApiProperty()
  first!: string;

  @ApiProperty({ nullable: true })
  next!: string | null;

  @ApiProperty({ nullable: true })
  previous!: string | null;

  @ApiProperty()
  last!: string;
}

export class PaginationResponseDto<T> {
  @ApiProperty()
  data!: T[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;

  @ApiProperty({ type: () => PaginationLinksDto })
  links!: PaginationLinksDto;
}