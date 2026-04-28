import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { RpcExceptionFilter } from '@medicpadi-backend/contracts';
import { AuthModule } from '../src/auth/auth.module';
import {
  testConfigModule,
  createMockAuthProxy,
  createMockProfileProxy,
  createMockNotificationProxy,
  PATIENT_TOKEN,
  ADMIN_TOKEN,
  LAB_TOKEN,
} from './test-helpers';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mockAuthProxy: ReturnType<typeof createMockAuthProxy>;
  let mockProfileProxy: ReturnType<typeof createMockProfileProxy>;
  let mockNotificationProxy: ReturnType<typeof createMockNotificationProxy>;

  beforeAll(async () => {
    mockAuthProxy = createMockAuthProxy();
    mockProfileProxy = createMockProfileProxy();
    mockNotificationProxy = createMockNotificationProxy();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [testConfigModule, AuthModule],
    })
      .overrideProvider('AUTH_SERVICE')
      .useValue(mockAuthProxy)
      .overrideProvider('PROFILE_SERVICE')
      .useValue(mockProfileProxy)
      .overrideProvider('NOTIFICATION_SERVICE')
      .useValue(mockNotificationProxy)
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

  describe('POST /api/auth (register)', () => {
    it('creates a new patient account and profile', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/auth')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          role: 'patient',
        })
        .expect(201);

      expect(body).toMatchObject({
        id: expect.any(String),
        email: 'newuser@test.com',
      });
    });

    it('creates a consultant account and corresponding profile', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/auth')
        .send({
          email: 'doctor@test.com',
          password: 'password123',
          role: 'consultant',
          fullName: 'Dr. Test',
        })
        .expect(201);

      expect(body).toMatchObject({ id: expect.any(String) });
    });

    it('creates a lab account and corresponding profile', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/auth')
        .send({
          email: 'lab@test.com',
          password: 'password123',
          role: 'lab',
        })
        .expect(201);

      expect(body).toMatchObject({ id: expect.any(String) });
    });

    it('creates a pharmacy account and corresponding profile', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/auth')
        .send({
          email: 'pharmacy@test.com',
          password: 'password123',
          role: 'pharmacy',
        })
        .expect(201);

      expect(body).toMatchObject({ id: expect.any(String) });
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns an access token and sets the auth_token cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'patient@test.com', password: 'password123' })
        .expect(201);

      expect(res.body).toMatchObject({
        message: 'Login successful',
        token: { access_token: expect.any(String) },
      });
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toMatch(/auth_token=/);
    });
  });

  describe('GET /api/auth/logout', () => {
    it('clears the auth_token cookie', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/logout')
        .expect(200);

      expect(res.body).toEqual({ message: 'Logout successful' });
    });
  });

  describe('POST /api/auth/request-password-reset', () => {
    it('accepts an email query param and returns success message', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/auth/request-password-reset?email=patient@test.com')
        .expect(201);

      expect(body).toEqual({ message: 'Password reset requested successfully' });
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('resets password with a valid OTP and returns success message', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ email: 'patient@test.com', otp: 123456, newPassword: 'newPassword1!' })
        .expect(201);

      expect(body).toEqual({ message: 'Password reset successfully' });
    });
  });

  describe('PATCH /api/auth/update (authenticated user)', () => {
    it('updates own account when a valid token is provided', async () => {
      const { body } = await request(app.getHttpServer())
        .patch('/api/auth/update')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ email: 'updated@test.com' })
        .expect(200);

      expect(body).toMatchObject({ id: expect.any(String) });
    });

    it('returns 403 when no auth token is supplied', () => {
      return request(app.getHttpServer())
        .patch('/api/auth/update')
        .send({ email: 'updated@test.com' })
        .expect(403);
    });
  });

  describe('PATCH /api/auth/admin/update (admin only)', () => {
    it('allows an admin to update any user account', async () => {
      const { body } = await request(app.getHttpServer())
        .patch('/api/auth/admin/update')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ id: 'some-user-id', email: 'changed@test.com' })
        .expect(200);

      expect(body).toMatchObject({ id: expect.any(String) });
    });

    it('returns 403 when no token is provided', () => {
      return request(app.getHttpServer())
        .patch('/api/auth/admin/update')
        .send({ id: 'some-user-id', email: 'changed@test.com' })
        .expect(403);
    });

    it('returns 403 when a non-admin token is provided', () => {
      return request(app.getHttpServer())
        .patch('/api/auth/admin/update')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ id: 'some-user-id', email: 'changed@test.com' })
        .expect(403);
    });
  });

  describe('POST /api/auth/delete (admin only)', () => {
    it('allows an admin to delete a user by id', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/auth/delete')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ id: 'some-user-id' })
        .expect(201);

      expect(body).toMatchObject({ message: expect.any(String) });
    });

    it('returns 403 when no token is provided', () => {
      return request(app.getHttpServer())
        .post('/api/auth/delete')
        .send({ id: 'some-user-id' })
        .expect(403);
    });

    it('returns 403 when a non-admin (lab) token is provided', () => {
      return request(app.getHttpServer())
        .post('/api/auth/delete')
        .set('Authorization', `Bearer ${LAB_TOKEN}`)
        .send({ id: 'some-user-id' })
        .expect(403);
    });
  });
});
