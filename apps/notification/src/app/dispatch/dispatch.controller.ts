import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  AppointmentCancelledEventDto,
  AppointmentConfirmedEventDto,
  AppointmentCreatedEventDto,
  AppointmentPaymentConfirmedEventDto,
  DrugRequisitionCreatedEventDto,
  NotificationEvents,
  PaymentSuccessEventDto,
  ResetPasswordEmailDto,
  TestRequisitionAcceptedEventDto,
  TestRequisitionCreatedEventDto,
  TestRequisitionDeclinedEventDto,
  WaitlistEmailDto,
  WelcomeEmailDto,
} from '@medicpadi-backend/contracts';
import { NOTIFICATION_QUEUE, NotificationJobNames } from './dispatch.processor';

const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { age: 86400 },
  removeOnFail: { age: 604800 },
};

@Controller()
export class DispatchController {
  constructor(@InjectQueue(NOTIFICATION_QUEUE) private readonly queue: Queue) {}

  @EventPattern(NotificationEvents.WELCOME)
  welcome(@Payload('data') dto: WelcomeEmailDto) {
    return this.queue.add(NotificationJobNames.WELCOME, dto, JOB_OPTIONS);
  }

  @EventPattern(NotificationEvents.WAITLIST)
  waitlist(@Payload('data') dto: WaitlistEmailDto) {
    return this.queue.add(NotificationJobNames.WAITLIST, dto, JOB_OPTIONS);
  }

  @EventPattern(NotificationEvents.RESET_PASSWORD)
  resetPassword(@Payload('data') dto: ResetPasswordEmailDto) {
    return this.queue.add(NotificationJobNames.RESET_PASSWORD, dto, JOB_OPTIONS);
  }

  @EventPattern(NotificationEvents.APPOINTMENT_CREATED)
  appointmentCreated(@Payload('data') dto: AppointmentCreatedEventDto) {
    return this.queue.add(NotificationJobNames.APPOINTMENT_CREATED, dto, JOB_OPTIONS);
  }

  @EventPattern(NotificationEvents.APPOINTMENT_CONFIRMED)
  appointmentConfirmed(@Payload('data') dto: AppointmentConfirmedEventDto) {
    return this.queue.add(NotificationJobNames.APPOINTMENT_CONFIRMED, dto, JOB_OPTIONS);
  }

  @EventPattern(NotificationEvents.APPOINTMENT_PAYMENT_CONFIRMED)
  appointmentPaymentConfirmed(@Payload('data') dto: AppointmentPaymentConfirmedEventDto) {
    return this.queue.add(NotificationJobNames.APPOINTMENT_PAYMENT_CONFIRMED, dto, JOB_OPTIONS);
  }

  @EventPattern(NotificationEvents.APPOINTMENT_CANCELLED)
  appointmentCancelled(@Payload('data') dto: AppointmentCancelledEventDto) {
    return this.queue.add(NotificationJobNames.APPOINTMENT_CANCELLED, dto, JOB_OPTIONS);
  }

  @EventPattern(NotificationEvents.TEST_REQUISITION_CREATED)
  testRequisitionCreated(@Payload('data') dto: TestRequisitionCreatedEventDto) {
    return this.queue.add(NotificationJobNames.TEST_REQUISITION_CREATED, dto, JOB_OPTIONS);
  }

  @EventPattern(NotificationEvents.TEST_REQUISITION_ACCEPTED)
  testRequisitionAccepted(@Payload('data') dto: TestRequisitionAcceptedEventDto) {
    return this.queue.add(NotificationJobNames.TEST_REQUISITION_ACCEPTED, dto, JOB_OPTIONS);
  }

  @EventPattern(NotificationEvents.TEST_REQUISITION_DECLINED)
  testRequisitionDeclined(@Payload('data') dto: TestRequisitionDeclinedEventDto) {
    return this.queue.add(NotificationJobNames.TEST_REQUISITION_DECLINED, dto, JOB_OPTIONS);
  }

  @EventPattern(NotificationEvents.PAYMENT_SUCCESS)
  paymentSuccess(@Payload('data') dto: PaymentSuccessEventDto) {
    return this.queue.add(NotificationJobNames.PAYMENT_SUCCESS, dto, JOB_OPTIONS);
  }

  @EventPattern(NotificationEvents.DRUG_REQUISITION_CREATED)
  drugRequisitionCreated(@Payload('data') dto: DrugRequisitionCreatedEventDto) {
    return this.queue.add(NotificationJobNames.DRUG_REQUISITION_CREATED, dto, JOB_OPTIONS);
  }
}
