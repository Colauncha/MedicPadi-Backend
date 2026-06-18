import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { StatsService } from './stats.service';
import { OrderPatterns } from '@medicpadi-backend/contracts';

@Controller()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @MessagePattern(OrderPatterns.STATS.DOCTOR)
  getDoctorStats(@Payload('data') payload: { providerId: string }) {
    return this.statsService.getDoctorStats(payload.providerId);
  }

  @MessagePattern(OrderPatterns.STATS.LAB)
  getLabStats(@Payload('data') payload: { providerId: string }) {
    return this.statsService.getLabStats(payload.providerId);
  }

  @MessagePattern(OrderPatterns.STATS.PHARMACY)
  getPharmacyStats(@Payload('data') payload: { providerId: string }) {
    return this.statsService.getPharmacyStats(payload.providerId);
  }
}
