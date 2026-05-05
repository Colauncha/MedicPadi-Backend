import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaymentStatus } from '../../../enums/payment-status.enum';
import { RequisitionStatus } from '../../../enums/requisition-status.enum';
import { CreateTestRequisitionDto } from './create-test-requisition.dto';

export class UpdateTestRequisitionDto extends PartialType(
  CreateTestRequisitionDto,
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