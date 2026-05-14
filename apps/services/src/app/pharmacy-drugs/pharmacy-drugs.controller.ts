import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PharmacyDrugsService } from './pharmacy-drugs.service';
import {
  CreatePharmacyDrugDto,
  PaginationDto,
  ServicePatterns,
  UpdatePharmacyDrugDto,
} from '@medicpadi-backend/contracts';

@Controller()
export class PharmacyDrugsController {
  constructor(private readonly pharmcyDrugsService: PharmacyDrugsService) {}

  @MessagePattern(ServicePatterns.PHARMCY_DRUGS.CREATE)
  create(@Payload('data') createPharmcyDrugDto: CreatePharmacyDrugDto) {
    return this.pharmcyDrugsService.create(createPharmcyDrugDto);
  }

  @MessagePattern(ServicePatterns.PHARMCY_DRUGS.FIND_ALL)
  findAll(@Payload('data') query: PaginationDto) {
    return this.pharmcyDrugsService.findAll(query);
  }

  @MessagePattern(ServicePatterns.PHARMCY_DRUGS.RETRIEVE)
  findOne(@Payload('data') id: string) {
    return this.pharmcyDrugsService.findOne(id);
  }

  @MessagePattern(ServicePatterns.PHARMCY_DRUGS.UPDATE)
  update(@Payload('data') updatePharmcyDrugDto: UpdatePharmacyDrugDto) {
    return this.pharmcyDrugsService.update(
      updatePharmcyDrugDto.id,
      updatePharmcyDrugDto,
    );
  }

  @MessagePattern(ServicePatterns.PHARMCY_DRUGS.DELETE)
  remove(@Payload('data') id: string) {
    return this.pharmcyDrugsService.remove(id);
  }
}
