import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TestRequisitionService } from './test-requisition.service';
import { CreateTestRequisitionDto } from '../../../../../contracts/src/lib/dtos/orders/test-requisition/create-test-requisition.dto';
import { UpdateTestRequisitionDto } from '../../../../../contracts/src/lib/dtos/orders/test-requisition/update-test-requisition.dto';

@Controller()
export class TestRequisitionController {
  constructor(
    private readonly testRequisitionService: TestRequisitionService,
  ) {}

  @MessagePattern('createTestRequisition')
  create(@Payload() createTestRequisitionDto: CreateTestRequisitionDto) {
    return this.testRequisitionService.create(createTestRequisitionDto);
  }

  @MessagePattern('findAllTestRequisition')
  findAll() {
    return this.testRequisitionService.findAll();
  }

  @MessagePattern('findOneTestRequisition')
  findOne(@Payload() id: number) {
    return this.testRequisitionService.findOne(id);
  }

  @MessagePattern('updateTestRequisition')
  update(@Payload() updateTestRequisitionDto: UpdateTestRequisitionDto) {
    return this.testRequisitionService.update(
      updateTestRequisitionDto.id,
      updateTestRequisitionDto,
    );
  }

  @MessagePattern('removeTestRequisition')
  remove(@Payload() id: number) {
    return this.testRequisitionService.remove(id);
  }
}
