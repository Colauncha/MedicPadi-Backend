import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CreatePharmacyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  user_id!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(3)
  registrationNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(3)
  address?: string;
}
