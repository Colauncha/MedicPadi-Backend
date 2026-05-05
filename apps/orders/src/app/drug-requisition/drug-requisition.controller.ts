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
  create(@Payload() dto: CreateDrugRequisitionDto) {
    return this.drugRequisitionService.create(dto);
  }

  @MessagePattern(OrderPatterns.DRUG_REQUISITIONS.FIND_ALL)
  findAll(@Payload() query: PaginationDto) {
    return this.drugRequisitionService.findAll(query);
  }

  @MessagePattern(OrderPatterns.DRUG_REQUISITIONS.RETRIEVE)
  findOne(@Payload() id: string) {
    return this.drugRequisitionService.findOne(id);
  }

  @MessagePattern(OrderPatterns.DRUG_REQUISITIONS.UPDATE)
  update(@Payload() dto: UpdateDrugRequisitionDto) {
    return this.drugRequisitionService.update(dto.id, dto);
  }

  @MessagePattern(OrderPatterns.DRUG_REQUISITIONS.DELETE)
  remove(@Payload() id: string) {
    return this.drugRequisitionService.remove(id);
  }
}