import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        console.log(join(__dirname, './app/assets/templates'));
        return {
          transport: {
            host: configService.get('smtpConfig.host'),
            port: configService.get('smtpConfig.port'),
            secure: true,
            auth: {
              user: configService.get('smtpConfig.user'),
              pass: configService.get('smtpConfig.pass'),
            },
          },
          defaults: {
            from: '"MedicPadi" <info@biddius.com>',
          },
          template: {
            dir: join(__dirname, './app/assets/templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
