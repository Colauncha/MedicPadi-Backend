import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EmailService } from './email.service';
import {
  WelcomeEmailDto,
  WaitlistEmailDto,
  EmailPatterns,
  ResetPasswordEmailDto,
  AppointmentEmailDto,
  PaymentEmailDto,
} from '@medicpadi-backend/contracts';

@Controller()
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @EventPattern(EmailPatterns.WELCOME)
  welcome(@Payload('data') dto: WelcomeEmailDto) {
    return this.emailService.welcomeEmail(dto.email, dto.name, dto.verifyUrl);
  }

  @EventPattern(EmailPatterns.WAITLIST)
  waitlist(@Payload('data') dto: WaitlistEmailDto) {
    return this.emailService.waitlistEmail(dto.email!, dto.name!);
  }

  @EventPattern(EmailPatterns.RESET_PASSWORD)
  resetPassword(@Payload('data') dto: ResetPasswordEmailDto) {
    return this.emailService.resetPasswordEmail(dto.email, dto.name, dto.otp);
  }

  @EventPattern(EmailPatterns.APPOINTMENT_CREATED)
  appointmentCreated(@Payload('data') dto: AppointmentEmailDto) {
    return this.emailService.appointmentCreatedEmail(
      dto.email,
      dto.patientName,
      dto.doctorName,
      dto.doctorEmail,
      dto.appointmentTime,
      dto.acceptLink,
    );
  }

  @EventPattern(EmailPatterns.APPOINTMENT_CONFIRMED)
  appointmentConfirmed(@Payload('data') dto: AppointmentEmailDto) {
    return this.emailService.appointmentConfirmedEmail(
      dto.email,
      dto.patientName,
      dto.doctorName,
      dto.doctorEmail,
      dto.appointmentTime,
      dto.paymentLink,
    );
  }

  @EventPattern(EmailPatterns.APPOINTMENT_PAYMENT_CONFIRMED)
  appointmentPaymentConfirmed(@Payload('data') dto: AppointmentEmailDto) {
    return this.emailService.appointmentPaymentConfirmedEmail(
      dto.email,
      dto.patientName,
      dto.doctorName,
      dto.doctorEmail,
      dto.appointmentTime,
      dto.joinLink,
      dto.meetingLink,
    );
  }

  @EventPattern(EmailPatterns.APPOINTMENT_CANCELLED)
  appointmentCancelled(@Payload('data') dto: AppointmentEmailDto) {
    return this.emailService.appointmentCancelledEmail(
      dto.email,
      dto.patientName,
      dto.doctorsNote,
      dto.appointmentTime,
    );
  }

  @EventPattern(EmailPatterns.PAYMENT_SUCCESS)
  paymentSuccess(@Payload('data') dto: PaymentEmailDto) {
    return this.emailService.paymentSuccessEmail(
      dto.email,
      dto.name,
      dto.amount,
      dto.currency,
      dto.reference,
    );
  }
}
