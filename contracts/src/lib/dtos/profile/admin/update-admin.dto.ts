import { PartialType } from '@nestjs/mapped-types';
import { CreateAdminDto } from './create-admin.dto';
import { IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAdminDto extends PartialType(CreateAdminDto) {
  @ApiPropertyOptional()
  @IsString()
  id?: string;
}
