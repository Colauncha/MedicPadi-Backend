import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { join } from 'path';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async welcomeEmail(email: string, name: string, url?: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Welcome to MedicPadi',
      template: 'welcome',
      context: {
        name,
        url,
      },
    });
  }

  async waitlistEmail(email: string, name: string) {
    const response = await this.mailerService.sendMail({
      to: email,
      subject: 'Waitlist Confirmation',
      template: 'waitlist',
      context: {
        name,
        websiteUrl: 'https://medicpadi.com',
        year: new Date().getFullYear(),
      },
      attachments: [
        {
          filename: 'logo.png',
          path: join(__dirname, './app/assets/medicpadi_logo.png'),
          cid: 'logo',
        },
      ],
    });
    console.log('Email sent response:', response);
    return response;
  }
}
