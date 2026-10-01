import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export enum SearchEntity {
  DOCTORS = 'doctors',
  PHARMACIES = 'pharmacies',
  LABORATORIES = 'laboratories',
  DRUGS = 'drugs',
  LAB_TESTS = 'labTests',
}

export class GlobalSearchQueryDto {
  @ApiProperty({ description: 'Search keyword', minLength: 2 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  q!: string;

  @ApiPropertyOptional({ description: 'Max results per entity type', default: 5 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 5;

  @ApiPropertyOptional({
    description: 'Comma-separated entity types to search (defaults to all)',
    enum: SearchEntity,
    isArray: true,
    example: 'doctors,drugs',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.split(',').map((v) => v.trim()).filter(Boolean)
      : value,
  )
  @IsEnum(SearchEntity, { each: true })
  types?: SearchEntity[];
}

export interface SearchBucket<T = unknown> {
  data: T[];
  total: number;
}

export type GlobalSearchResponse = Record<SearchEntity, SearchBucket>;
