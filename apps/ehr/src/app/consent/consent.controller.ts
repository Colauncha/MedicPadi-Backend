import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateConsentGrantDto,
  EhrPatterns,
  PaginationDto,
  UpdateConsentGrantDto,
} from '@medicpadi-backend/contracts';
import { ConsentService } from './consent.service';

@Controller()
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @MessagePattern(EhrPatterns.CONSENTS.CREATE)
  create(@Payload('data') dto: CreateConsentGrantDto) {
    return this.consentService.create(dto);
  }

  @MessagePattern(EhrPatterns.CONSENTS.FIND_ALL)
  findAll(@Payload('data') query: PaginationDto) {
    return this.consentService.findAll(query);
  }

  @MessagePattern(EhrPatterns.CONSENTS.RETRIEVE)
  findOne(@Payload('data') id: string) {
    return this.consentService.findOne(id);
  }

  @MessagePattern(EhrPatterns.CONSENTS.UPDATE)
  update(@Payload('data') dto: UpdateConsentGrantDto) {
    return this.consentService.update(dto.id, dto);
  }

  @MessagePattern(EhrPatterns.CONSENTS.REVOKE)
  revoke(@Payload('data') id: string) {
    return this.consentService.revoke(id);
  }
}