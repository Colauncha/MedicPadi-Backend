import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateCommunityPostDto } from './create-community-post.dto';

export class UpdateCommunityPostDto extends PartialType(
  CreateCommunityPostDto,
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;
}