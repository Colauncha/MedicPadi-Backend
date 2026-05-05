import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCommunityPostDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  group_id!: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  author_id!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  is_anonymous?: boolean = false;
}