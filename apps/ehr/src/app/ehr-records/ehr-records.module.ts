import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EhrRecord } from '../../entities/ehr-record.entity';
import { EhrRecordsController } from './ehr-records.controller';
import { EhrRecordsService } from './ehr-records.service';

@Module({
  imports: [TypeOrmModule.forFeature([EhrRecord])],
  controllers: [EhrRecordsController],
  providers: [EhrRecordsService],
})
export class EhrRecordsModule {}