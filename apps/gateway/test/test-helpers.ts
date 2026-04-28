import { of } from 'rxjs';
import { ConfigModule } from '@nestjs/config';

export const PATIENT_TOKEN = 'mock-patient-token';
export const ADMIN_TOKEN = 'mock-admin-token';
export const LAB_TOKEN = 'mock-lab-token';
export const PHARMACY_TOKEN = 'mock-pharmacy-token';
export const CONSULTANT_TOKEN = 'mock-consultant-token';

export const mockPatientUser = {
  id: 'patient-uuid',
  email: 'patient@test.com',
  role: 'patient',
  phoneNumber: '+2348012345678',
  isVerified: false,
  earlyUser: false,
  createdAt: new Date().toISOString(),
};

export const mockAdminUser = {
  id: 'admin-uuid',
  email: 'admin@test.com',
  role: 'admin',
  phoneNumber: '+2348012345679',
  isVerified: true,
  earlyUser: false,
  createdAt: new Date().toISOString(),
};

export const mockLabUser = {
  id: 'lab-uuid',
  email: 'lab@test.com',
  role: 'lab',
  phoneNumber: '+2348012345670',
  isVerified: true,
  earlyUser: false,
  createdAt: new Date().toISOString(),
};

export const mockPharmacyUser = {
  id: 'pharmacy-uuid',
  email: 'pharmacy@test.com',
  role: 'pharmacy',
  phoneNumber: '+2348012345671',
  isVerified: true,
  earlyUser: false,
  createdAt: new Date().toISOString(),
};

export const mockConsultantUser = {
  id: 'consultant-uuid',
  email: 'consultant@test.com',
  role: 'consultant',
  phoneNumber: '+2348012345672',
  isVerified: true,
  earlyUser: false,
  createdAt: new Date().toISOString(),
};

const TOKEN_USER_MAP: Record<string, any> = {
  [PATIENT_TOKEN]: mockPatientUser,
  [ADMIN_TOKEN]: mockAdminUser,
  [LAB_TOKEN]: mockLabUser,
  [PHARMACY_TOKEN]: mockPharmacyUser,
  [CONSULTANT_TOKEN]: mockConsultantUser,
};

export const createMockAuthProxy = () => ({
  send: jest.fn().mockImplementation((pattern: string, data: any) => {
    switch (pattern) {
      case 'auth.verify': {
        const user = TOKEN_USER_MAP[data];
        return of(user ? { valid: true, user } : { valid: false });
      }
      case 'auth.create':
        return of({
          id: 'new-user-id',
          email: data.email,
          role: data.role || 'patient',
          phoneNumber: data.phoneNumber || null,
        });
      case 'auth.login':
        return of({ access_token: 'mock-jwt-token' });
      case 'auth.update':
        return of({ id: data.id || 'user-id', email: data.email });
      case 'auth.delete':
        return of({ message: 'Account deleted successfully' });
      case 'auth.findById':
        return of(TOKEN_USER_MAP[data] || mockPatientUser);
      case 'auth.requestPasswordReset':
        return of(null);
      case 'auth.resetPassword':
        return of(null);
      case 'auth.status':
        return of({ status: 'OK', service: 'auth' });
      default:
        return of(null);
    }
  }),
  emit: jest.fn().mockReturnValue(of(null)),
  connect: jest.fn(),
  close: jest.fn(),
});

export const createMockProfileProxy = () => ({
  send: jest.fn().mockImplementation((pattern: string, data: any) => {
    if (pattern === 'profile.status') {
      return of({ status: 'OK', service: 'profile' });
    }
    if (pattern.includes('.create')) {
      return of({ id: 'profile-id', user_id: data?.user_id || 'user-id' });
    }
    if (pattern.includes('.retrieve')) {
      return of({ id: 'profile-id', user_id: data });
    }
    if (pattern.includes('.findAll')) {
      return of([{ id: 'profile-id' }]);
    }
    if (pattern.includes('.update')) {
      return of({ id: 'profile-id' });
    }
    return of(null);
  }),
  emit: jest.fn().mockReturnValue(of(null)),
  connect: jest.fn(),
  close: jest.fn(),
});

export const createMockNotificationProxy = () => ({
  send: jest.fn().mockReturnValue(of({ status: 'OK', service: 'notification' })),
  emit: jest.fn().mockReturnValue(of(null)),
  connect: jest.fn(),
  close: jest.fn(),
});

export const createMockServicesProxy = () => ({
  send: jest.fn().mockImplementation((pattern: string, data: any) => {
    switch (pattern) {
      case 'services.status':
        return of({ status: 'OK', service: 'services' });
      case 'services.labTests.create':
        return of({ id: 'lab-test-id', ...data });
      case 'services.labTests.findAll':
        return of({
          data: [{ id: 'lab-test-id', name: 'CBC', price: 5000, available: true, TAT: 24 }],
          total: 1,
          page: 1,
        });
      case 'services.labTests.retrieve':
        return of({ id: data, name: 'CBC', price: 5000, available: true, TAT: 24 });
      case 'services.labTests.update':
        return of({ ...data });
      case 'services.labTests.delete':
        return of({ message: 'Lab test deleted' });
      case 'services.pharmcyDrugs.create':
        return of({ id: 'drug-id', ...data });
      case 'services.pharmcyDrugs.findAll':
        return of({
          data: [{ id: 'drug-id', name: 'Paracetamol', price: 500, available: true }],
          total: 1,
          page: 1,
        });
      case 'services.pharmcyDrugs.retrieve':
        return of({ id: data, name: 'Paracetamol', price: 500, available: true });
      case 'services.pharmcyDrugs.update':
        return of({ ...data });
      case 'services.pharmcyDrugs.delete':
        return of({ message: 'Drug deleted' });
      default:
        return of(null);
    }
  }),
  emit: jest.fn().mockReturnValue(of(null)),
  connect: jest.fn(),
  close: jest.fn(),
});

export const mockAppConfig = () => ({
  appConfig: {
    authServiceHost: 'localhost',
    authServicePort: 3001,
    profileServiceHost: 'localhost',
    profileServicePort: 3002,
    notificationServiceHost: 'localhost',
    notificationServicePort: 3003,
    servicesServiceHost: 'localhost',
    servicesServicePort: 3004,
    ordersServiceHost: 'localhost',
    ordersServicePort: 3005,
    redisHost: 'localhost',
    redisPort: 6379,
    cacheTTL: 60,
    waitlist: false,
  },
});

export const testConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  ignoreEnvFile: true,
  load: [mockAppConfig],
});
