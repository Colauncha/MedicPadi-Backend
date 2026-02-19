import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateAuthDto } from './create-auth.dto';
import { IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// For Admin users
export class UpdateAuthDto extends PartialType(CreateAuthDto) {
  @ApiPropertyOptional()
  @IsString()
  id?: string;
}

// General use
export class UpdateAcctDto extends PartialType(
  OmitType(CreateAuthDto, ['role', 'createdAt'] as const),
) {}
