import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MobileSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mobileNotifications?: boolean = false;
}

export class DesktopSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  desktopNotifications?: boolean = false;
}

export class SettingsDto {
  @ApiPropertyOptional({ enum: ['dark', 'light'] })
  @IsOptional()
  @IsIn(['dark', 'light'])
  preferredTheme?: 'dark' | 'light' = 'light';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mfa?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean = true;

  @ApiPropertyOptional({ type: () => MobileSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MobileSettingsDto)
  mobile?: MobileSettingsDto;

  @ApiPropertyOptional({ type: () => DesktopSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DesktopSettingsDto)
  desktop?: DesktopSettingsDto;
}
