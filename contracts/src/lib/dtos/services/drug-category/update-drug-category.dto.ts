import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateDrugCategoryDto } from './create-drug-category.dto';

export class UpdateDrugCategoryDto extends PartialType(CreateDrugCategoryDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;
}
