import { Controller } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';
import { ProfilePatterns } from '@medicpadi-backend/contracts';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern(ProfilePatterns.STATUS)
  getStatus() {
    return this.appService.getStatus();
  }
}
