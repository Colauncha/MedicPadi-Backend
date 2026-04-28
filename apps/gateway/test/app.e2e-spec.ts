import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { RpcExceptionFilter } from '@medicpadi-backend/contracts';
import { AppController } from '../src/app/app.controller';
import { AppService } from '../src/app/app.service';
import {
  testConfigModule,
  createMockAuthProxy,
  createMockProfileProxy,
  createMockNotificationProxy,
  createMockServicesProxy,
} from './test-helpers';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [testConfigModule],
      controllers: [AppController],
      providers: [
        AppService,
        { provide: 'AUTH_SERVICE', useValue: createMockAuthProxy() },
        { provide: 'PROFILE_SERVICE', useValue: createMockProfileProxy() },
        { provide: 'NOTIFICATION_SERVICE', useValue: createMockNotificationProxy() },
        { provide: 'SERVICES_SERVICE', useValue: createMockServicesProxy() },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new RpcExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api', () => {
    it('returns the Hello API greeting', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect({ message: 'Hello API' });
    });
  });

  describe('GET /api/gateway-status', () => {
    it('returns gateway uptime and timestamp', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/gateway-status')
        .expect(200);

      expect(body).toMatchObject({
        status: 'Ok',
        uptime: expect.any(Number),
        timestamp: expect.any(String),
      });
    });
  });

  describe('GET /api/services-status', () => {
    it('returns status for all downstream microservices', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/services-status')
        .expect(200);

      expect(body).toMatchObject({
        authService: expect.objectContaining({ status: 'OK' }),
        profileService: expect.objectContaining({ status: 'OK' }),
        notificationService: expect.objectContaining({ status: 'OK' }),
        servicesService: expect.objectContaining({ status: 'OK' }),
      });
    });
  });
});
