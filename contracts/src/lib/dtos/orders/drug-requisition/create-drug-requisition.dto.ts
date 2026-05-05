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
import { CreateDrugRequisitionItemDto } from './create-drug-requisition-item.dto';

export class CreateDrugRequisitionDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  pharmacy_id!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  prescription_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  delivery_address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreateDrugRequisitionItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDrugRequisitionItemDto)
  items!: CreateDrugRequisitionItemDto[];
}