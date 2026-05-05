import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaymentStatus } from '../../../enums/payment-status.enum';
import { RequisitionStatus } from '../../../enums/requisition-status.enum';
import { CreateDrugRequisitionDto } from './create-drug-requisition.dto';

export class UpdateDrugRequisitionDto extends PartialType(
  CreateDrugRequisitionDto,
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ enum: RequisitionStatus })
  @IsEnum(RequisitionStatus)
  @IsOptional()
  status?: RequisitionStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  @IsOptional()
  payment_status?: PaymentStatus;
}