import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateAdminDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  user_id!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(3, { each: true })
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(3, { each: true })
  lastName?: string;

  @ApiPropertyOptional()
  @IsArray()
  @MinLength(3, { each: true })
  @IsString({ each: true })
  permissions?: string[] = ['auth', 'profile-patients'];
}
