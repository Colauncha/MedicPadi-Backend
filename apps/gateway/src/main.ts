/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RpcExceptionFilter } from '@medicpadi-backend/contracts';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(cookieParser());
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalFilters(new RpcExceptionFilter());

  // Swagger Config
  const config = new DocumentBuilder()
    .setTitle('MedicPadi API')
    .setDescription(
      `## MedicPadi REST API

MedicPadi is a telemedicine and healthcare management platform connecting patients with doctors, pharmacies, and laboratories.

### Authentication
Most endpoints require a valid JWT bearer token. Obtain a token via **POST /api/auth/login**, then click **Authorize** above and enter \`Bearer <token>\`.

### Roles
| Role | Key |
|------|-----|
| Patient | \`patient\` |
| Doctor / Consultant | \`consultant\` |
| Pharmacy | \`pharmacy\` |
| Laboratory | \`lab\` |
| Admin | \`admin\` |

Each endpoint documents which roles are permitted in its description.`,
    )
    .setTermsOfService('http://localhost:3000/terms')
    .setLicense('MIT License', 'https://opensource.org/license/mit/')
    .addServer('http://localhost:3000', 'Development server')
    .addServer('https://api.medicpadi.com', 'Staging server')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  // Instantiate swagger document
  const document = SwaggerModule.createDocument(app, config);

  // Setup Swagger module
  SwaggerModule.setup('api/docs', app, document);

  // Start App
  const port = process.env.PORT || 3000;
  app.enableCors();
  await app.listen(port);
  Logger.log(
    `🚀 Gateway Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
