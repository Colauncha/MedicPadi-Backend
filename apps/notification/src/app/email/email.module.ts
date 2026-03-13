import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

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
  controllers: [EmailController],
  providers: [EmailService],
})
export class EmailModule {}
