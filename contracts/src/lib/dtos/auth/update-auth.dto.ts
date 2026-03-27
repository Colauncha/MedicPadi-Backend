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
/**
 * DTO for updating authentication/account information.
 * 
 * Extends PartialType to make all fields optional, and OmitType to exclude
 * 'role' and 'createdAt' fields from the base CreateAuthDto.
 * 
 * @class UpdateAcctDto
 * @extends {PartialType(OmitType(CreateAuthDto, ['role', 'createdAt']))}
 */
export class UpdateAcctDto extends PartialType(
  OmitType(CreateAuthDto, ['role', 'createdAt'] as const),
) {}
