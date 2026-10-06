import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { of } from 'rxjs';
import { RpcExceptionFilter } from '@medicpadi-backend/contracts';
import { OrderModule } from '../src/order/order.module';
import {
  testConfigModule,
  createMockAuthProxy,
  PATIENT_TOKEN,
  ADMIN_TOKEN,
  CONSULTANT_TOKEN,
  LAB_TOKEN,
} from './test-helpers';

const createMockOrderProxy = () => ({
  send: jest.fn().mockReturnValue(of({ success: true })),
  emit: jest.fn().mockReturnValue(of(null)),
  connect: jest.fn(),
  close: jest.fn(),
});

describe('OrderController appointment payment routes (e2e)', () => {
  let app: INestApplication;
  let orderProxy: ReturnType<typeof createMockOrderProxy>;

  beforeAll(async () => {
    orderProxy = createMockOrderProxy();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [testConfigModule, OrderModule],
    })
      .overrideProvider('AUTH_SERVICE')
      .useValue(createMockAuthProxy())
      .overrideProvider('ORDER_SERVICE')
      .useValue(orderProxy)
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
    orderProxy.send.mockClear();
  });

  const lastSend = () => {
    const [pattern, payload] = orderProxy.send.mock.calls.at(-1);
    return { pattern, data: payload.data };
  };

  describe('PATCH /api/orders/appointments/:id/confirm', () => {
    it('forwards the patient’s confirmation to the orders service', async () => {
      await request(app.getHttpServer())
        .patch('/api/orders/appointments/appt-1/confirm')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .expect(200);

      expect(lastSend()).toEqual({
        pattern: 'orders.appointments.confirmCompletion',
        data: { id: 'appt-1', userId: 'patient-uuid', role: 'patient' },
      });
    });

    it('allows an admin', () => {
      return request(app.getHttpServer())
        .patch('/api/orders/appointments/appt-1/confirm')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .expect(200);
    });

    it('returns 403 for the doctor (cannot release their own payment)', async () => {
      await request(app.getHttpServer())
        .patch('/api/orders/appointments/appt-1/confirm')
        .set('Authorization', `Bearer ${CONSULTANT_TOKEN}`)
        .expect(403);

      expect(orderProxy.send).not.toHaveBeenCalledWith(
        'orders.appointments.confirmCompletion',
        expect.anything(),
      );
    });

    it('returns 403 when no token is supplied', () => {
      return request(app.getHttpServer())
        .patch('/api/orders/appointments/appt-1/confirm')
        .expect(403);
    });
  });

  describe('PATCH /api/orders/appointments/:id/cancel', () => {
    it('forwards the cancellation with the reason and caller', async () => {
      await request(app.getHttpServer())
        .patch('/api/orders/appointments/appt-1/cancel')
        .set('Authorization', `Bearer ${CONSULTANT_TOKEN}`)
        .send({ reason: 'Emergency' })
        .expect(200);

      expect(lastSend()).toEqual({
        pattern: 'orders.appointments.cancel',
        data: {
          id: 'appt-1',
          reason: 'Emergency',
          userId: 'consultant-uuid',
          role: 'consultant',
        },
      });
    });

    it('returns 400 without a reason', async () => {
      await request(app.getHttpServer())
        .patch('/api/orders/appointments/appt-1/cancel')
        .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
        .send({})
        .expect(400);

      expect(orderProxy.send).not.toHaveBeenCalledWith(
        'orders.appointments.cancel',
        expect.anything(),
      );
    });

    it('returns 403 for roles outside the appointment', () => {
      return request(app.getHttpServer())
        .patch('/api/orders/appointments/appt-1/cancel')
        .set('Authorization', `Bearer ${LAB_TOKEN}`)
        .send({ reason: 'x' })
        .expect(403);
    });
  });
});
