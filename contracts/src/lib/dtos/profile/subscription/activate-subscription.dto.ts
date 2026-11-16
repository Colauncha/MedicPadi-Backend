import {
  IsEmail,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaystackAuthorization } from '../../../interfaces/paystack.interface';

/** Sent by the transactions service to the profile service once a subscription payment succeeds. */
export class SubscriptionPaymentResultDto {
  @IsUUID()
  subscriptionId!: string;

  @IsString()
  reference!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsObject()
  authorization?: PaystackAuthorization;
}
