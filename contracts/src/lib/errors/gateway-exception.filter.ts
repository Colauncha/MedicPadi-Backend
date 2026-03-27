import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcExceptionFilter implements ExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const err = exception.getError() as any;

    response.status(err.statusCode || 500).json({
      statusCode: err.statusCode || 500,
      message: err.message || 'Internal error',
    });
  }
}