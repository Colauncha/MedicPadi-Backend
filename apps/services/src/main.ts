/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { MicroserviceLoggingInterceptor, ServiceAuthGuard } from '@medicpadi-backend/utils';
import { ValidationPipe, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ServiceError } from '@medicpadi-backend/contracts';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.TCP_HOST || '0.0.0.0',
        port: 3004,
      },
    },
  );
  app.useGlobalInterceptors(new MicroserviceLoggingInterceptor());
  app.useGlobalGuards(new ServiceAuthGuard());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        console.log(errors);
        const errorMessages = errors.map(
          (error) =>
            `${error.property} has wrong value ${error.value}, ${Object.values(
              error.constraints || '<no message>',
            ).join(', ')}`,
        );
        return new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          error: errorMessages,
          message: 'Validation failed; Invalid input data.',
        } as ServiceError);
      },
    }),
  );

  await app.listen();
  Logger.log(`🚀 Services service is running on 3004`);
}

bootstrap();
