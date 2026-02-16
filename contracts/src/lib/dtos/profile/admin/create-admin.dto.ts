import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  user_id!: string;

  @IsString()
  @IsOptional()
  @MinLength(3, { each: true })
  firstName?: string;

  @IsString()
  @IsOptional()
  @MinLength(3, { each: true })
  lastName?: string;

  @IsArray()
  @MinLength(3, { each: true })
  @IsString({ each: true })
  permissions?: string[];
}
