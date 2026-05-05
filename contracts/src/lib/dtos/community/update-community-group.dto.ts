import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateCommunityGroupDto } from './create-community-group.dto';

export class UpdateCommunityGroupDto extends PartialType(
  CreateCommunityGroupDto,
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;
}