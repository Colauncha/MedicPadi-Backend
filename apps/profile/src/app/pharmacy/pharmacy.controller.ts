import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PharmacyService } from './pharmacy.service';
import {
  CreatePharmacyDto,
  DoctorPatterns,
  PharmacyPatterns,
  UpdatePharmacyDto,
} from '@medicpadi-backend/contracts';

@Controller()
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @MessagePattern(PharmacyPatterns.CREATE)
  create(@Payload() createPharmacyDto: CreatePharmacyDto) {
    return this.pharmacyService.create(createPharmacyDto);
  }

  @MessagePattern('findAllPharmacy')
  findAll() {
    return this.pharmacyService.findAll();
  }

  @MessagePattern('findOnePharmacy')
  findOne(@Payload() id: string) {
    return this.pharmacyService.findOne(id);
  }

  @MessagePattern(PharmacyPatterns.RETRIEVE)
  retrieve(@Payload() id: string) {
    return this.pharmacyService.findOne(id);
  }

  @MessagePattern(PharmacyPatterns.UPDATE)
  async update(@Payload() updatePharmacyDto: UpdatePharmacyDto) {
    return this.pharmacyService.update(updatePharmacyDto.id, updatePharmacyDto);
  }

  @MessagePattern('removePharmacy')
  remove(@Payload() id: string) {
    return this.pharmacyService.remove(id);
  }
}
