import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AuthPatterns } from '@medicpadi-backend/contracts';
import { withServiceAuth } from '@medicpadi-backend/utils';
import { ConfigService } from '@nestjs/config';

export type RequestWithUser = Request & { user?: any };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authProxy: ClientProxy,
    private reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>('appConfig.internalServiceToken');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.some((role) => role === 'public'))
      return true;

    const req = context.switchToHttp().getRequest();
    const token =
      req.cookies?.['auth_token'] ||
      req.headers?.authorization?.replace('Bearer ', '');

    if (!token) return false;

    const result = await firstValueFrom(
      this.authProxy.send(AuthPatterns.VERIFY, withServiceAuth(token, this.serviceToken)),
    );

    if (!result?.valid) return false;

    req.user = result.user;

    if (!requiredRoles) return true;

    return requiredRoles.some((role) => result.user.role === role);
  }
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authProxy: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>('appConfig.internalServiceToken');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    let token: string | undefined;

    if (req.cookies && req.cookies['auth_token']) {
      token = req.cookies['auth_token'];
    } else if (req.headers?.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }

    if (!token) return false;

    const result = await firstValueFrom(
      this.authProxy.send(AuthPatterns.VERIFY, withServiceAuth(token, this.serviceToken)),
    );

    if (result && result.valid) req.user = result.user;

    if (result && result.valid && req.user.role !== 'admin') return false;

    return result && result.valid;
  }
}
