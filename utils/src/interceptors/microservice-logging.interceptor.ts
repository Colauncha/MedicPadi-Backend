import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class MicroserviceLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MicroserviceLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();

    // For microservices
    const rpcContext = context.switchToRpc();
    const data = rpcContext.getData();
    const pattern = context.getHandler().name;

    this.logger.log(
      `Incoming request → Pattern: ${pattern} | Payload: ${JSON.stringify(data)}`,
    );

    return next.handle().pipe(
      tap({
        next: (response) => {
          this.logger.log(
            `Outgoing response ← Pattern: ${pattern} | Duration: ${
              Date.now() - now
            }ms`,
          );
        },
        error: (err) => {
          this.logger.error(
            `Error in pattern: ${pattern} | Duration: ${Date.now() - now}ms`,
            err.stack,
          );
        },
      }),
    );
  }
}
