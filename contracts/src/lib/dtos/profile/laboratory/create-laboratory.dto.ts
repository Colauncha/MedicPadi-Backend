import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CreateLaboratoryDto {
  @IsString()
  @IsNotEmpty()
  user_id!: string;

  @IsString()
  @IsOptional()
  @MinLength(3)
  name?: string;

  @IsString()
  @IsOptional()
  @MinLength(3)
  registrationNumber?: string;

  @IsString()
  @IsOptional()
  @MinLength(3)
  address?: string;
}
