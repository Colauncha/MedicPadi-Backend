import { registerAs } from '@nestjs/config';

const smtpConfig = registerAs('smtpConfig', () => ({
  host: process.env['SMTP_HOST'],
  port: parseInt(process.env['SMTP_PORT'] || '465'),

  user: process.env['SMTP_USER'],
  pass: process.env['SMTP_PASS'],
}));

export default smtpConfig;
