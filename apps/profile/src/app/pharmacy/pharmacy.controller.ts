import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PharmacyService } from './pharmacy.service';
import { CreatePharmacyDto } from './dto/create-pharmacy.dto';
import { UpdatePharmacyDto } from './dto/update-pharmacy.dto';

@Controller()
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @MessagePattern('createPharmacy')
  create(@Payload() createPharmacyDto: CreatePharmacyDto) {
    return this.pharmacyService.create(createPharmacyDto);
  }

  @MessagePattern('findAllPharmacy')
  findAll() {
    return this.pharmacyService.findAll();
  }

  @MessagePattern('findOnePharmacy')
  findOne(@Payload() id: number) {
    return this.pharmacyService.findOne(id);
  }

  @MessagePattern('updatePharmacy')
  update(@Payload() updatePharmacyDto: UpdatePharmacyDto) {
    return this.pharmacyService.update(updatePharmacyDto.id, updatePharmacyDto);
  }

  @MessagePattern('removePharmacy')
  remove(@Payload() id: number) {
    return this.pharmacyService.remove(id);
  }
}
