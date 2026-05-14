import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateDrugRequisitionDto,
  OrderPatterns,
  PaginationDto,
  UpdateDrugRequisitionDto,
} from '@medicpadi-backend/contracts';
import { DrugRequisitionService } from './drug-requisition.service';

@Controller()
export class DrugRequisitionController {
  constructor(private readonly drugRequisitionService: DrugRequisitionService) {}

  @MessagePattern(OrderPatterns.DRUG_REQUISITIONS.CREATE)
  create(@Payload('data') dto: CreateDrugRequisitionDto) {
    return this.drugRequisitionService.create(dto);
  }

  @MessagePattern(OrderPatterns.DRUG_REQUISITIONS.FIND_ALL)
  findAll(@Payload('data') query: PaginationDto) {
    return this.drugRequisitionService.findAll(query);
  }

  @MessagePattern(OrderPatterns.DRUG_REQUISITIONS.RETRIEVE)
  findOne(@Payload('data') id: string) {
    return this.drugRequisitionService.findOne(id);
  }

  @MessagePattern(OrderPatterns.DRUG_REQUISITIONS.UPDATE)
  update(@Payload('data') dto: UpdateDrugRequisitionDto) {
    return this.drugRequisitionService.update(dto.id, dto);
  }

  @MessagePattern(OrderPatterns.DRUG_REQUISITIONS.DELETE)
  remove(@Payload('data') id: string) {
    return this.drugRequisitionService.remove(id);
  }
}