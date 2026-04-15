import { Controller, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { PharmacyService } from './pharmacy.service';
import {
  BusinessHoursDto,
  CreatePharmacyDto,
  DoctorPatterns,
  PaginationDto,
  PharmacyPatterns,
  ServiceError,
  UpdatePharmacyDto,
} from '@medicpadi-backend/contracts';

@Controller()
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @MessagePattern(PharmacyPatterns.CREATE)
  create(@Payload() createPharmacyDto: CreatePharmacyDto) {
    return this.pharmacyService.create(createPharmacyDto);
  }

  @MessagePattern(PharmacyPatterns.FIND_ALL)
  findAll(@Payload() query: PaginationDto) {
    return this.pharmacyService.findAll(query);
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

  @MessagePattern(PharmacyPatterns.UPDATE_BUSINESS_HOURS)
  async updateBusinessHours(
    @Payload() businessHoursDto: BusinessHoursDto & { id: string },
  ) {
    const { id, ...rest } = businessHoursDto;
    if (!rest) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'No business hours provided',
      } as ServiceError);
    }
    if (Object.keys(rest).length === 0) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'No business hours provided',
      } as ServiceError);
    }
    return this.pharmacyService.updateBusinessHours(id, rest);
  }

  @MessagePattern('removePharmacy')
  remove(@Payload() id: string) {
    return this.pharmacyService.remove(id);
  }
}
