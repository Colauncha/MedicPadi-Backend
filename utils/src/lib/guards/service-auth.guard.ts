import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  private readonly REPLAY_WINDOW_MS = 30_000;

  canActivate(context: ExecutionContext): boolean {
    const payload = context.switchToRpc().getData<{
      _auth?: string;
      _ts?: number;
      data?: unknown;
    }>();

    console.log('ServiceAuthGuard payload:', payload);

    const token = process.env['INTERNAL_SERVICE_TOKEN'];
    if (!token) throw new RpcException('INTERNAL_SERVICE_TOKEN not set');

    if (!payload._auth || !payload._ts || payload.data === undefined) {
      throw new RpcException({ statusCode: 401, message: 'Unauthorized' });
    }

    if (Math.abs(Date.now() - payload._ts) > this.REPLAY_WINDOW_MS) {
      throw new RpcException({ statusCode: 401, message: 'Request expired' });
    }

    const expected = createHmac('sha512', token)
      .update(JSON.stringify(payload.data) + payload._ts)
      .digest('hex');

    if (expected !== payload._auth) {
      throw new RpcException({ statusCode: 401, message: 'Unauthorized' });
    }

    return true;
  }
}
