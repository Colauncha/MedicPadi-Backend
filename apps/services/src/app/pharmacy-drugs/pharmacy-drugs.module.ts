import { Module } from '@nestjs/common';
import { PharmacyDrugsService } from './pharmacy-drugs.service';
import { PharmacyDrugsController } from './pharmacy-drugs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PharmacyDrug } from '../../entities/pharmacy-drug.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PharmacyDrug])],
  controllers: [PharmacyDrugsController],
  providers: [PharmacyDrugsService],
})
export class PharmacyDrugsModule {}
