import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcExceptionFilter implements ExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const err = exception.getError() as any;

    if (process.env['NODE_ENV'] === 'development') {
      console.error('RPC Exception:', err);
      response.status(err.statusCode || 500).json({
        statusCode: err.statusCode || 500,
        message: err.message || 'Internal error',
        error: err.error,
        stack: err.stack,
      });
    } else {
      console.error('RPC Exception:', err);
      response.status(err.statusCode || 500).json({
        statusCode: err.statusCode || 500,
        message: err.message || 'Internal error',
        error: JSON.stringify(err),
      });
    }
  }
}