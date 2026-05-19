import { Controller } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';
import { EhrPatterns } from '@medicpadi-backend/contracts';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern(EhrPatterns.GET_STATUS)
  getStatus() {
    return this.appService.getStatus();
  }
}
