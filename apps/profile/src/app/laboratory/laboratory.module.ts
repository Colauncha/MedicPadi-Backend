import { Module } from '@nestjs/common';
import { LaboratoryService } from './laboratory.service';
import { LaboratoryController } from './laboratory.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Laboratory } from '../../entities/laboratory.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Laboratory])],
  controllers: [LaboratoryController],
  providers: [LaboratoryService],
})
export class LaboratoryModule {}
