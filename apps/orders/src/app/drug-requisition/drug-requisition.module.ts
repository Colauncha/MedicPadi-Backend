import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DrugRequisition } from '../../entities/drug-requisition.entity';
import { DrugRequisitionItem } from '../../entities/drug-requisition-item.entity';
import { DrugRequisitionController } from './drug-requisition.controller';
import { DrugRequisitionService } from './drug-requisition.service';

@Module({
  imports: [TypeOrmModule.forFeature([DrugRequisition, DrugRequisitionItem])],
  controllers: [DrugRequisitionController],
  providers: [DrugRequisitionService],
})
export class DrugRequisitionModule {}