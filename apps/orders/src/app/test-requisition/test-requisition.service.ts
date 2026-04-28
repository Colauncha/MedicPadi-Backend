import { Injectable } from '@nestjs/common';
import { CreateTestRequisitionDto } from '../../../../../contracts/src/lib/dtos/orders/test-requisition/create-test-requisition.dto';
import { UpdateTestRequisitionDto } from '../../../../../contracts/src/lib/dtos/orders/test-requisition/update-test-requisition.dto';

@Injectable()
export class TestRequisitionService {
  create(createTestRequisitionDto: CreateTestRequisitionDto) {
    return 'This action adds a new testRequisition';
  }

  findAll() {
    return `This action returns all testRequisition`;
  }

  findOne(id: number) {
    return `This action returns a #${id} testRequisition`;
  }

  update(id: number, updateTestRequisitionDto: UpdateTestRequisitionDto) {
    return `This action updates a #${id} testRequisition`;
  }

  remove(id: number) {
    return `This action removes a #${id} testRequisition`;
  }
}
