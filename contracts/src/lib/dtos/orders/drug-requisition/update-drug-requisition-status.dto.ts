import { PickType } from '@nestjs/mapped-types';
import { CreateDrugRequisitionDto } from './create-drug-requisition.dto';

/** Optional reason a pharmacy gives when declining a requisition. */
export class DeclineDrugRequisitionDto extends PickType(
  CreateDrugRequisitionDto,
  ['notes'] as const,
) {}
