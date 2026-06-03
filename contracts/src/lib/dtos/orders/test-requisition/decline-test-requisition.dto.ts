import { PickType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateTestRequisitionDto } from './create-test-requisition.dto';

export class DeclineTestRequisitionDto extends PickType(
  CreateTestRequisitionDto,
  ['notes'] as const,
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;
}
