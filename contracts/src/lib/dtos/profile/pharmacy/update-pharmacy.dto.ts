import { PartialType } from '@nestjs/mapped-types';
import { CreatePharmacyDto } from './create-pharmacy.dto';
import { IsString } from 'class-validator';

export class UpdatePharmacyDto extends PartialType(CreatePharmacyDto) {
  @IsString()
  id?: string;
}
