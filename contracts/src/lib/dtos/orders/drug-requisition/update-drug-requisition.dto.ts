import { PartialType } from '@nestjs/mapped-types';
import { CreateDrugRequisitionDto } from './create-drug-requisition.dto';

export class UpdateDrugRequisitionDto extends PartialType(CreateDrugRequisitionDto) {
  id: number;
}
