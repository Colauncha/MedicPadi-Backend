import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateTestRequisitionDto,
  OrderPatterns,
  PaginationDto,
  UpdateTestRequisitionDto,
} from '@medicpadi-backend/contracts';
import { TestRequisitionService } from './test-requisition.service';

@Controller()
export class TestRequisitionController {
  constructor(private readonly testRequisitionService: TestRequisitionService) {}

  @MessagePattern(OrderPatterns.TEST_REQUISITIONS.CREATE)
  create(@Payload('data') dto: CreateTestRequisitionDto) {
    return this.testRequisitionService.create(dto);
  }

  @MessagePattern(OrderPatterns.TEST_REQUISITIONS.FIND_ALL)
  findAll(@Payload('data') query: PaginationDto) {
    return this.testRequisitionService.findAll(query);
  }

  @MessagePattern(OrderPatterns.TEST_REQUISITIONS.RETRIEVE)
  findOne(@Payload('data') id: string) {
    return this.testRequisitionService.findOne(id);
  }

  @MessagePattern(OrderPatterns.TEST_REQUISITIONS.UPDATE)
  update(@Payload('data') dto: UpdateTestRequisitionDto) {
    return this.testRequisitionService.update(dto.id, dto);
  }

  @MessagePattern(OrderPatterns.TEST_REQUISITIONS.DELETE)
  remove(@Payload('data') id: string) {
    return this.testRequisitionService.remove(id);
  }
}