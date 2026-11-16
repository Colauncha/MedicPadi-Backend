import {
  IsEmail,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaystackAuthorization } from '../../interfaces/paystack.interface';

/** Charge a previously saved Paystack card authorization (recurring subscription billing). */
export class ChargeAuthorizationDto {
  @IsUUID()
  user_id!: string;

  @IsEmail()
  email!: string;

  /** Amount in NGN (not kobo). */
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  authorization_code!: string;

  /** Deterministic, caller-provided reference; reused on retries for idempotency. */
  @IsString()
  reference!: string;

  /** Subscription id the charge belongs to. */
  @IsUUID()
  source_id!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export interface ChargeAuthorizationResult {
  success: boolean;
  reference: string;
  status: 'success' | 'failed' | 'pending';
  gatewayResponse?: string;
  authorization?: PaystackAuthorization;
}
