import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionLevel } from '../../../enums/auth.enum';
import { SubscriptionAudience } from '../../../enums/subscription.enum';

export class UpdateSubscriptionPlanDto {
  @ApiPropertyOptional({ description: 'Monthly price in NGN' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}

/** Internal payload: a plan is identified by (code, audience) because FREE exists for both audiences. */
export class AdminUpdatePlanDto extends UpdateSubscriptionPlanDto {
  @IsEnum(SubscriptionLevel)
  code!: SubscriptionLevel;

  @IsEnum(SubscriptionAudience)
  audience!: SubscriptionAudience;
}
