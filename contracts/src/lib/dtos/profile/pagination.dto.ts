import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OmitType, PartialType } from '@nestjs/mapped-types';

export class PaginationDto {
  @ApiProperty()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  order?: string = 'desc';
}

export class DrugQueryDto extends PaginationDto {
  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  requiresPrescription?: boolean;

  @ApiProperty()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  category?: string;
}

export class LabTestQueryDto extends PaginationDto {
  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiProperty()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  hasImage?: boolean;
}

// Pagination response structures

export class PaginationMetaDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  count!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  total_pages!: number;
}

export class PaginationLinksDto {
  @ApiProperty()
  first!: string;

  @ApiProperty({ nullable: true })
  next!: string | null;

  @ApiProperty({ nullable: true })
  previous!: string | null;

  @ApiProperty()
  last!: string;
}

export class PaginationResponseDto<T> {
  @ApiProperty()
  data!: T[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;

  @ApiProperty({ type: () => PaginationLinksDto })
  links!: PaginationLinksDto;
}