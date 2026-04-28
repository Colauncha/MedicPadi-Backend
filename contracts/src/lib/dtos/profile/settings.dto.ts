import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsString } from 'class-validator';

export class MobileSettingsDto {
  @ApiProperty()
  @IsBoolean()
  mobileNotifications?: boolean = false;
}

export class DesktopSettingsDto {
  @ApiProperty()
  @IsBoolean()
  desktopNotifications?: boolean = false;
}

export class SettingsDto {
  @ApiProperty()
  @IsString()
  preferredTheme?: 'dark' | 'light' = 'light';

  @ApiProperty()
  @IsBoolean()
  mfa?: boolean = false;

  @ApiProperty()
  @IsBoolean()
  emailNotifications?: boolean = false;

  @ApiProperty()
  @IsObject()
  mobile?: MobileSettingsDto;

  @ApiProperty()
  @IsObject()
  desktop?: DesktopSettingsDto;
}
