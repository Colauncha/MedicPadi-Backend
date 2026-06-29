import { PartialType } from '@nestjs/mapped-types';
import { CreateDoctorDto } from './create-doctor.dto';
import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDoctorDto extends PartialType(CreateDoctorDto) {
  @ApiPropertyOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  profilePicture?: { public_id: string; url: string };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  about?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeOfWork?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  yearsOfService?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  awards?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  costPerSession?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sessionLength?: number | null;
}
