import { HttpStatus, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  MicroserviceOptions,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import {
  MicroserviceLoggingInterceptor,
  ServiceAuthGuard,
} from '@medicpadi-backend/utils';
import { ServiceError } from '@medicpadi-backend/contracts';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.TCP_HOST || '0.0.0.0',
        port: 3007,
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
  Logger.log(`AI Agent Service is running on port 3007`);
}

bootstrap();
