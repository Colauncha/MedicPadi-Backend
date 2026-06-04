import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateDepartmentDto,
  PaginationDto,
  ServicePatterns,
  UpdateDepartmentDto,
} from '@medicpadi-backend/contracts';
import { DepartmentService } from './department.service';

@Controller()
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @MessagePattern(ServicePatterns.DEPARTMENTS.CREATE)
  create(@Payload('data') dto: CreateDepartmentDto) {
    return this.departmentService.create(dto);
  }

  @MessagePattern(ServicePatterns.DEPARTMENTS.FIND_ALL)
  findAll(@Payload('data') query: PaginationDto) {
    return this.departmentService.findAll(query);
  }

  @MessagePattern(ServicePatterns.DEPARTMENTS.RETRIEVE)
  findOne(@Payload('data') id: string) {
    return this.departmentService.findOne(id);
  }

  @MessagePattern(ServicePatterns.DEPARTMENTS.UPDATE)
  update(@Payload('data') dto: UpdateDepartmentDto) {
    return this.departmentService.update(dto.id, dto);
  }

  @MessagePattern(ServicePatterns.DEPARTMENTS.DELETE)
  remove(@Payload('data') id: string) {
    return this.departmentService.remove(id);
  }
}
