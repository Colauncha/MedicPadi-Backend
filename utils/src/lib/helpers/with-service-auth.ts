import { createHmac } from 'crypto';

export function withServiceAuth<T>(data: T, token: string) {
  const ts = Date.now();
  const hmac = createHmac('sha512', token)
    .update(JSON.stringify(data) + ts)
    .digest('hex');
  return { _auth: hmac, _ts: ts, data };
}
