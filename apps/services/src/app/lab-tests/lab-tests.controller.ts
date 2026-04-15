import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LabTestsService } from './lab-tests.service';
import {
  CreateLabTestDto,
  PaginationDto,
  ServicePatterns,
  UpdateLabTestDto,
} from '@medicpadi-backend/contracts';

@Controller()
export class LabTestsController {
  constructor(private readonly labTestsService: LabTestsService) {}

  @MessagePattern(ServicePatterns.LAB_TESTS.CREATE)
  create(@Payload() createLabTestDto: CreateLabTestDto) {
    return this.labTestsService.create(createLabTestDto);
  }

  @MessagePattern(ServicePatterns.LAB_TESTS.FIND_ALL)
  findAll(@Payload() query: PaginationDto) {
    return this.labTestsService.findAll(query);
  }

  @MessagePattern(ServicePatterns.LAB_TESTS.RETRIEVE)
  findOne(@Payload() id: string) {
    return this.labTestsService.findOne(id);
  }

  @MessagePattern(ServicePatterns.LAB_TESTS.UPDATE)
  update(@Payload() updateLabTestDto: UpdateLabTestDto) {
    return this.labTestsService.update(updateLabTestDto.id, updateLabTestDto);
  }

  @MessagePattern(ServicePatterns.LAB_TESTS.DELETE)
  remove(@Payload() id: string) {
    return this.labTestsService.remove(id);
  }
}
