// import {
//   CanActivate,
//   ExecutionContext,
//   Inject,
//   Injectable,
// } from '@nestjs/common';
// import { ClientProxy } from '@nestjs/microservices';
// import { firstValueFrom } from 'rxjs';
// import { Request } from 'express';
// import { Reflector } from '@nestjs/core';

// @Injectable()
// export class AuthGuard implements CanActivate {
//   constructor(
//     @Inject('AUTH_SERVICE') private readonly authProxy: ClientProxy,
//     private readonly reflector: Reflector,
//   ) {}

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const req = context.switchToHttp().getRequest();
//     let token: string | undefined;

//     // Check for token in cookies and Authorization header
//     if (req.cookies && req.cookies['auth_token']) {
//       token = req.cookies['auth_token'];
//     } else if (req.headers && req.headers.authorization) {
//       const authHeader = req.headers.authorization;
//       console.log(authHeader);
//       if (authHeader.startsWith('Bearer ')) {
//         token = authHeader.slice(7);
//       }
//     }
//     if (!token) {
//       return Promise.resolve(false);
//     }

//     const result$ = this.authProxy.send(AuthPatterns.VERIFY, token);
//     const result = await firstValueFrom(result$);

//     if (result && result.valid) req.user = result.user;

//     return result && result.valid;
//   }
// }

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

export type RequestWithUser = Request & { user?: any };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authProxy: ClientProxy,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.some((role) => role === 'public'))
      return true;

    const req = context.switchToHttp().getRequest();
    let token =
      req.cookies?.['auth_token'] ||
      req.headers?.authorization?.replace('Bearer ', '');

    if (!token) return false;

    const result = await firstValueFrom(
      this.authProxy.send(AuthPatterns.VERIFY, token),
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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    let token: string | undefined;

    // Check for token in cookies and Authorization header
    if (req.cookies && req.cookies['auth_token']) {
      token = req.cookies['auth_token'];
    } else if (req.headers && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      console.log(authHeader);
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }
    if (!token) {
      return Promise.resolve(false);
    }

    const result$ = this.authProxy.send(AuthPatterns.VERIFY, token);
    const result = await firstValueFrom(result$);

    if (result && result.valid) req.user = result.user;

    if (result && result.valid && req.user.role !== 'admin') {
      return Promise.resolve(false);
    }

    return result && result.valid;
  }
}
