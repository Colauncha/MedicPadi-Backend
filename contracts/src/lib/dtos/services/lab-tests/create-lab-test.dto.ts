import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateLabTestDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shortName!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsNumber()
  price!: number;

  @ApiProperty()
  @IsBoolean()
  available!: boolean;

  @ApiProperty()
  @IsNumber()
  TAT!: number;

  @ApiProperty()
  @IsBoolean()
  hasImage!: boolean;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  department_id!: string;
}
