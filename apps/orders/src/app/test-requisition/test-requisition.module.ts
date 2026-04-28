import { Module } from '@nestjs/common';
import { TestRequisitionService } from './test-requisition.service';
import { TestRequisitionController } from './test-requisition.controller';

@Module({
  controllers: [TestRequisitionController],
  providers: [TestRequisitionService],
})
export class TestRequisitionModule {}
