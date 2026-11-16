import { IsEnum, IsUUID } from 'class-validator';
import { SubscriptionLevel } from '../../enums/auth.enum';

/** Internal: profile service tells auth which plan level a user is on. */
export class UpdateSubscriptionLevelDto {
  @IsUUID()
  userId!: string;

  @IsEnum(SubscriptionLevel)
  subscription!: SubscriptionLevel;
}
