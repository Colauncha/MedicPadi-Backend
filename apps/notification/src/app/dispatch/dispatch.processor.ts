import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  AppointmentCancelledEventDto,
  AppointmentConfirmedEventDto,
  AppointmentCreatedEventDto,
  AppointmentPaymentConfirmedEventDto,
  NotificationChannel,
  NotificationType,
  PaymentSuccessEventDto,
  ResetPasswordEmailDto,
  TestRequisitionAcceptedEventDto,
  TestRequisitionCreatedEventDto,
  TestRequisitionDeclinedEventDto,
  WaitlistEmailDto,
  WelcomeEmailDto,
} from '@medicpadi-backend/contracts';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { DispatchService } from './dispatch.service';

export const NOTIFICATION_QUEUE = 'notification';

export const NotificationJobNames = {
  WELCOME: 'welcome',
  WAITLIST: 'waitlist',
  RESET_PASSWORD: 'reset-password',
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_PAYMENT_CONFIRMED: 'appointment.payment-confirmed',
  TEST_REQUISITION_CREATED: 'requisition.created',
  TEST_REQUISITION_ACCEPTED: 'requisition.accepted',
  TEST_REQUISITION_DECLINED: 'requisition.declined',
  PAYMENT_SUCCESS: 'payment.success',
} as const;

@Processor(NOTIFICATION_QUEUE)
export class DispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(DispatchProcessor.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly dispatchService: DispatchService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case NotificationJobNames.WELCOME:
        return this.handleWelcome(job as Job<WelcomeEmailDto>);
      case NotificationJobNames.WAITLIST:
        return this.handleWaitlist(job as Job<WaitlistEmailDto>);
      case NotificationJobNames.RESET_PASSWORD:
        return this.handleResetPassword(job as Job<ResetPasswordEmailDto>);
      case NotificationJobNames.APPOINTMENT_CREATED:
        return this.handleAppointmentCreated(job as Job<AppointmentCreatedEventDto>);
      case NotificationJobNames.APPOINTMENT_CONFIRMED:
        return this.handleAppointmentConfirmed(job as Job<AppointmentConfirmedEventDto>);
      case NotificationJobNames.APPOINTMENT_PAYMENT_CONFIRMED:
        return this.handleAppointmentPaymentConfirmed(job as Job<AppointmentPaymentConfirmedEventDto>);
      case NotificationJobNames.APPOINTMENT_CANCELLED:
        return this.handleAppointmentCancelled(job as Job<AppointmentCancelledEventDto>);
      case NotificationJobNames.TEST_REQUISITION_CREATED:
        return this.handleTestRequisitionCreated(job as Job<TestRequisitionCreatedEventDto>);
      case NotificationJobNames.TEST_REQUISITION_ACCEPTED:
        return this.handleTestRequisitionAccepted(job as Job<TestRequisitionAcceptedEventDto>);
      case NotificationJobNames.TEST_REQUISITION_DECLINED:
        return this.handleTestRequisitionDeclined(job as Job<TestRequisitionDeclinedEventDto>);
      case NotificationJobNames.PAYMENT_SUCCESS:
        return this.handlePaymentSuccess(job as Job<PaymentSuccessEventDto>);
      default:
        this.logger.warn(`Unhandled job name: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} (${job.name}) completed`);
  }

  private async handleWelcome(job: Job<WelcomeEmailDto>) {
    const { email, name, verifyUrl } = job.data;
    await this.emailService.welcomeEmail(email, name, verifyUrl);
  }

  private async handleWaitlist(job: Job<WaitlistEmailDto>) {
    const { email, name } = job.data;
    await this.emailService.waitlistEmail(email!, name!);
  }

  private async handleResetPassword(job: Job<ResetPasswordEmailDto>) {
    const { email, name, otp } = job.data;
    await this.emailService.resetPasswordEmail(email, name, otp);
  }

  private async handleAppointmentCreated(job: Job<AppointmentCreatedEventDto>) {
    const { appointmentId, patientId, doctorId, appointmentTime, acceptLink } = job.data;

    const [patientAuth, patientProfile, doctorAuth, doctorProfile] = await Promise.all([
      this.dispatchService.resolveUserAuth(patientId),
      this.dispatchService.resolvePatient(patientId),
      this.dispatchService.resolveUserAuth(doctorId),
      this.dispatchService.resolveDoctor(doctorId),
    ]);

    const patientName = this.dispatchService.displayName(patientProfile.firstName, patientProfile.lastName, patientAuth.email);
    const doctorName = this.dispatchService.displayName(doctorProfile.firstName, doctorProfile.lastName, doctorAuth.email, 'Dr. ');

    if (patientProfile.emailNotificationsEnabled) {
      await this.emailService.appointmentCreatedEmail(
        patientAuth.email,
        patientName,
        doctorName,
        doctorProfile.emailNotificationsEnabled ? doctorAuth.email : undefined,
        appointmentTime,
        acceptLink,
      );
    }

    await this.notificationService.create({
      user_id: patientId,
      title: 'Appointment Booked',
      body: `Your appointment with ${doctorName} has been booked for ${new Date(appointmentTime).toLocaleString()}.`,
      type: NotificationType.APPOINTMENT,
      source_id: appointmentId,
      channel: NotificationChannel.IN_APP,
    });

    await this.notificationService.create({
      user_id: doctorId,
      title: 'New Appointment Request',
      body: `${patientName} has booked an appointment for ${new Date(appointmentTime).toLocaleString()}.`,
      type: NotificationType.APPOINTMENT,
      source_id: appointmentId,
      channel: NotificationChannel.IN_APP,
    });
  }

  private async handleAppointmentConfirmed(job: Job<AppointmentConfirmedEventDto>) {
    const { appointmentId, patientId, doctorId, appointmentTime, paymentLink } = job.data;

    const [patientAuth, patientProfile, doctorAuth, doctorProfile] = await Promise.all([
      this.dispatchService.resolveUserAuth(patientId),
      this.dispatchService.resolvePatient(patientId),
      this.dispatchService.resolveUserAuth(doctorId),
      this.dispatchService.resolveDoctor(doctorId),
    ]);

    const patientName = this.dispatchService.displayName(patientProfile.firstName, patientProfile.lastName, patientAuth.email);
    const doctorName = this.dispatchService.displayName(doctorProfile.firstName, doctorProfile.lastName, doctorAuth.email, 'Dr. ');

    if (patientProfile.emailNotificationsEnabled || doctorProfile.emailNotificationsEnabled) {
      await this.emailService.appointmentConfirmedEmail(
        patientProfile.emailNotificationsEnabled ? patientAuth.email : '',
        patientName,
        doctorName,
        doctorProfile.emailNotificationsEnabled ? doctorAuth.email : undefined,
        appointmentTime,
        paymentLink,
      );
    }

    await Promise.all([
      this.notificationService.create({
        user_id: patientId,
        title: 'Appointment Confirmed',
        body: `Your appointment with ${doctorName} on ${new Date(appointmentTime).toLocaleString()} has been confirmed.`,
        type: NotificationType.APPOINTMENT,
        source_id: appointmentId,
        channel: NotificationChannel.IN_APP,
      }),
      this.notificationService.create({
        user_id: doctorId,
        title: 'Appointment Confirmed',
        body: `Your appointment with ${patientName} on ${new Date(appointmentTime).toLocaleString()} is confirmed.`,
        type: NotificationType.APPOINTMENT,
        source_id: appointmentId,
        channel: NotificationChannel.IN_APP,
      }),
    ]);
  }

  private async handleAppointmentPaymentConfirmed(job: Job<AppointmentPaymentConfirmedEventDto>) {
    const { appointmentId, patientId, doctorId, appointmentTime, joinLink, meetingLink } = job.data;

    const [patientAuth, patientProfile, doctorAuth, doctorProfile] = await Promise.all([
      this.dispatchService.resolveUserAuth(patientId),
      this.dispatchService.resolvePatient(patientId),
      this.dispatchService.resolveUserAuth(doctorId),
      this.dispatchService.resolveDoctor(doctorId),
    ]);

    const patientName = this.dispatchService.displayName(patientProfile.firstName, patientProfile.lastName, patientAuth.email);
    const doctorName = this.dispatchService.displayName(doctorProfile.firstName, doctorProfile.lastName, doctorAuth.email, 'Dr. ');

    if (patientProfile.emailNotificationsEnabled || doctorProfile.emailNotificationsEnabled) {
      await this.emailService.appointmentPaymentConfirmedEmail(
        patientProfile.emailNotificationsEnabled ? patientAuth.email : '',
        patientName,
        doctorName,
        doctorProfile.emailNotificationsEnabled ? doctorAuth.email : undefined,
        appointmentTime,
        joinLink,
        meetingLink,
      );
    }

    await Promise.all([
      this.notificationService.create({
        user_id: patientId,
        title: 'Payment Confirmed',
        body: `Your payment for the appointment with ${doctorName} on ${new Date(appointmentTime).toLocaleString()} was successful.`,
        type: NotificationType.PAYMENT,
        source_id: appointmentId,
        channel: NotificationChannel.IN_APP,
      }),
      this.notificationService.create({
        user_id: doctorId,
        title: 'Patient Payment Received',
        body: `${patientName} has paid for the appointment on ${new Date(appointmentTime).toLocaleString()}.`,
        type: NotificationType.PAYMENT,
        source_id: appointmentId,
        channel: NotificationChannel.IN_APP,
      }),
    ]);
  }

  private async handleAppointmentCancelled(job: Job<AppointmentCancelledEventDto>) {
    const { appointmentId, patientId, appointmentTime, reason } = job.data;

    const [patientAuth, patientProfile] = await Promise.all([
      this.dispatchService.resolveUserAuth(patientId),
      this.dispatchService.resolvePatient(patientId),
    ]);

    const patientName = this.dispatchService.displayName(patientProfile.firstName, patientProfile.lastName, patientAuth.email);

    if (patientProfile.emailNotificationsEnabled) {
      await this.emailService.appointmentCancelledEmail(
        patientAuth.email,
        patientName,
        reason,
        appointmentTime,
      );
    }

    await this.notificationService.create({
      user_id: patientId,
      title: 'Appointment Cancelled',
      body: `Your appointment on ${new Date(appointmentTime).toLocaleString()} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
      type: NotificationType.APPOINTMENT,
      source_id: appointmentId,
      channel: NotificationChannel.IN_APP,
    });
  }

  private async handleTestRequisitionCreated(job: Job<TestRequisitionCreatedEventDto>) {
    const { requisitionId, patientId, labId, acceptLink } = job.data;

    const [patientAuth, patientProfile, labAuth, labProfile] = await Promise.all([
      this.dispatchService.resolveUserAuth(patientId),
      this.dispatchService.resolvePatient(patientId),
      this.dispatchService.resolveUserAuth(labId),
      this.dispatchService.resolveLab(labId),
    ]);

    const patientName = this.dispatchService.displayName(patientProfile.firstName, patientProfile.lastName, patientAuth.email);

    await this.emailService.testRequisitionCreatedEmail(
      patientProfile.emailNotificationsEnabled ? patientAuth.email : '',
      patientName,
      labProfile.emailNotificationsEnabled ? labAuth.email : undefined,
      labProfile.name,
      requisitionId,
    );

    await Promise.all([
      this.notificationService.create({
        user_id: patientId,
        title: 'Lab Test Requisition Submitted',
        body: `Your test requisition has been submitted to ${labProfile.name}.`,
        type: NotificationType.REQUISITION,
        source_id: requisitionId,
        channel: NotificationChannel.IN_APP,
      }),
      this.notificationService.create({
        user_id: labId,
        title: 'New Lab Test Requisition',
        body: `${patientName} has submitted a new test requisition.${acceptLink ? ` Review: ${acceptLink}` : ''}`,
        type: NotificationType.REQUISITION,
        source_id: requisitionId,
        channel: NotificationChannel.IN_APP,
      }),
    ]);
  }

  private async handleTestRequisitionAccepted(job: Job<TestRequisitionAcceptedEventDto>) {
    const { requisitionId, patientId, labId, paymentLink } = job.data;

    const [patientAuth, patientProfile, labProfile] = await Promise.all([
      this.dispatchService.resolveUserAuth(patientId),
      this.dispatchService.resolvePatient(patientId),
      this.dispatchService.resolveLab(labId),
    ]);

    const patientName = this.dispatchService.displayName(patientProfile.firstName, patientProfile.lastName, patientAuth.email);

    if (patientProfile.emailNotificationsEnabled) {
      await this.emailService.testRequisitionAcceptedEmail(
        patientAuth.email,
        patientName,
        labProfile.name,
        paymentLink ?? '',
      );
    }

    await this.notificationService.create({
      user_id: patientId,
      title: 'Lab Test Requisition Accepted',
      body: `Your test requisition has been accepted by ${labProfile.name}.${paymentLink ? ' Please proceed to payment.' : ''}`,
      type: NotificationType.REQUISITION,
      source_id: requisitionId,
      channel: NotificationChannel.IN_APP,
    });
  }

  private async handleTestRequisitionDeclined(job: Job<TestRequisitionDeclinedEventDto>) {
    const { requisitionId, patientId, labId, notes } = job.data;

    const [patientAuth, patientProfile, labProfile] = await Promise.all([
      this.dispatchService.resolveUserAuth(patientId),
      this.dispatchService.resolvePatient(patientId),
      this.dispatchService.resolveLab(labId),
    ]);

    const patientName = this.dispatchService.displayName(patientProfile.firstName, patientProfile.lastName, patientAuth.email);

    if (patientProfile.emailNotificationsEnabled) {
      await this.emailService.testRequisitionDeclinedEmail(
        patientAuth.email,
        patientName,
        labProfile.name,
        requisitionId,
        notes,
      );
    }

    await this.notificationService.create({
      user_id: patientId,
      title: 'Lab Test Requisition Declined',
      body: `Your test requisition was declined by ${labProfile.name}.${notes ? ` Reason: ${notes}` : ''}`,
      type: NotificationType.REQUISITION,
      source_id: requisitionId,
      channel: NotificationChannel.IN_APP,
    });
  }

  private async handlePaymentSuccess(job: Job<PaymentSuccessEventDto>) {
    const { userId, amount, currency, reference } = job.data;

    const userAuth = await this.dispatchService.resolveUserAuth(userId);

    await this.emailService.paymentSuccessEmail(
      userAuth.email,
      userAuth.fullName,
      amount,
      currency,
      reference,
    );

    await this.notificationService.create({
      user_id: userId,
      title: 'Payment Successful',
      body: `Your payment of ${amount.toLocaleString()} ${currency} (ref: ${reference}) was successful.`,
      type: NotificationType.PAYMENT,
      source_id: reference,
      channel: NotificationChannel.IN_APP,
    });
  }
}
