import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EmailService } from './email.service';
import {
  WelcomeEmailDto,
  WaitlistEmailDto,
  EmailPatterns,
} from '@medicpadi-backend/contracts';

@Controller()
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @EventPattern(EmailPatterns.WELCOME)
  welcome(@Payload() welcomeEmailDto: WelcomeEmailDto) {
    console.log('Received welcome email event:', welcomeEmailDto);
    return this.emailService.welcomeEmail(
      welcomeEmailDto.email,
      welcomeEmailDto.name,
      welcomeEmailDto.verifyUrl,
    );
  }

  @EventPattern(EmailPatterns.WAITLIST)
  waitlist(@Payload() waitlistEmailDto: WaitlistEmailDto) {
    console.log('Received waitlist email event:', waitlistEmailDto);
    return this.emailService.waitlistEmail(
      waitlistEmailDto.email,
      waitlistEmailDto.name,
    );
  }
}
