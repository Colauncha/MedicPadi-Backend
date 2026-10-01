import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { throwError } from 'rxjs';
import { RpcExceptionFilter } from '@medicpadi-backend/contracts';
import { SearchModule } from '../src/search/search.module';
import {
  testConfigModule,
  createMockAuthProxy,
  createMockProfileProxy,
  createMockServicesProxy,
  PATIENT_TOKEN,
} from './test-helpers';

describe('SearchController (e2e)', () => {
  let app: INestApplication;
  const profileProxy = createMockProfileProxy();
  const servicesProxy = createMockServicesProxy();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [testConfigModule, SearchModule],
    })
      .overrideProvider('AUTH_SERVICE')
      .useValue(createMockAuthProxy())
      .overrideProvider('PROFILE_SERVICE')
      .useValue(profileProxy)
      .overrideProvider('SERVICES_SERVICE')
      .useValue(servicesProxy)
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

  beforeEach(() => {
    profileProxy.send.mockClear();
    servicesProxy.send.mockClear();
  });

  describe('GET /api/search', () => {
    it('returns results grouped by every entity type', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/search?q=para')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);

      expect(Object.keys(body).sort()).toEqual(
        ['doctors', 'drugs', 'labTests', 'laboratories', 'pharmacies'].sort(),
      );
      expect(body.drugs).toEqual({
        data: [expect.objectContaining({ name: 'Paracetamol' })],
        total: 1,
      });
      expect(body.doctors.data).toHaveLength(1);
    });

    it('forwards the keyword and per-type limit to the microservices', async () => {
      await request(app.getHttpServer())
        .get('/api/search?q=para&limit=3&types=drugs')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);

      expect(servicesProxy.send).toHaveBeenCalledWith(
        'services.pharmcyDrugs.findAll',
        expect.objectContaining({
          data: expect.objectContaining({ search: 'para', limit: 3, page: 1 }),
        }),
      );
    });

    it('only searches the requested types', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/search?q=para&types=drugs,doctors')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);

      expect(Object.keys(body).sort()).toEqual(['doctors', 'drugs']);
      expect(servicesProxy.send).toHaveBeenCalledTimes(1);
    });

    it('returns an empty bucket when one microservice fails', async () => {
      servicesProxy.send.mockImplementationOnce(() =>
        throwError(() => new Error('services down')),
      );

      const { body } = await request(app.getHttpServer())
        .get('/api/search?q=para&types=drugs,doctors')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);

      expect(body.drugs).toEqual({ data: [], total: 0 });
      expect(body.doctors.data).toHaveLength(1);
    });

    it('returns 400 when q is shorter than 2 characters', () => {
      return request(app.getHttpServer())
        .get('/api/search?q=a')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(400);
    });

    it('returns 400 for an unknown type', () => {
      return request(app.getHttpServer())
        .get('/api/search?q=para&types=patients')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(400);
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer()).get('/api/search?q=para').expect(403);
    });
  });
});
