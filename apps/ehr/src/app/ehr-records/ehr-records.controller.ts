import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateEhrRecordDto,
  EhrPatterns,
  PaginationDto,
  UpdateEhrRecordDto,
} from '@medicpadi-backend/contracts';
import { EhrRecordsService } from './ehr-records.service';

@Controller()
export class EhrRecordsController {
  constructor(private readonly ehrRecordsService: EhrRecordsService) {}

  @MessagePattern(EhrPatterns.EHR_RECORDS.CREATE)
  create(@Payload() dto: CreateEhrRecordDto) {
    return this.ehrRecordsService.create(dto);
  }

  @MessagePattern(EhrPatterns.EHR_RECORDS.FIND_ALL)
  findAll(@Payload() query: PaginationDto) {
    return this.ehrRecordsService.findAll(query);
  }

  @MessagePattern(EhrPatterns.EHR_RECORDS.RETRIEVE)
  findOne(@Payload() id: string) {
    return this.ehrRecordsService.findOne(id);
  }

  @MessagePattern(EhrPatterns.EHR_RECORDS.UPDATE)
  update(@Payload() dto: UpdateEhrRecordDto) {
    return this.ehrRecordsService.update(dto.id, dto);
  }

  @MessagePattern(EhrPatterns.EHR_RECORDS.DELETE)
  remove(@Payload() id: string) {
    return this.ehrRecordsService.remove(id);
  }
}