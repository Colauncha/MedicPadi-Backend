import { PartialType } from '@nestjs/mapped-types';
import { CreateLabTestDto } from './create-lab-test.dto';
import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLabTestDto extends PartialType(CreateLabTestDto) {
  @ApiProperty()
  @IsOptional()
  @IsUUID()
  id?: string;
}
