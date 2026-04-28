import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { RpcExceptionFilter } from '@medicpadi-backend/contracts';
import { CloudinaryService } from '@medicpadi-backend/utils';
import { ProfileModule } from '../src/profile/profile.module';
import {
  testConfigModule,
  createMockAuthProxy,
  createMockProfileProxy,
  PATIENT_TOKEN,
  ADMIN_TOKEN,
  LAB_TOKEN,
  PHARMACY_TOKEN,
  CONSULTANT_TOKEN,
} from './test-helpers';

const mockCloudinaryService = {
  uploadImage: jest.fn().mockResolvedValue({
    public_id: 'medicpadi/test-image-id',
    secure_url: 'https://res.cloudinary.com/test/image/upload/test-image.jpg',
  }),
};

describe('ProfileController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [testConfigModule, ProfileModule],
    })
      .overrideProvider('AUTH_SERVICE')
      .useValue(createMockAuthProxy())
      .overrideProvider('PROFILE_SERVICE')
      .useValue(createMockProfileProxy())
      .overrideProvider(CloudinaryService)
      .useValue(mockCloudinaryService)
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

  describe('POST /api/profile', () => {
    it('creates a profile for an authenticated user', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/profile')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ user_id: 'patient-uuid', firstName: 'Jane', lastName: 'Doe' })
        .expect(201);

      expect(body).toMatchObject({ user_id: 'patient-uuid' });
    });

    it('returns 403 when no auth token is supplied', () => {
      return request(app.getHttpServer())
        .post('/api/profile')
        .send({ user_id: 'patient-uuid' })
        .expect(403);
    });
  });

  describe('GET /api/profile (admin list)', () => {
    it('allows an admin to list all profiles', async () => {
      const { status } = await request(app.getHttpServer())
        .get('/api/profile')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .expect(200);

      expect(status).toBe(200);
    });

    it('returns 403 for a non-admin user', () => {
      return request(app.getHttpServer())
        .get('/api/profile')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(403);
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .get('/api/profile')
        .expect(403);
    });
  });

  describe('GET /api/profile/retrieve', () => {
    it('returns the authenticated user\'s own profile', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/profile/retrieve')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({
        user: expect.objectContaining({ id: 'patient-uuid' }),
        profile: expect.objectContaining({ user_id: 'patient-uuid' }),
      });
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .get('/api/profile/retrieve')
        .expect(403);
    });
  });

  describe('GET /api/profile/:id', () => {
    it('returns a profile by id for any authenticated user', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/profile/patient-uuid')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({
        user: expect.objectContaining({ id: 'patient-uuid' }),
        profile: expect.any(Object),
      });
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .get('/api/profile/patient-uuid')
        .expect(403);
    });
  });

  describe('PATCH /api/profile', () => {
    it('updates the authenticated user\'s profile', async () => {
      const { body } = await request(app.getHttpServer())
        .patch('/api/profile')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ firstName: 'Updated' })
        .expect(200);

      expect(body).toMatchObject({ id: 'profile-id' });
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .patch('/api/profile')
        .send({ firstName: 'Updated' })
        .expect(403);
    });
  });

  describe('DELETE /api/profile', () => {
    it('removes the authenticated user\'s profile', async () => {
      const { status } = await request(app.getHttpServer())
        .delete('/api/profile')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);

      expect(status).toBe(200);
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .delete('/api/profile')
        .expect(403);
    });
  });

  describe('PATCH /api/profile/business-hours', () => {
    const businessHoursPayload = {
      monday: { start: 8, end: 17 },
      tuesday: { start: 8, end: 17 },
      wednesday: { start: 8, end: 17 },
      thursday: { start: 8, end: 17 },
      friday: { start: 8, end: 17 },
      saturday: 'closed',
      sunday: 'closed',
    };

    it('allows a lab user to update business hours', async () => {
      const { body } = await request(app.getHttpServer())
        .patch('/api/profile/business-hours')
        .set('Authorization', `Bearer ${LAB_TOKEN}`)
        .send(businessHoursPayload)
        .expect(200);

      expect(body).toMatchObject({ id: 'profile-id' });
    });

    it('allows a pharmacy user to update business hours', async () => {
      const { body } = await request(app.getHttpServer())
        .patch('/api/profile/business-hours')
        .set('Authorization', `Bearer ${PHARMACY_TOKEN}`)
        .send(businessHoursPayload)
        .expect(200);

      expect(body).toMatchObject({ id: 'profile-id' });
    });

    it('allows a consultant to update business hours', async () => {
      const { body } = await request(app.getHttpServer())
        .patch('/api/profile/business-hours')
        .set('Authorization', `Bearer ${CONSULTANT_TOKEN}`)
        .send(businessHoursPayload)
        .expect(200);

      expect(body).toMatchObject({ id: 'profile-id' });
    });

    it('returns 400 for admin because AdminPatterns has no UPDATE_BUSINESS_HOURS', () => {
      // AdminPatterns intentionally omits UPDATE_BUSINESS_HOURS, so the profile
      // service throws a BadRequestException even though the role guard passes.
      return request(app.getHttpServer())
        .patch('/api/profile/business-hours')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send(businessHoursPayload)
        .expect(400);
    });

    it('returns 403 for a patient (role not permitted)', () => {
      return request(app.getHttpServer())
        .patch('/api/profile/business-hours')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send(businessHoursPayload)
        .expect(403);
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .patch('/api/profile/business-hours')
        .send(businessHoursPayload)
        .expect(403);
    });
  });

  describe('POST /api/profile/profile-picture', () => {
    // Minimal valid 1×1 PNG — NestJS 11 FileTypeValidator checks magic bytes
    const TINY_PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );

    it('uploads a profile picture and updates the profile', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/profile/profile-picture')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .attach('image', TINY_PNG, { filename: 'avatar.png', contentType: 'image/png' })
        .expect(201);

      expect(body).toMatchObject({
        public_id: expect.any(String),
        url: expect.any(String),
      });
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .post('/api/profile/profile-picture')
        .attach('image', TINY_PNG, { filename: 'avatar.png', contentType: 'image/png' })
        .expect(403);
    });
  });
});
