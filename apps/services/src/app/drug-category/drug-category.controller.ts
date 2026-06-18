import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateDepartmentDto,
  PaginationDto,
  ServicePatterns,
  UpdateDepartmentDto,
} from '@medicpadi-backend/contracts';
import { DrugCategoryService } from './drug-category.service';

@Controller()
export class DrugCategoryController {
  constructor(private readonly drugCategoryService: DrugCategoryService) {}

  @MessagePattern(ServicePatterns.DRUG_CATEGORIES.CREATE)
  create(@Payload('data') dto: CreateDepartmentDto) {
    return this.drugCategoryService.create(dto);
  }

  @MessagePattern(ServicePatterns.DRUG_CATEGORIES.FIND_ALL)
  findAll(@Payload('data') query: PaginationDto) {
    return this.drugCategoryService.findAll(query);
  }

  @MessagePattern(ServicePatterns.DRUG_CATEGORIES.RETRIEVE)
  findOne(@Payload('data') id: string) {
    return this.drugCategoryService.findOne(id);
  }

  @MessagePattern(ServicePatterns.DRUG_CATEGORIES.UPDATE)
  update(@Payload('data') dto: UpdateDepartmentDto) {
    return this.drugCategoryService.update(dto.id, dto);
  }

  @MessagePattern(ServicePatterns.DRUG_CATEGORIES.DELETE)
  remove(@Payload('data') id: string) {
    return this.drugCategoryService.remove(id);
  }
}
