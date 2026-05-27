import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  private logger = new Logger('ExceptionHandler');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const err = exception instanceof RpcException ? (exception.getError() as any) : exception;
    const statusCode = err?.statusCode || (err?.status) || 500;
    const message = err?.message || 'Internal server error';

    this.logError(exception, err);

    if (
      process.env['NODE_ENV'] === 'development' ||
      process.env['NODE_ENV'] === 'staging'
    ) {
      response.status(statusCode).json({
        statusCode,
        message,
        error: err?.error || (err instanceof Error ? err.message : undefined),
        stack: err?.stack || (err instanceof Error ? err.stack : undefined),
      });
    } else {
      response.status(statusCode).json({
        statusCode,
        message,
      });
    }
  }

  private logError(exception: any, err: any): void {
    // if (process.env['NODE_ENV'] !== 'development') return;
    if (process.env['NODE_ENV'] === 'production') return;

    if (exception instanceof RpcException) {
      this.logger.error(
        `RPC Exception: ${err?.message || 'Unknown error'}`,
        err?.stack,
      );
    } else if (exception instanceof Error) {
      this.logger.error(`${exception.message}`, exception.stack);
    } else {
      this.logger.error(`Unhandled exception: ${JSON.stringify(err, null, 2)}`);
    }
  }
}