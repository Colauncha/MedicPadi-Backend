import { registerAs } from '@nestjs/config';

const paystackConfig = registerAs('paystackConfig', () => ({
  secretKey: process.env['PAYSTACK_SECRET_KEY'],
  publicKey: process.env['PAYSTACK_PUBLIC_KEY'],

  paystackApiUrl: process.env['PAYSTACK_API_URL'] || 'https://api.paystack.co',
  paystackIPWhitelist: process.env['PAYSTACK_IP_WHITELIST'],
}));

export default paystackConfig;
