/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { HttpStatus, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import {
  MicroserviceOptions,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { MicroserviceLoggingInterceptor } from '@medicpadi-backend/utils';
import { ServiceError } from '@medicpadi-backend/contracts';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.TCP_HOST || '0.0.0.0',
        port: 3002,
      },
    },
  );
  app.useGlobalInterceptors(new MicroserviceLoggingInterceptor());
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
              error.constraints,
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
  Logger.log(`🚀 Profile Service is running on port 3002`);
}

bootstrap();
