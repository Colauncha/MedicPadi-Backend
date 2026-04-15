import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDate,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { v4 as uuid4 } from 'uuid';

export class CreateLabTestDto {
  @ApiProperty()
  @IsString()
  user_id?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  shortName!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsNumber()
  price!: number;

  @ApiProperty()
  @IsBoolean()
  available!: boolean;

  @ApiProperty()
  @IsNumber()
  TAT!: number;
}
