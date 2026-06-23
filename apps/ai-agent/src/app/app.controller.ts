import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AiAgentPatterns } from '@medicpadi-backend/contracts';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern(AiAgentPatterns.STATUS)
  getStatus() {
    return this.appService.getStatus();
  }
}
