import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { AuthRole, SubscriptionLevel } from '../../../enums/auth.enum';

export class SubscribeDto {
  @ApiProperty({
    enum: SubscriptionLevel,
    description:
      'Plan to subscribe to. Patients: free, basic, premium. Providers: free, professional.',
  })
  @IsEnum(SubscriptionLevel)
  plan!: SubscriptionLevel;
}

/** Internal payload sent from the gateway to the profile service. */
export class SubscribeRequestDto extends SubscribeDto {
  @IsUUID()
  userId!: string;

  @IsEnum(AuthRole)
  role!: AuthRole;
}

export class SubscriptionOwnerDto {
  @IsUUID()
  userId!: string;

  @IsEnum(AuthRole)
  role!: AuthRole;
}
