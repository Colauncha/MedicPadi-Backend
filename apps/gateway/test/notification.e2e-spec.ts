import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { of } from 'rxjs';
import { NotificationPatterns, RpcExceptionFilter } from '@medicpadi-backend/contracts';
import { NotificationModule } from '../src/notification/notification.module';
import {
  testConfigModule,
  createMockAuthProxy,
  createMockNotificationProxy,
  mockPatientUser,
  PATIENT_TOKEN,
  CONSULTANT_TOKEN,
} from './test-helpers';

const EXPO_TOKEN = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
const WEB_SUBSCRIPTION = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  expirationTime: null,
  keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' },
};

describe('NotificationController (e2e)', () => {
  let app: INestApplication;
  const notificationProxy = createMockNotificationProxy();

  beforeAll(async () => {
    notificationProxy.send.mockImplementation((pattern: string, payload: any) =>
      of({ pattern, data: payload.data }),
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [testConfigModule, NotificationModule],
    })
      .overrideProvider('AUTH_SERVICE')
      .useValue(createMockAuthProxy())
      .overrideProvider('NOTIFICATION_SERVICE')
      .useValue(notificationProxy)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new RpcExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => notificationProxy.send.mockClear());

  describe('POST /api/notifications/devices', () => {
    it('registers an Expo device for the authenticated user', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ platform: 'android', token: EXPO_TOKEN, deviceName: 'Pixel 8' })
        .expect(201);

      expect(body.pattern).toBe(NotificationPatterns.DEVICES.REGISTER);
      expect(body.data).toEqual({
        userId: mockPatientUser.id,
        dto: { platform: 'android', token: EXPO_TOKEN, deviceName: 'Pixel 8' },
      });
    });

    it('registers a web device and strips unknown subscription fields', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${CONSULTANT_TOKEN}`)
        .send({ platform: 'web', subscription: WEB_SUBSCRIPTION })
        .expect(201);

      expect(body.data.userId).toBe('consultant-uuid');
      expect(body.data.dto.subscription).toEqual({
        endpoint: WEB_SUBSCRIPTION.endpoint,
        keys: WEB_SUBSCRIPTION.keys,
      });
    });

    it('ignores a userId supplied in the body', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ platform: 'ios', token: EXPO_TOKEN, userId: 'someone-else' })
        .expect(201);

      expect(body.data.userId).toBe(mockPatientUser.id);
      expect(body.data.dto.userId).toBeUndefined();
    });

    it('returns 400 for a non-Expo mobile token', async () => {
      await request(app.getHttpServer())
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ platform: 'android', token: 'not-a-token' })
        .expect(400);
      expect(notificationProxy.send).not.toHaveBeenCalledWith(
        NotificationPatterns.DEVICES.REGISTER,
        expect.anything(),
      );
    });

    it('returns 400 for a web device without a subscription', () => {
      return request(app.getHttpServer())
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ platform: 'web' })
        .expect(400);
    });

    it('returns 400 for an unknown platform', () => {
      return request(app.getHttpServer())
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ platform: 'blackberry', token: EXPO_TOKEN })
        .expect(400);
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .post('/api/notifications/devices')
        .send({ platform: 'android', token: EXPO_TOKEN })
        .expect(403);
    });
  });

  describe('DELETE /api/notifications/devices', () => {
    it('unregisters a device for the authenticated user', async () => {
      const { body } = await request(app.getHttpServer())
        .delete('/api/notifications/devices')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ token: EXPO_TOKEN })
        .expect(200);

      expect(body.pattern).toBe(NotificationPatterns.DEVICES.UNREGISTER);
      expect(body.data).toEqual({ userId: mockPatientUser.id, dto: { token: EXPO_TOKEN } });
    });

    it('returns 400 when token is missing', () => {
      return request(app.getHttpServer())
        .delete('/api/notifications/devices')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/notifications/devices', () => {
    it("lists the authenticated user's devices", async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/notifications/devices')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);

      expect(body.pattern).toBe(NotificationPatterns.DEVICES.FIND_ALL);
      expect(body.data).toBe(mockPatientUser.id);
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer()).get('/api/notifications/devices').expect(403);
    });
  });
});
