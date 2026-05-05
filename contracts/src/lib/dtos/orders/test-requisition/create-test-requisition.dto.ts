import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTestRequisitionItemDto } from './create-test-requisition-item.dto';

export class CreateTestRequisitionDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  lab_id!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  referring_provider_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreateTestRequisitionItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTestRequisitionItemDto)
  items!: CreateTestRequisitionItemDto[];
}