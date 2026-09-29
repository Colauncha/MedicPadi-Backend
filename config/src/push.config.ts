import { registerAs } from '@nestjs/config';

const pushConfig = registerAs('pushConfig', () => ({
  // Optional — only needed when "Enhanced Security for Push Notifications" is enabled in Expo
  expoAccessToken: process.env['EXPO_ACCESS_TOKEN'],

  // Web Push (VAPID) — generate with `npx web-push generate-vapid-keys`
  vapidPublicKey: process.env['VAPID_PUBLIC_KEY'],
  vapidPrivateKey: process.env['VAPID_PRIVATE_KEY'],
  vapidSubject: process.env['VAPID_SUBJECT'] || 'mailto:info@medicpadi.com',
}));

export default pushConfig;
