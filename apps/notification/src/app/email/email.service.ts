import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { join } from 'path';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  private get logoAttachment() {
    return {
      filename: 'logo.png',
      path: join(__dirname, './app/assets/medicpadi_logo.png'),
      cid: 'logo',
    };
  }

  async welcomeEmail(email: string, name: string, url?: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Welcome to MedicPadi',
      template: 'welcome',
      context: { name, url },
    });
  }

  async waitlistEmail(email: string, name: string) {
    return this.mailerService.sendMail({
      to: email,
      subject: 'Waitlist Confirmation',
      template: 'waitlist',
      context: {
        name,
        websiteUrl: 'https://medicpadi.com',
        year: new Date().getFullYear(),
      },
      attachments: [this.logoAttachment],
    });
  }

  async resetPasswordEmail(email: string, name: string, otp: number) {
    return this.mailerService.sendMail({
      to: email,
      subject: 'Password Reset Request',
      template: 'reset-password',
      context: {
        name,
        otp,
        websiteUrl: 'https://medicpadi.com',
        year: new Date().getFullYear(),
      },
      attachments: [this.logoAttachment],
    });
  }

  async appointmentCreatedEmail(
    email: string,
    patientName: string,
    doctorName: string,
    appointmentTime: string,
    joinLink?: string,
  ) {
    return this.mailerService.sendMail({
      to: email,
      subject: 'Your Appointment Has Been Booked',
      template: 'appointment-created',
      context: {
        patientName,
        doctorName,
        appointmentTime: new Date(appointmentTime).toLocaleString(),
        joinLink,
        websiteUrl: 'https://medicpadi.com',
        year: new Date().getFullYear(),
      },
      attachments: [this.logoAttachment],
    });
  }

  async appointmentConfirmedEmail(
    email: string,
    patientName: string,
    appointmentTime: string,
    joinLink?: string,
  ) {
    return this.mailerService.sendMail({
      to: email,
      subject: 'Your Appointment Has Been Confirmed',
      template: 'appointment-confirmed',
      context: {
        patientName,
        appointmentTime: new Date(appointmentTime).toLocaleString(),
        joinLink,
        websiteUrl: 'https://medicpadi.com',
        year: new Date().getFullYear(),
      },
      attachments: [this.logoAttachment],
    });
  }

  async appointmentCancelledEmail(
    email: string,
    patientName: string,
    appointmentTime: string,
  ) {
    return this.mailerService.sendMail({
      to: email,
      subject: 'Your Appointment Has Been Cancelled',
      template: 'appointment-cancelled',
      context: {
        patientName,
        appointmentTime: new Date(appointmentTime).toLocaleString(),
        websiteUrl: 'https://medicpadi.com',
        year: new Date().getFullYear(),
      },
      attachments: [this.logoAttachment],
    });
  }

  async paymentSuccessEmail(
    email: string,
    name: string,
    amount: number,
    currency: string,
    reference: string,
  ) {
    return this.mailerService.sendMail({
      to: email,
      subject: 'Payment Successful',
      template: 'payment-success',
      context: {
        name,
        amount: amount.toLocaleString(),
        currency,
        reference,
        websiteUrl: 'https://medicpadi.com',
        year: new Date().getFullYear(),
      },
      attachments: [this.logoAttachment],
    });
  }
}
