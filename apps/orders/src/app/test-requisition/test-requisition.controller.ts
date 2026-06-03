import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateTestRequisitionDto,
  DeclineTestRequisitionDto,
  OrderPatterns,
  PaginationDto,
  UpdateTestRequisitionDto,
} from '@medicpadi-backend/contracts';
import { TestRequisitionService } from './test-requisition.service';

@Controller()
export class TestRequisitionController {
  constructor(
    private readonly testRequisitionService: TestRequisitionService,
  ) {}

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

  @MessagePattern(OrderPatterns.TEST_REQUISITIONS.ACCEPT)
  accept(@Payload('data') id: string) {
    return this.testRequisitionService.accept(id);
  }

  @MessagePattern(OrderPatterns.TEST_REQUISITIONS.DECLINE)
  decline(@Payload('data') dto: DeclineTestRequisitionDto) {
    return this.testRequisitionService.decline(dto);
  }

  @MessagePattern(OrderPatterns.TEST_REQUISITIONS.LIST_PATIENTS)
  listPatients(@Payload('data') labId: string) {
    return this.testRequisitionService.listPatients(labId);
  }

  @MessagePattern(OrderPatterns.TEST_REQUISITIONS.COMPLETE_PAYMENT)
  completePayment(@Payload('data') id: string) {
    return this.testRequisitionService.completePayment(id);
  }
}