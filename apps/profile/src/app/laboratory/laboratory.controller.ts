import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LaboratoryService } from './laboratory.service';
import {
  CreateLaboratoryDto,
  LaboratoryPatterns,
  UpdateLaboratoryDto,
} from '@medicpadi-backend/contracts';

@Controller()
export class LaboratoryController {
  constructor(private readonly laboratoryService: LaboratoryService) {}

  @MessagePattern(LaboratoryPatterns.CREATE)
  create(@Payload() createLaboratoryDto: CreateLaboratoryDto) {
    return this.laboratoryService.create(createLaboratoryDto);
  }

  @MessagePattern('findAllLaboratory')
  findAll() {
    return this.laboratoryService.findAll();
  }

  @MessagePattern('findOneLaboratory')
  findOne(@Payload() id: number) {
    return this.laboratoryService.findOne(id);
  }

  @MessagePattern('updateLaboratory')
  update(@Payload() updateLaboratoryDto: UpdateLaboratoryDto) {
    return this.laboratoryService.update(
      updateLaboratoryDto.id,
      updateLaboratoryDto,
    );
  }

  @MessagePattern('removeLaboratory')
  remove(@Payload() id: number) {
    return this.laboratoryService.remove(id);
  }
}
