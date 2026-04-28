import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { RpcExceptionFilter } from '@medicpadi-backend/contracts';
import { ServicesModule } from '../src/services/services.module';
import {
  testConfigModule,
  createMockAuthProxy,
  createMockServicesProxy,
  PATIENT_TOKEN,
  ADMIN_TOKEN,
  LAB_TOKEN,
  PHARMACY_TOKEN,
  CONSULTANT_TOKEN,
} from './test-helpers';

describe('ServicesController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [testConfigModule, ServicesModule],
    })
      .overrideProvider('AUTH_SERVICE')
      .useValue(createMockAuthProxy())
      .overrideProvider('SERVICES_SERVICE')
      .useValue(createMockServicesProxy())
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

  // ─── Lab Tests ───────────────────────────────────────────────────────────────

  describe('POST /api/services/lab/tests', () => {
    const labTestPayload = {
      name: 'Complete Blood Count',
      shortName: 'CBC',
      description: 'Full blood panel',
      price: 5000,
      available: true,
      TAT: 24,
    };

    it('allows a lab user to create a lab test', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/services/lab/tests')
        .set('Authorization', `Bearer ${LAB_TOKEN}`)
        .send(labTestPayload)
        .expect(201);

      expect(body).toMatchObject({ id: 'lab-test-id', name: 'Complete Blood Count' });
    });

    it('allows an admin to create a lab test', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/services/lab/tests')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send(labTestPayload)
        .expect(201);

      expect(body).toMatchObject({ id: 'lab-test-id' });
    });

    it('returns 403 for a patient (role not permitted)', () => {
      return request(app.getHttpServer())
        .post('/api/services/lab/tests')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send(labTestPayload)
        .expect(403);
    });

    it('returns 403 for a pharmacy user (role not permitted)', () => {
      return request(app.getHttpServer())
        .post('/api/services/lab/tests')
        .set('Authorization', `Bearer ${PHARMACY_TOKEN}`)
        .send(labTestPayload)
        .expect(403);
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .post('/api/services/lab/tests')
        .send(labTestPayload)
        .expect(403);
    });
  });

  describe('GET /api/services/lab/tests', () => {
    it('returns paginated lab tests for a lab user', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/services/lab/tests')
        .set('Authorization', `Bearer ${LAB_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({ data: expect.any(Array), total: expect.any(Number) });
    });

    it('returns paginated lab tests for a patient', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/services/lab/tests')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({ data: expect.any(Array) });
    });

    it('returns paginated lab tests for a consultant', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/services/lab/tests')
        .set('Authorization', `Bearer ${CONSULTANT_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({ data: expect.any(Array) });
    });

    it('accepts pagination query params', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/services/lab/tests?page=1&limit=5')
        .set('Authorization', `Bearer ${LAB_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({ data: expect.any(Array) });
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .get('/api/services/lab/tests')
        .expect(403);
    });
  });

  describe('GET /api/services/lab/tests/:id', () => {
    it('returns a single lab test by id for an authorized user', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/services/lab/tests/lab-test-id')
        .set('Authorization', `Bearer ${LAB_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({ id: 'lab-test-id', name: 'CBC' });
    });

    it('returns a lab test for a patient', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/services/lab/tests/lab-test-id')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({ id: 'lab-test-id' });
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .get('/api/services/lab/tests/lab-test-id')
        .expect(403);
    });
  });

  describe('PATCH /api/services/lab/tests/:id', () => {
    it('allows a lab user to update a lab test', async () => {
      const { body } = await request(app.getHttpServer())
        .patch('/api/services/lab/tests/lab-test-id')
        .set('Authorization', `Bearer ${LAB_TOKEN}`)
        .send({ price: 6000, available: false })
        .expect(200);

      expect(body).toMatchObject({ id: 'lab-test-id' });
    });

    it('allows an admin to update a lab test', async () => {
      const { body } = await request(app.getHttpServer())
        .patch('/api/services/lab/tests/lab-test-id')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ price: 6000 })
        .expect(200);

      expect(body).toMatchObject({ id: 'lab-test-id' });
    });

    it('returns 403 for a patient (role not permitted)', () => {
      return request(app.getHttpServer())
        .patch('/api/services/lab/tests/lab-test-id')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({ price: 6000 })
        .expect(403);
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .patch('/api/services/lab/tests/lab-test-id')
        .send({ price: 6000 })
        .expect(403);
    });
  });

  describe('DELETE /api/services/lab/tests/:id', () => {
    it('allows a lab user to delete a lab test', async () => {
      const { body } = await request(app.getHttpServer())
        .delete('/api/services/lab/tests/lab-test-id')
        .set('Authorization', `Bearer ${LAB_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({ message: expect.any(String) });
    });

    it('allows an admin to delete a lab test', async () => {
      const { body } = await request(app.getHttpServer())
        .delete('/api/services/lab/tests/lab-test-id')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({ message: expect.any(String) });
    });

    it('returns 403 for a consultant (role not permitted)', () => {
      return request(app.getHttpServer())
        .delete('/api/services/lab/tests/lab-test-id')
        .set('Authorization', `Bearer ${CONSULTANT_TOKEN}`)
        .expect(403);
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .delete('/api/services/lab/tests/lab-test-id')
        .expect(403);
    });
  });

  // ─── Pharmacy Drugs ──────────────────────────────────────────────────────────

  describe('POST /api/services/pharmacy/drugs', () => {
    const drugPayload = {
      name: 'Paracetamol',
      description: 'Pain reliever and fever reducer',
      price: 500,
      available: true,
    };

    it('allows a pharmacy user to create a drug listing', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/services/pharmacy/drugs')
        .set('Authorization', `Bearer ${PHARMACY_TOKEN}`)
        .send(drugPayload)
        .expect(201);

      expect(body).toMatchObject({ id: 'drug-id', name: 'Paracetamol' });
    });

    it('allows an admin to create a drug listing', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/services/pharmacy/drugs')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send(drugPayload)
        .expect(201);

      expect(body).toMatchObject({ id: 'drug-id' });
    });

    it('returns 403 for a patient (role not permitted)', () => {
      return request(app.getHttpServer())
        .post('/api/services/pharmacy/drugs')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send(drugPayload)
        .expect(403);
    });

    it('returns 403 for a lab user (role not permitted)', () => {
      return request(app.getHttpServer())
        .post('/api/services/pharmacy/drugs')
        .set('Authorization', `Bearer ${LAB_TOKEN}`)
        .send(drugPayload)
        .expect(403);
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .post('/api/services/pharmacy/drugs')
        .send(drugPayload)
        .expect(403);
    });
  });

  describe('GET /api/services/pharmacy/drugs', () => {
    it('returns paginated drugs for a pharmacy user', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/services/pharmacy/drugs')
        .set('Authorization', `Bearer ${PHARMACY_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({ data: expect.any(Array), total: expect.any(Number) });
    });

    it('returns paginated drugs for a patient', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/services/pharmacy/drugs')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({ data: expect.any(Array) });
    });

    it('returns paginated drugs for a consultant', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/services/pharmacy/drugs')
        .set('Authorization', `Bearer ${CONSULTANT_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({ data: expect.any(Array) });
    });

    it('accepts pagination query params', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/services/pharmacy/drugs?page=1&limit=10')
        .set('Authorization', `Bearer ${PHARMACY_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({ data: expect.any(Array) });
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .get('/api/services/pharmacy/drugs')
        .expect(403);
    });
  });

  describe('GET /api/services/pharmacy/drugs/:id', () => {
    it('returns a single drug by id for an authorized user', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/services/pharmacy/drugs/drug-id')
        .set('Authorization', `Bearer ${PHARMACY_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({ id: 'drug-id', name: 'Paracetamol' });
    });

    it('returns a drug for a patient', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/services/pharmacy/drugs/drug-id')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({ id: 'drug-id' });
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .get('/api/services/pharmacy/drugs/drug-id')
        .expect(403);
    });
  });

  describe('PATCH /api/services/pharmacy/drugs/:id', () => {
    it('allows a pharmacy user to update a drug', async () => {
      const { body } = await request(app.getHttpServer())
        .patch('/api/services/pharmacy/drugs/drug-id')
        .set('Authorization', `Bearer ${PHARMACY_TOKEN}`)
        .send({ price: 600, available: false })
        .expect(200);

      expect(body).toMatchObject({ id: 'drug-id' });
    });

    it('allows an admin to update a drug', async () => {
      const { body } = await request(app.getHttpServer())
        .patch('/api/services/pharmacy/drugs/drug-id')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ price: 600 })
        .expect(200);

      expect(body).toMatchObject({ id: 'drug-id' });
    });

    it('returns 403 for a lab user (role not permitted)', () => {
      return request(app.getHttpServer())
        .patch('/api/services/pharmacy/drugs/drug-id')
        .set('Authorization', `Bearer ${LAB_TOKEN}`)
        .send({ price: 600 })
        .expect(403);
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .patch('/api/services/pharmacy/drugs/drug-id')
        .send({ price: 600 })
        .expect(403);
    });
  });

  describe('DELETE /api/services/pharmacy/drugs/:id', () => {
    it('allows a pharmacy user to delete a drug', async () => {
      const { body } = await request(app.getHttpServer())
        .delete('/api/services/pharmacy/drugs/drug-id')
        .set('Authorization', `Bearer ${PHARMACY_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({ message: expect.any(String) });
    });

    it('allows an admin to delete a drug', async () => {
      const { body } = await request(app.getHttpServer())
        .delete('/api/services/pharmacy/drugs/drug-id')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .expect(200);

      expect(body).toMatchObject({ message: expect.any(String) });
    });

    it('returns 403 for a patient (role not permitted)', () => {
      return request(app.getHttpServer())
        .delete('/api/services/pharmacy/drugs/drug-id')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(403);
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .delete('/api/services/pharmacy/drugs/drug-id')
        .expect(403);
    });
  });
});
