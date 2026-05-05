import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestRequisition } from '../../entities/test-requisition.entity';
import { TestRequisitionItem } from '../../entities/test-requisition-item.entity';
import { TestRequisitionController } from './test-requisition.controller';
import { TestRequisitionService } from './test-requisition.service';

@Module({
  imports: [TypeOrmModule.forFeature([TestRequisition, TestRequisitionItem])],
  controllers: [TestRequisitionController],
  providers: [TestRequisitionService],
})
export class TestRequisitionModule {}