import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';
import { ServicePatterns } from '@medicpadi-backend/contracts';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @MessagePattern(ServicePatterns.STATUS)
  getStatus() {
    return this.appService.getStatus();
  }
}
