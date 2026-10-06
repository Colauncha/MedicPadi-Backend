import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { DataSource, Repository } from 'typeorm';
import { of, throwError } from 'rxjs';
import {
  AppointmentPaymentStatus,
  AppointmentStatus,
  AuthRole,
  NotificationEvents,
  TransactionPatterns,
} from '@medicpadi-backend/contracts';
import { AppointmentService } from './appointment.service';
import { Appointment } from '../../entities/appointment.entity';
import { ZoomService } from './providers/zoom.service';

const PATIENT = 'patient-1';
const DOCTOR = 'doctor-1';

const makeAppointment = (overrides: Partial<Appointment> = {}) =>
  ({
    id: 'appointment-1',
    patient_id: PATIENT,
    provider_id: DOCTOR,
    status: AppointmentStatus.CONFIRMED,
    paymentStatus: AppointmentPaymentStatus.P_CONFIRMED,
    appointment_time: new Date('2026-10-10T10:00:00Z'),
    ...overrides,
  }) as Appointment;

const rpcStatus = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(RpcException);
    return ((error as RpcException).getError() as { statusCode: number })
      .statusCode;
  }
  throw new Error('Expected promise to reject');
};

describe('AppointmentService payment flows', () => {
  let service: AppointmentService;
  let repo: {
    findOne: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let transactionsClient: { send: jest.Mock };
  let zoomService: { deleteMeeting: jest.Mock };
  let notificationClient: { emit: jest.Mock };

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn(async (e) => e),
      update: jest.fn(),
      remove: jest.fn(),
    };
    transactionsClient = { send: jest.fn(() => of({ message: 'ok' })) };
    zoomService = { deleteMeeting: jest.fn() };
    notificationClient = { emit: jest.fn() };
    const configService = {
      getOrThrow: jest.fn(() => 'token'),
      get: jest.fn((key: string) =>
        key === 'appConfig.frontendUrl'
          ? 'https://app.medicpadi.test'
          : undefined,
      ),
    } as unknown as ConfigService;

    service = new AppointmentService(
      repo as unknown as Repository<Appointment>,
      {} as DataSource,
      {} as JwtService,
      zoomService as unknown as ZoomService,
      {} as ClientProxy,
      transactionsClient as unknown as ClientProxy,
      {} as ClientProxy,
      notificationClient as unknown as ClientProxy,
      configService,
    );
  });

  describe('completeAppointment', () => {
    it('marks it completed and asks the patient to confirm, without paying the doctor', async () => {
      const appointment = makeAppointment();
      repo.findOne.mockResolvedValue(appointment);

      await service.completeAppointment(
        'appointment-1',
        DOCTOR,
        AuthRole.CONSULTANT,
      );

      expect(appointment.status).toBe(AppointmentStatus.COMPLETED);
      expect(appointment.paymentStatus).toBe(
        AppointmentPaymentStatus.P_CONFIRMED,
      );
      expect(transactionsClient.send).not.toHaveBeenCalled();
      expect(notificationClient.emit).toHaveBeenCalledWith(
        NotificationEvents.APPOINTMENT_COMPLETED,
        expect.objectContaining({
          data: {
            appointmentId: 'appointment-1',
            patientId: PATIENT,
            doctorId: DOCTOR,
            appointmentTime: '2026-10-10T10:00:00.000Z',
            confirmLink:
              'https://app.medicpadi.test/appointments/appointment-1',
          },
        }),
      );
    });

    it('does not notify when the appointment cannot be completed', async () => {
      repo.findOne.mockResolvedValue(
        makeAppointment({ paymentStatus: AppointmentPaymentStatus.P_PENDING }),
      );

      await expect(
        service.completeAppointment(
          'appointment-1',
          DOCTOR,
          AuthRole.CONSULTANT,
        ),
      ).rejects.toBeInstanceOf(RpcException);
      expect(notificationClient.emit).not.toHaveBeenCalled();
    });
  });

  describe('confirmCompletion', () => {
    const completed = () =>
      makeAppointment({ status: AppointmentStatus.COMPLETED });

    it('credits the provider and marks the payment completed', async () => {
      const appointment = completed();
      repo.findOne.mockResolvedValue(appointment);

      await service.confirmCompletion(
        'appointment-1',
        PATIENT,
        AuthRole.PATIENT,
      );

      expect(transactionsClient.send).toHaveBeenCalledWith(
        TransactionPatterns.TRANSACTIONS.CREDIT_PROVIDER,
        expect.objectContaining({ data: 'appointment-1' }),
      );
      expect(appointment.paymentStatus).toBe(
        AppointmentPaymentStatus.P_COMPLETED,
      );
      expect(repo.save).toHaveBeenCalledWith(appointment);
    });

    it('lets an admin confirm on the patient’s behalf', async () => {
      repo.findOne.mockResolvedValue(completed());

      await service.confirmCompletion(
        'appointment-1',
        'admin-1',
        AuthRole.ADMIN,
      );

      expect(transactionsClient.send).toHaveBeenCalled();
    });

    it('forbids anyone other than the patient', async () => {
      repo.findOne.mockResolvedValue(completed());

      expect(
        await rpcStatus(
          service.confirmCompletion(
            'appointment-1',
            DOCTOR,
            AuthRole.CONSULTANT,
          ),
        ),
      ).toBe(HttpStatus.FORBIDDEN);
      expect(transactionsClient.send).not.toHaveBeenCalled();
    });

    it('rejects before the doctor has completed the appointment', async () => {
      repo.findOne.mockResolvedValue(makeAppointment());

      expect(
        await rpcStatus(
          service.confirmCompletion('appointment-1', PATIENT, AuthRole.PATIENT),
        ),
      ).toBe(HttpStatus.BAD_REQUEST);
      expect(transactionsClient.send).not.toHaveBeenCalled();
    });

    it('does not credit twice once confirmed', async () => {
      repo.findOne.mockResolvedValue(
        makeAppointment({
          status: AppointmentStatus.COMPLETED,
          paymentStatus: AppointmentPaymentStatus.P_COMPLETED,
        }),
      );

      const result = await service.confirmCompletion(
        'appointment-1',
        PATIENT,
        AuthRole.PATIENT,
      );

      expect(result).toMatchObject({
        message: 'Appointment already confirmed',
      });
      expect(transactionsClient.send).not.toHaveBeenCalled();
    });

    it('leaves the payment status unchanged when crediting fails', async () => {
      const appointment = completed();
      repo.findOne.mockResolvedValue(appointment);
      transactionsClient.send.mockReturnValue(
        throwError(() => new RpcException({ statusCode: 400 })),
      );

      await expect(
        service.confirmCompletion('appointment-1', PATIENT, AuthRole.PATIENT),
      ).rejects.toBeInstanceOf(RpcException);
      expect(appointment.paymentStatus).toBe(
        AppointmentPaymentStatus.P_CONFIRMED,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('refunds a paid appointment before cancelling it', async () => {
      repo.findOne.mockResolvedValue(makeAppointment());

      const result = await service.cancel(
        'appointment-1',
        'Unavailable',
        PATIENT,
        AuthRole.PATIENT,
      );

      expect(transactionsClient.send).toHaveBeenCalledWith(
        TransactionPatterns.TRANSACTIONS.REFUND,
        expect.objectContaining({ data: 'appointment-1' }),
      );
      expect(repo.update).toHaveBeenCalledWith(
        { id: 'appointment-1' },
        {
          status: AppointmentStatus.CANCELLED,
          doctorsNote: 'Unavailable',
          paymentStatus: AppointmentPaymentStatus.P_CANCELLED,
        },
      );
      expect(result).toMatchObject({ refunded: true });
    });

    it('does not refund an unpaid appointment', async () => {
      repo.findOne.mockResolvedValue(
        makeAppointment({ paymentStatus: AppointmentPaymentStatus.P_PENDING }),
      );

      await service.cancel(
        'appointment-1',
        'Busy',
        DOCTOR,
        AuthRole.CONSULTANT,
      );

      expect(transactionsClient.send).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(
        { id: 'appointment-1' },
        { status: AppointmentStatus.CANCELLED, doctorsNote: 'Busy' },
      );
    });

    it('keeps the appointment when the refund fails', async () => {
      repo.findOne.mockResolvedValue(makeAppointment({ meeting_id: 123 }));
      transactionsClient.send.mockReturnValue(
        throwError(() => new RpcException({ statusCode: 502 })),
      );

      await expect(
        service.cancel('appointment-1', 'x', PATIENT, AuthRole.PATIENT),
      ).rejects.toBeInstanceOf(RpcException);
      expect(repo.update).not.toHaveBeenCalled();
      expect(zoomService.deleteMeeting).not.toHaveBeenCalled();
    });

    it('forbids users who are not part of the appointment', async () => {
      repo.findOne.mockResolvedValue(makeAppointment());

      expect(
        await rpcStatus(
          service.cancel('appointment-1', 'x', 'stranger', AuthRole.PATIENT),
        ),
      ).toBe(HttpStatus.FORBIDDEN);
    });

    it('only lets an admin cancel a completed, unconfirmed appointment', async () => {
      const completed = makeAppointment({
        status: AppointmentStatus.COMPLETED,
      });
      repo.findOne.mockResolvedValue(completed);

      expect(
        await rpcStatus(
          service.cancel('appointment-1', 'x', PATIENT, AuthRole.PATIENT),
        ),
      ).toBe(HttpStatus.BAD_REQUEST);

      await service.cancel(
        'appointment-1',
        'Dispute',
        'admin-1',
        AuthRole.ADMIN,
      );
      expect(transactionsClient.send).toHaveBeenCalledWith(
        TransactionPatterns.TRANSACTIONS.REFUND,
        expect.anything(),
      );
    });

    it('rejects cancelling once the provider has been paid', async () => {
      repo.findOne.mockResolvedValue(
        makeAppointment({
          status: AppointmentStatus.COMPLETED,
          paymentStatus: AppointmentPaymentStatus.P_COMPLETED,
        }),
      );

      expect(
        await rpcStatus(
          service.cancel('appointment-1', 'x', 'admin-1', AuthRole.ADMIN),
        ),
      ).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('remove', () => {
    it('refuses to delete a paid appointment', async () => {
      repo.findOne.mockResolvedValue(makeAppointment());

      expect(await rpcStatus(service.remove('appointment-1'))).toBe(
        HttpStatus.BAD_REQUEST,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('deletes an unpaid appointment', async () => {
      const appointment = makeAppointment({
        paymentStatus: AppointmentPaymentStatus.P_PENDING,
      });
      repo.findOne.mockResolvedValue(appointment);

      await service.remove('appointment-1');

      expect(repo.remove).toHaveBeenCalledWith(appointment);
    });
  });
});
