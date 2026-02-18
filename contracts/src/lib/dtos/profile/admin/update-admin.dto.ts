import { PartialType } from '@nestjs/mapped-types';
import { CreateAdminDto } from './create-admin.dto';
import { IsString } from 'class-validator';

export class UpdateAdminDto extends PartialType(CreateAdminDto) {
  @IsString()
  id?: string;
}
