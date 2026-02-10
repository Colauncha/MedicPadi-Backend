import { Controller } from '@nestjs/common';
import { GatewayService } from './gateway.service';
// import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  // @MessagePattern()
  getHello(): string {
    return this.gatewayService.getHello();
  }
}
