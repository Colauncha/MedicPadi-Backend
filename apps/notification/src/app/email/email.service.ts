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
    doctorEmail: string | undefined,
    appointmentTime: string,
    acceptLink?: string,
  ) {
    return Promise.all([
      this.mailerService.sendMail({
        to: email,
        subject: 'Your Appointment Has Been Booked',
        template: 'appointment-created-patient',
        context: {
          patientName,
          doctorName,
          appointmentTime: new Date(appointmentTime).toLocaleString(),
          websiteUrl: 'https://medicpadi.com',
          year: new Date().getFullYear(),
        },
        attachments: [this.logoAttachment],
      }),
      this.mailerService.sendMail({
        to: doctorEmail,
        subject: 'New Appointment Request',
        template: 'appointment-created-doctor',
        context: {
          patientName,
          doctorName,
          appointmentTime: new Date(appointmentTime).toLocaleString(),
          acceptLink,
          websiteUrl: 'https://medicpadi.com',
          year: new Date().getFullYear(),
        },
        attachments: [this.logoAttachment],
      }),
    ]);
  }

  async appointmentConfirmedEmail(
    email: string,
    patientName: string,
    doctorName: string,
    doctorEmail: string | undefined,
    appointmentTime: string,
    paymentLink?: string,
  ) {
    return Promise.all([
      this.mailerService.sendMail({
        to: email,
        subject: 'Your Appointment Has Been Confirmed',
        template: 'appointment-confirmed-patient',
        context: {
          patientName,
          appointmentTime: new Date(appointmentTime).toLocaleString(),
          paymentLink,
          websiteUrl: 'https://medicpadi.com',
          year: new Date().getFullYear(),
        },
        attachments: [this.logoAttachment],
      }),
      this.mailerService.sendMail({
        to: doctorEmail,
        subject: 'Appointment Confirmed',
        template: 'appointment-confirmed-doctor',
        context: {
          doctorName,
          appointmentTime: new Date(appointmentTime).toLocaleString(),
          websiteUrl: 'https://medicpadi.com',
          year: new Date().getFullYear(),
        },
        attachments: [this.logoAttachment],
      }),
    ]);
  }

  async appointmentCancelledEmail(
    email: string,
    patientName: string,
    doctorsNote: string | undefined,
    appointmentTime: string,
  ) {
    return this.mailerService.sendMail({
      to: email,
      subject: 'Your Appointment Has Been Cancelled',
      template: 'appointment-cancelled',
      context: {
        patientName,
        doctorsNote,
        appointmentTime: new Date(appointmentTime).toLocaleString(),
        websiteUrl: 'https://medicpadi.com',
        year: new Date().getFullYear(),
      },
      attachments: [this.logoAttachment],
    });
  }

  async appointmentPaymentConfirmedEmail(
    email: string,
    patientName: string,
    doctorName: string,
    doctorEmail: string | undefined,
    appointmentTime: string,
    joinLink?: string,
    meetingLink?: string,
  ) {
    return Promise.all([
      this.mailerService.sendMail({
        to: email,
        subject: 'Payment Successful for Your Appointment',
        template: 'appointment-payment-success',
        context: {
          patientName,
          appointmentTime: new Date(appointmentTime).toLocaleString(),
          joinLink,
          websiteUrl: 'https://medicpadi.com',
          year: new Date().getFullYear(),
        },
        attachments: [this.logoAttachment],
      }),
      this.mailerService.sendMail({
        to: doctorEmail,
        subject: 'Patient Has Made Payment for Appointment',
        template: 'appointment-payment-success-doctor',
        context: {
          doctorName,
          appointmentTime: new Date(appointmentTime).toLocaleString(),
          meetingLink,
          websiteUrl: 'https://medicpadi.com',
          year: new Date().getFullYear(),
        },
        attachments: [this.logoAttachment],
      }),
    ]);
  }

  async testRequisitionDeclinedEmail(
    patientEmail: string,
    patientName: string,
    labName: string | undefined,
    requisitionId: string,
    notes: string | undefined,
  ) {
    return this.mailerService.sendMail({
      to: patientEmail,
      subject: 'Your Lab Test Requisition Has Been Declined',
      template: 'test-requisition-declined-patient',
      context: {
        patientName,
        labName: labName ?? 'the laboratory',
        requisitionId,
        notes,
        websiteUrl: 'https://medicpadi.com',
        year: new Date().getFullYear(),
      },
      attachments: [this.logoAttachment],
    });
  }

  async testRequisitionAcceptedEmail(
    patientEmail: string,
    patientName: string,
    labName: string | undefined,
    paymentLink: string,
  ) {
    return this.mailerService.sendMail({
      to: patientEmail,
      subject: 'Your Lab Test Requisition Has Been Accepted',
      template: 'test-requisition-accepted-patient',
      context: {
        patientName,
        labName: labName ?? 'the laboratory',
        paymentLink,
        websiteUrl: 'https://medicpadi.com',
        year: new Date().getFullYear(),
      },
      attachments: [this.logoAttachment],
    });
  }

  async testRequisitionCreatedEmail(
    patientEmail: string,
    patientName: string,
    labEmail: string | undefined,
    labName: string | undefined,
    requisitionId: string,
  ) {
    return Promise.all([
      this.mailerService.sendMail({
        to: patientEmail,
        subject: 'Your Lab Test Requisition Has Been Submitted',
        template: 'test-requisition-created-patient',
        context: {
          patientName,
          labName: labName ?? 'the laboratory',
          requisitionId,
          websiteUrl: 'https://medicpadi.com',
          year: new Date().getFullYear(),
        },
        attachments: [this.logoAttachment],
      }),
      labEmail &&
        this.mailerService.sendMail({
          to: labEmail,
          subject: 'New Lab Test Requisition',
          template: 'test-requisition-created-lab',
          context: {
            labName: labName ?? 'Lab',
            patientName,
            requisitionId,
            websiteUrl: 'https://medicpadi.com',
            year: new Date().getFullYear(),
          },
          attachments: [this.logoAttachment],
        }),
    ]);
  }

  async drugRequisitionCreatedEmail(
    patientEmail: string,
    patientName: string,
    pharmacyName: string | undefined,
    requisitionId: string,
    paymentLink: string,
  ) {
    return this.mailerService.sendMail({
      to: patientEmail,
      subject: 'Your Drug Requisition Has Been Created',
      template: 'drug-requisition-created-patient',
      context: {
        patientName,
        pharmacyName: pharmacyName ?? 'the pharmacy',
        requisitionId,
        paymentLink,
        websiteUrl: 'https://medicpadi.com',
        year: new Date().getFullYear(),
      },
      attachments: [this.logoAttachment],
    });
  }

  async verifyEmail(email: string, name: string, otp: number, verifyUrl?: string) {
    return this.mailerService.sendMail({
      to: email,
      subject: 'Verify your email address',
      template: 'verify-email',
      context: {
        name,
        otp,
        verifyUrl,
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
