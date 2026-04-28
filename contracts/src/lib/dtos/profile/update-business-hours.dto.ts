import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';

export class BusinessHoursDto {
  @ApiPropertyOptional()
  @ValidateNested({ each: true })
  @IsOptional()
  @IsObject()
  monday?: { start: number | 'closed'; end: number | 'closed' } = {
    start: 9,
    end: 17,
  };

  @ApiPropertyOptional()
  @ValidateNested({ each: true })
  @IsOptional()
  @IsObject()
  tuesday?: { start: number | 'closed'; end: number | 'closed' } = {
    start: 9,
    end: 17,
  };

  @ApiPropertyOptional()
  @ValidateNested({ each: true })
  @IsOptional()
  @IsObject()
  wednesday?: { start: number | 'closed'; end: number | 'closed' } = {
    start: 9,
    end: 17,
  };

  @ApiPropertyOptional()
  @ValidateNested({ each: true })
  @IsOptional()
  @IsObject()
  thursday?: { start: number | 'closed'; end: number | 'closed' } = {
    start: 9,
    end: 17,
  };

  @ApiPropertyOptional()
  @ValidateNested({ each: true })
  @IsOptional()
  @IsObject()
  friday?: { start: number | 'closed'; end: number | 'closed' } = {
    start: 9,
    end: 17,
  };

  @ApiPropertyOptional()
  @ValidateNested({ each: true })
  @IsOptional()
  @IsObject()
  saturday?: { start: number | 'closed'; end: number | 'closed' } = {
    start: 9,
    end: 17,
  };

  @ApiPropertyOptional()
  @ValidateNested({ each: true })
  @IsOptional()
  @IsObject()
  sunday?: { start: number | 'closed'; end: number | 'closed' } = {
    start: 'closed',
    end: 'closed',
  };
}

// export class BusinessHoursDto {
//   @ApiPropertyOptional()
//   @ValidateNested({ each: true })
//   @IsOptional()
//   @IsObject()
//   businessHours?: BusinessHours;
// }
