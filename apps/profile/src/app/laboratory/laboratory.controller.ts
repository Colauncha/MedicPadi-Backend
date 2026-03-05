import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LaboratoryService } from './laboratory.service';
import {
  CreateLaboratoryDto,
  DoctorPatterns,
  LaboratoryPatterns,
  PaginationDto,
  UpdateLaboratoryDto,
} from '@medicpadi-backend/contracts';

@Controller()
export class LaboratoryController {
  constructor(private readonly laboratoryService: LaboratoryService) {}

  @MessagePattern(LaboratoryPatterns.CREATE)
  create(@Payload() createLaboratoryDto: CreateLaboratoryDto) {
    return this.laboratoryService.create(createLaboratoryDto);
  }

  @MessagePattern(LaboratoryPatterns.FIND_ALL)
  findAll(@Payload() query: PaginationDto) {
    return this.laboratoryService.findAll(query);
  }

  @MessagePattern('findOneLaboratory')
  findOne(@Payload() id: string) {
    return this.laboratoryService.findOne(id);
  }

  @MessagePattern(LaboratoryPatterns.RETRIEVE)
  retrieve(@Payload() id: string) {
    return this.laboratoryService.findOne(id);
  }

  @MessagePattern(LaboratoryPatterns.UPDATE)
  async update(@Payload() updateLaboratoryDto: UpdateLaboratoryDto) {
    return this.laboratoryService.update(
      updateLaboratoryDto.id,
      updateLaboratoryDto,
    );
  }

  @MessagePattern('removeLaboratory')
  remove(@Payload() id: string) {
    return this.laboratoryService.remove(id);
  }
}
