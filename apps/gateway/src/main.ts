/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Swagger Config
  const config = new DocumentBuilder()
    .setTitle('MedicPadi')
    .setDescription(
      'API documentation for the MedicPadi gateway app, use API as http:localhost:3000/api/docs',
    )
    .setTermsOfService('http://localhost:3000/terms')
    .setLicense('MIT License', 'https://opensource.org/license/mit/')
    .addServer('http://localhost:3000', 'Development server')
    .setVersion('1.0')
    .build();

  // Instantiate swagger document
  const document = SwaggerModule.createDocument(app, config);

  // Setup Swagger module
  SwaggerModule.setup('api/docs', app, document);

  // Start App
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Gateway Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
