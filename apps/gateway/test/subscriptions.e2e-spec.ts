import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { of, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { RpcExceptionFilter } from '@medicpadi-backend/contracts';
import { CloudinaryService } from '@medicpadi-backend/utils';
import { ProfileModule } from '../src/profile/profile.module';
import {
  testConfigModule,
  createMockAuthProxy,
  PATIENT_TOKEN,
  ADMIN_TOKEN,
  LAB_TOKEN,
} from './test-helpers';

const unwrap = (payload: any) =>
  payload && typeof payload === 'object' && '_auth' in payload
    ? payload.data
    : payload;

const patientPlans = [
  { code: 'free', audience: 'patient', name: 'Free', price: 0 },
  { code: 'basic', audience: 'patient', name: 'Basic', price: 2500 },
  { code: 'premium', audience: 'patient', name: 'Premium', price: 5000 },
];
const providerPlans = [
  { code: 'free', audience: 'provider', name: 'Free', price: 0 },
  {
    code: 'professional',
    audience: 'provider',
    name: 'Professional',
    price: 10000,
  },
];

const createMockSubscriptionProfileProxy = () => ({
  send: jest.fn().mockImplementation((pattern: string, payload: any) => {
    const data = unwrap(payload);
    switch (pattern) {
      case 'profile.subscriptions.findPlans':
        return of(
          data?.audience === 'patient'
            ? patientPlans
            : data?.audience === 'provider'
              ? providerPlans
              : [...patientPlans, ...providerPlans],
        );
      case 'profile.subscriptions.getMine':
        return of({
          id: 'sub-1',
          user_id: data.userId,
          plan_code: 'free',
          status: 'active',
        });
      case 'profile.subscriptions.subscribe':
        if (data.plan === 'free')
          return of({ subscription: { plan_code: 'free' } });
        if (data.role !== 'patient' && data.plan !== 'professional') {
          return throwError(
            () =>
              new RpcException({
                statusCode: 400,
                message: 'Plan not available',
              }),
          );
        }
        return of({
          subscription: { id: 'sub-1', pending_plan_code: data.plan },
          authorization_url: 'https://checkout.paystack.com/abc',
          reference: 'ref-1',
        });
      case 'profile.subscriptions.cancel':
        return of({ id: 'sub-1', cancel_at_period_end: true });
      case 'profile.subscriptions.adminUpdatePlan':
        return of({
          code: data.code,
          audience: data.audience,
          price: data.price,
        });
      case 'profile.subscriptions.runJob':
        return of({ queued: true, name: data.job });
      default:
        return of(null);
    }
  }),
  emit: jest.fn().mockReturnValue(of(null)),
  connect: jest.fn(),
  close: jest.fn(),
});

describe('SubscriptionsController (e2e)', () => {
  let app: INestApplication;
  let profileProxy: ReturnType<typeof createMockSubscriptionProfileProxy>;

  beforeAll(async () => {
    profileProxy = createMockSubscriptionProfileProxy();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [testConfigModule, ProfileModule],
    })
      .overrideProvider('AUTH_SERVICE')
      .useValue(createMockAuthProxy())
      .overrideProvider('PROFILE_SERVICE')
      .useValue(profileProxy)
      .overrideProvider(CloudinaryService)
      .useValue({ uploadImage: jest.fn() })
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

  const lastCall = (pattern: string) =>
    profileProxy.send.mock.calls.filter(([p]) => p === pattern).at(-1);

  describe('GET /api/profile/subscriptions/plans', () => {
    it('returns patient plans for a patient', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/profile/subscriptions/plans')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);
      expect(body.map((p: any) => p.code)).toEqual([
        'free',
        'basic',
        'premium',
      ]);
    });

    it('returns provider plans for a lab', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/profile/subscriptions/plans')
        .set('Authorization', `Bearer ${LAB_TOKEN}`)
        .expect(200);
      expect(body.map((p: any) => p.code)).toEqual(['free', 'professional']);
    });

    it('returns every plan for an admin', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/profile/subscriptions/plans')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .expect(200);
      expect(body).toHaveLength(5);
    });

    it('returns 403 without a token', () => {
      return request(app.getHttpServer())
        .get('/api/profile/subscriptions/plans')
        .expect(403);
    });
  });

  describe('GET /api/profile/subscriptions/me', () => {
    it('forwards the caller identity', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/profile/subscriptions/me')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);
      expect(body).toMatchObject({
        user_id: 'patient-uuid',
        plan_code: 'free',
      });
      expect(unwrap(lastCall('profile.subscriptions.getMine')![1])).toEqual({
        userId: 'patient-uuid',
        role: 'patient',
      });
    });

    it('is not available to admins', () => {
      return request(app.getHttpServer())
        .get('/api/profile/subscriptions/me')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .expect(403);
    });
  });

  describe('POST /api/profile/subscriptions/subscribe', () => {
    it('returns a checkout url for a paid plan', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/profile/subscriptions/subscribe')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ plan: 'premium' })
        .expect(201);
      expect(body.authorization_url).toContain('paystack');
      expect(unwrap(lastCall('profile.subscriptions.subscribe')![1])).toEqual({
        plan: 'premium',
        userId: 'patient-uuid',
        role: 'patient',
      });
    });

    it('rejects an unknown plan value with 400', () => {
      return request(app.getHttpServer())
        .post('/api/profile/subscriptions/subscribe')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ plan: 'gold' })
        .expect(400);
    });

    it('surfaces the profile service 400 when a lab picks a patient plan', () => {
      return request(app.getHttpServer())
        .post('/api/profile/subscriptions/subscribe')
        .set('Authorization', `Bearer ${LAB_TOKEN}`)
        .send({ plan: 'premium' })
        .expect(400);
    });
  });

  describe('POST /api/profile/subscriptions/cancel', () => {
    it('schedules a cancellation', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/profile/subscriptions/cancel')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(201);
      expect(body.cancel_at_period_end).toBe(true);
    });
  });

  describe('PATCH /api/profile/subscriptions/plans/:audience/:code', () => {
    it('is admin only', () => {
      return request(app.getHttpServer())
        .patch('/api/profile/subscriptions/plans/patient/basic')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ price: 3000 })
        .expect(403);
    });

    it('forwards the plan key and patch for an admin', async () => {
      const { body } = await request(app.getHttpServer())
        .patch('/api/profile/subscriptions/plans/patient/basic')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ price: 3000 })
        .expect(200);
      expect(body).toEqual({ code: 'basic', audience: 'patient', price: 3000 });
    });

    it('rejects an invalid audience', () => {
      return request(app.getHttpServer())
        .patch('/api/profile/subscriptions/plans/robots/basic')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ price: 3000 })
        .expect(400);
    });
  });

  describe('POST /api/profile/subscriptions/jobs/:name/run', () => {
    it('queues a job for an admin', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/profile/subscriptions/jobs/charge/run')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .expect(201);
      expect(body).toEqual({ queued: true, name: 'charge' });
    });

    it('rejects an unknown job name', () => {
      return request(app.getHttpServer())
        .post('/api/profile/subscriptions/jobs/bogus/run')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .expect(400);
    });

    it('is admin only', () => {
      return request(app.getHttpServer())
        .post('/api/profile/subscriptions/jobs/charge/run')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(403);
    });
  });
});
