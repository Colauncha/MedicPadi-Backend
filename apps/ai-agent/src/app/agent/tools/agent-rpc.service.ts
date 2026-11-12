import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { withServiceAuth } from '@medicpadi-backend/utils';
import { ToolError } from './tool.types';

export const ORDER_SERVICE = 'ORDER_SERVICE';
export const PROFILE_SERVICE = 'PROFILE_SERVICE';
export const SERVICES_SERVICE = 'SERVICES_SERVICE';

export type AgentServiceTarget = 'orders' | 'profile' | 'services';

const RPC_TIMEOUT_MS = 15_000;

/** Extracts a safe, human-readable message from an RPC error payload. */
export function rpcErrorMessage(error: unknown): string {
  if (error instanceof ToolError) return error.message;
  if (error && typeof error === 'object') {
    const e = error as { message?: unknown; name?: unknown };
    if (e.name === 'TimeoutError') return 'The service took too long to respond';
    if (typeof e.message === 'string' && e.message) return e.message;
    if (Array.isArray(e.message)) return e.message.join('; ');
  }
  return 'The request could not be completed';
}

/** Thin wrapper over the downstream ClientProxies that signs every payload. */
@Injectable()
export class AgentRpcService {
  constructor(
    @Inject(ORDER_SERVICE) private readonly ordersClient: ClientProxy,
    @Inject(PROFILE_SERVICE) private readonly profileClient: ClientProxy,
    @Inject(SERVICES_SERVICE) private readonly servicesClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>(
      'appConfig.internalServiceToken',
    );
  }

  private client(target: AgentServiceTarget): ClientProxy {
    switch (target) {
      case 'orders':
        return this.ordersClient;
      case 'profile':
        return this.profileClient;
      case 'services':
        return this.servicesClient;
    }
  }

  async send<T = any>(
    target: AgentServiceTarget,
    pattern: string,
    data: unknown,
  ): Promise<T> {
    try {
      return await firstValueFrom(
        this.client(target)
          .send<T>(pattern, withServiceAuth(data, this.serviceToken))
          .pipe(timeout(RPC_TIMEOUT_MS)),
      );
    } catch (error) {
      throw new ToolError(rpcErrorMessage(error));
    }
  }
}
