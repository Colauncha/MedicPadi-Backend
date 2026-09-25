import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateEhrRecordDto,
  EhrPatterns,
  EhrRequester,
  PaginationDto,
  UpdateEhrRecordDto,
} from '@medicpadi-backend/contracts';
import { EhrRecordsService } from './ehr-records.service';

@Controller()
export class EhrRecordsController {
  constructor(private readonly ehrRecordsService: EhrRecordsService) {}

  @MessagePattern(EhrPatterns.EHR_RECORDS.CREATE)
  create(
    @Payload('data') data: { dto: CreateEhrRecordDto; requester: EhrRequester },
  ) {
    return this.ehrRecordsService.create(data.dto, data.requester);
  }

  @MessagePattern(EhrPatterns.EHR_RECORDS.FIND_ALL)
  findAll(
    @Payload('data') data: { query: PaginationDto; requester: EhrRequester },
  ) {
    return this.ehrRecordsService.findAll(data.query, data.requester);
  }

  @MessagePattern(EhrPatterns.EHR_RECORDS.RETRIEVE)
  findOne(@Payload('data') data: { id: string; requester: EhrRequester }) {
    return this.ehrRecordsService.findOne(data.id, data.requester);
  }

  @MessagePattern(EhrPatterns.EHR_RECORDS.UPDATE)
  update(
    @Payload('data')
    data: { id: string; dto: UpdateEhrRecordDto; requester: EhrRequester },
  ) {
    return this.ehrRecordsService.update(data.id, data.dto, data.requester);
  }

  @MessagePattern(EhrPatterns.EHR_RECORDS.DELETE)
  remove(@Payload('data') id: string) {
    return this.ehrRecordsService.remove(id);
  }

  // Endpoint to handle incoming EHR records from external sources (e.g., providers)
  // Links | PDFs | Word Docs | FHIR Resources
}
