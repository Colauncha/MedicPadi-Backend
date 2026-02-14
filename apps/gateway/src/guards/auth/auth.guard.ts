import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { AuthPatterns } from '@medicpadi-backend/contracts';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
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

    return result && result.valid;
  }
}
