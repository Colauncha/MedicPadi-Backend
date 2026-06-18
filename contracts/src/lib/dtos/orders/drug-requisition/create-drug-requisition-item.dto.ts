import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateDrugRequisitionItemDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  pharmacy_drug_id!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  medication_name!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  unit_price!: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  requiresPrescription?: boolean = false;
}