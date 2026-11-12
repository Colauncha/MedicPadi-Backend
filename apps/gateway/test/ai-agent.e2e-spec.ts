import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { of } from 'rxjs';
import { RpcExceptionFilter } from '@medicpadi-backend/contracts';
import { AiAgentModule } from '../src/ai-agent/ai-agent.module';
import { testConfigModule } from './test-helpers';

const PREMIUM_PATIENT_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';
const ACTION_ID = '33333333-3333-4333-8333-333333333333';

const baseUser = { isVerified: true, earlyUser: true };
const USERS: Record<string, any> = {
  premium: { ...baseUser, id: PREMIUM_PATIENT_ID, role: 'patient', subscription: 'premium' },
  professional: { ...baseUser, id: 'pro-id', role: 'patient', subscription: 'professional' },
  basic: { ...baseUser, id: 'basic-id', role: 'patient', subscription: 'basic' },
  free: { ...baseUser, id: 'free-id', role: 'patient', subscription: 'free' },
  consultant: { ...baseUser, id: 'doc-id', role: 'consultant', subscription: 'premium' },
  notEarly: { ...baseUser, earlyUser: false, id: 'ne-id', role: 'patient', subscription: 'premium' },
};

const unwrap = (p: any) => (p && typeof p === 'object' && '_auth' in p ? p.data : p);

const authProxy = {
  send: jest.fn((pattern: string, payload: any) => {
    const user = USERS[unwrap(payload)];
    return of(pattern === 'auth.verify' && user ? { valid: true, user } : { valid: false });
  }),
  emit: jest.fn(),
  connect: jest.fn(),
  close: jest.fn(),
};

const aiProxy = {
  send: jest.fn((_pattern: string, payload: any) =>
    of({ sessionId: SESSION_ID, reply: 'ok', echo: unwrap(payload) }),
  ),
  emit: jest.fn(),
  connect: jest.fn(),
  close: jest.fn(),
};

describe('AiAgentController – patient agent (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [testConfigModule, AiAgentModule],
    })
      .overrideProvider('AUTH_SERVICE')
      .useValue(authProxy)
      .overrideProvider('AI_AGENT_SERVICE')
      .useValue(aiProxy)
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

  beforeEach(() => aiProxy.send.mockClear());

  const post = (url: string, token: string) =>
    request(app.getHttpServer()).post(url).set('Authorization', `Bearer ${token}`);

  describe('POST /api/ai/agent/messages', () => {
    it('forwards the authenticated user id for premium patients (Bearer header)', async () => {
      const { body } = await post('/api/ai/agent/messages', 'premium')
        .send({ message: 'book a dermatologist' })
        .expect(201);

      expect(aiProxy.send).toHaveBeenCalledWith(
        'ai-agent.agent.message',
        expect.objectContaining({
          data: { userId: PREMIUM_PATIENT_ID, message: 'book a dermatologist' },
        }),
      );
      expect(body.reply).toBe('ok');
    });

    it('ignores a userId smuggled in the body', async () => {
      await post('/api/ai/agent/messages', 'premium')
        .send({ message: 'hi', userId: 'someone-else' })
        .expect(201);
      expect(aiProxy.send.mock.calls[0][1].data.userId).toBe(PREMIUM_PATIENT_ID);
    });

    it('accepts the auth_token cookie', async () => {
      await request(app.getHttpServer())
        .post('/api/ai/agent/messages')
        .set('Cookie', 'auth_token=premium')
        .send({ message: 'hi' })
        .expect(201);
    });

    it('allows professional plans', async () => {
      await post('/api/ai/agent/messages', 'professional').send({ message: 'hi' }).expect(201);
    });

    it.each(['basic', 'free', 'consultant', 'notEarly', 'unknown'])(
      'rejects %s users with 403',
      async (token) => {
        await post('/api/ai/agent/messages', token).send({ message: 'hi' }).expect(403);
        expect(aiProxy.send).not.toHaveBeenCalled();
      },
    );

    it('validates the body', async () => {
      await post('/api/ai/agent/messages', 'premium').send({}).expect(400);
      await post('/api/ai/agent/messages', 'premium')
        .send({ message: 'x'.repeat(2001) })
        .expect(400);
      await post('/api/ai/agent/messages', 'premium')
        .send({ message: 'hi', sessionId: 'not-a-uuid' })
        .expect(400);
      expect(aiProxy.send).not.toHaveBeenCalled();
    });
  });

  describe('pending actions', () => {
    it('confirms an action for the authenticated user', async () => {
      await post(`/api/ai/agent/actions/${ACTION_ID}/confirm`, 'premium')
        .send({ sessionId: SESSION_ID })
        .expect(201);
      expect(aiProxy.send).toHaveBeenCalledWith(
        'ai-agent.agent.confirmAction',
        expect.objectContaining({
          data: { actionId: ACTION_ID, sessionId: SESSION_ID, userId: PREMIUM_PATIENT_ID },
        }),
      );
    });

    it('rejects an action', async () => {
      await post(`/api/ai/agent/actions/${ACTION_ID}/reject`, 'premium')
        .send({ sessionId: SESSION_ID })
        .expect(201);
      expect(aiProxy.send.mock.calls[0][0]).toBe('ai-agent.agent.rejectAction');
    });

    it('requires UUID action and session ids', async () => {
      await post('/api/ai/agent/actions/nope/confirm', 'premium')
        .send({ sessionId: SESSION_ID })
        .expect(400);
      await post(`/api/ai/agent/actions/${ACTION_ID}/confirm`, 'premium')
        .send({})
        .expect(400);
    });

    it('blocks basic plans from confirming', async () => {
      await post(`/api/ai/agent/actions/${ACTION_ID}/confirm`, 'basic')
        .send({ sessionId: SESSION_ID })
        .expect(403);
    });
  });

  describe('GET /api/ai/agent/sessions/:sessionId', () => {
    it('returns the session scoped to the user', async () => {
      await request(app.getHttpServer())
        .get(`/api/ai/agent/sessions/${SESSION_ID}`)
        .set('Authorization', 'Bearer premium')
        .expect(200);
      expect(aiProxy.send).toHaveBeenCalledWith(
        'ai-agent.agent.getSession',
        expect.objectContaining({
          data: { sessionId: SESSION_ID, userId: PREMIUM_PATIENT_ID },
        }),
      );
    });
  });

  describe('existing AI routes', () => {
    it('still allow basic plans on /ai/chat', async () => {
      await post('/api/ai/chat', 'basic').send({ message: 'hi' }).expect(201);
    });
  });
});
