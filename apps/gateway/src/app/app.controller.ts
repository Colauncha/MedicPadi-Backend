import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('gateway-status')
  getStatus() {
    return this.appService.getStatus();
  }

  @Get('services-status')
  getServiceStatus() {
    return this.appService.getServiceStatus();
  }
}
