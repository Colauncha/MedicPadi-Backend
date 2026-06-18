import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DrugCategory } from '../../entities/drug_category.entity';
import { DrugCategoryService } from './drug-category.service';
import { DrugCategoryController } from './drug-category.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DrugCategory])],
  controllers: [DrugCategoryController],
  providers: [DrugCategoryService],
})
export class DrugCategoryModule {}
