import { Module } from '@nestjs/common';
import { DrugRequisitionService } from './drug-requisition.service';
import { DrugRequisitionController } from './drug-requisition.controller';

@Module({
  controllers: [DrugRequisitionController],
  providers: [DrugRequisitionService],
})
export class DrugRequisitionModule {}
