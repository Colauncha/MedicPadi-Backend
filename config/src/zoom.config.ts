import { registerAs } from '@nestjs/config';

const zoomConfig = registerAs('zoomConfig', () => ({
  acctId: process.env['ZOOM_ACCT_ID'],
  clientId: process.env['ZOOM_CLIENT_ID'],
  clientSecret: process.env['ZOOM_CLIENT_SECRET'],

  zoomAuthUrl: process.env['ZOOM_AUTH_URL'] || 'https://zoom.us/oauth/token',
  zoomApiUrl: process.env['ZOOM_API_URL'] || 'https://api.zoom.us/v2',
}));

export default zoomConfig;
