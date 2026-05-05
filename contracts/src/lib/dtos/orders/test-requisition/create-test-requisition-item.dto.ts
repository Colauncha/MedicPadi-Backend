import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateTestRequisitionItemDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  lab_test_id!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  test_name!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  unit_price!: number;
}