import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PushPlatform } from '../../enums/notification.enum';

export class WebPushKeysDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  auth!: string;
}

export class WebPushSubscriptionDto {
  @ApiProperty({ description: 'PushSubscription.endpoint from the browser' })
  @IsUrl({ require_tld: false })
  endpoint!: string;

  @ApiProperty({ type: () => WebPushKeysDto })
  @ValidateNested()
  @Type(() => WebPushKeysDto)
  keys!: WebPushKeysDto;
}

export class RegisterDeviceDto {
  @ApiProperty({ enum: PushPlatform })
  @IsEnum(PushPlatform)
  platform!: PushPlatform;

  @ApiPropertyOptional({
    description: 'Expo push token. Required for ios/android.',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @ValidateIf((o: RegisterDeviceDto) => o.platform !== PushPlatform.WEB)
  @IsString()
  @Matches(/^Expo(nent)?PushToken\[.+\]$/, {
    message: 'token must be a valid Expo push token',
  })
  token?: string;

  @ApiPropertyOptional({
    type: () => WebPushSubscriptionDto,
    description: 'Browser PushSubscription (JSON). Required for web.',
  })
  @ValidateIf((o: RegisterDeviceDto) => o.platform === PushPlatform.WEB)
  @IsDefined()
  @ValidateNested()
  @Type(() => WebPushSubscriptionDto)
  subscription?: WebPushSubscriptionDto;

  @ApiPropertyOptional({ example: 'Pixel 8' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}

export class UnregisterDeviceDto {
  @ApiProperty({
    description: 'Expo push token, or the subscription endpoint for web devices',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
