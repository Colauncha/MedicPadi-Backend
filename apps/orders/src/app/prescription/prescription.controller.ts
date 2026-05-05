import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreatePrescriptionDto,
  OrderPatterns,
  PaginationDto,
  UpdatePrescriptionDto,
} from '@medicpadi-backend/contracts';
import { PrescriptionService } from './prescription.service';

@Controller()
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @MessagePattern(OrderPatterns.PRESCRIPTIONS.CREATE)
  create(@Payload() dto: CreatePrescriptionDto) {
    return this.prescriptionService.create(dto);
  }

  @MessagePattern(OrderPatterns.PRESCRIPTIONS.FIND_ALL)
  findAll(@Payload() query: PaginationDto) {
    return this.prescriptionService.findAll(query);
  }

  @MessagePattern(OrderPatterns.PRESCRIPTIONS.RETRIEVE)
  findOne(@Payload() id: string) {
    return this.prescriptionService.findOne(id);
  }

  @MessagePattern(OrderPatterns.PRESCRIPTIONS.UPDATE)
  update(@Payload() dto: UpdatePrescriptionDto) {
    return this.prescriptionService.update(dto.id, dto);
  }

  @MessagePattern(OrderPatterns.PRESCRIPTIONS.DELETE)
  remove(@Payload() id: string) {
    return this.prescriptionService.remove(id);
  }
}