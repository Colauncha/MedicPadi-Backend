import { PartialType } from '@nestjs/mapped-types';
import { CreateTestRequisitionDto } from './create-test-requisition.dto';

export class UpdateTestRequisitionDto extends PartialType(CreateTestRequisitionDto) {
  id: number;
}
