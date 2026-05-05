import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreatePrescriptionItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  medication_name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  dosage!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  frequency!: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsPositive()
  @IsOptional()
  duration_days?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  instructions?: string;
}