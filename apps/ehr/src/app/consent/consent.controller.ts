import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateConsentGrantDto,
  EhrPatterns,
  EhrRequester,
  PaginationDto,
  RequestConsentDto,
  UpdateConsentGrantDto,
} from '@medicpadi-backend/contracts';
import { ConsentService } from './consent.service';

@Controller()
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @MessagePattern(EhrPatterns.CONSENTS.CREATE)
  create(
    @Payload('data')
    data: { dto: CreateConsentGrantDto; requester: EhrRequester },
  ) {
    return this.consentService.create(data.dto, data.requester);
  }

  @MessagePattern(EhrPatterns.CONSENTS.FIND_ALL)
  findAll(
    @Payload('data') data: { query: PaginationDto; requester: EhrRequester },
  ) {
    return this.consentService.findAll(data.query, data.requester);
  }

  @MessagePattern(EhrPatterns.CONSENTS.RETRIEVE)
  findOne(@Payload('data') data: { id: string; requester: EhrRequester }) {
    return this.consentService.findOne(data.id, data.requester);
  }

  @MessagePattern(EhrPatterns.CONSENTS.UPDATE)
  update(
    @Payload('data')
    data: { id: string; dto: UpdateConsentGrantDto; requester: EhrRequester },
  ) {
    return this.consentService.update(data.id, data.dto, data.requester);
  }

  @MessagePattern(EhrPatterns.CONSENTS.REVOKE)
  revoke(@Payload('data') data: { id: string; requester: EhrRequester }) {
    return this.consentService.revoke(data.id, data.requester);
  }

  @MessagePattern(EhrPatterns.CONSENTS.REQUEST)
  request(
    @Payload('data') data: { dto: RequestConsentDto; requester: EhrRequester },
  ) {
    return this.consentService.request(data.dto, data.requester);
  }

  @MessagePattern(EhrPatterns.CONSENTS.APPROVE)
  approve(@Payload('data') data: { id: string; requester: EhrRequester }) {
    return this.consentService.approve(data.id, data.requester);
  }

  @MessagePattern(EhrPatterns.CONSENTS.DECLINE)
  decline(@Payload('data') data: { id: string; requester: EhrRequester }) {
    return this.consentService.decline(data.id, data.requester);
  }

  @MessagePattern(EhrPatterns.CONSENTS.CANCEL)
  cancel(@Payload('data') data: { id: string; requester: EhrRequester }) {
    return this.consentService.cancel(data.id, data.requester);
  }
}
