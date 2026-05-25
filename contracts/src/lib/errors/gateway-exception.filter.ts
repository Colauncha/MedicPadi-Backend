import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const err = exception instanceof RpcException ? (exception.getError() as any) : exception;
    const statusCode = err?.statusCode || (err?.status) || 500;
    const message = err?.message || 'Internal server error';

    if (process.env['NODE_ENV'] === 'development') {
      console.error('Exception:', err);
      response.status(statusCode).json({
        statusCode,
        message,
        error: err?.error || (err instanceof Error ? err.message : undefined),
        stack: err?.stack || (err instanceof Error ? err.stack : undefined),
      });
    } else {
      console.error('Exception:', message);
      response.status(statusCode).json({
        statusCode,
        message,
      });
    }
  }
}