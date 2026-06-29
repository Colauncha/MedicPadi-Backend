import { Controller, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { PharmacyService } from './pharmacy.service';
import {
  BusinessHoursDto,
  CreatePharmacyDto,
  DoctorPatterns,
  PharmacyQueryDto,
  PharmacyPatterns,
  ServiceError,
  SettingsDto,
  UpdatePharmacyDto,
} from '@medicpadi-backend/contracts';

@Controller()
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @MessagePattern(PharmacyPatterns.CREATE)
  create(@Payload('data') createPharmacyDto: CreatePharmacyDto) {
    return this.pharmacyService.create(createPharmacyDto);
  }

  @MessagePattern(PharmacyPatterns.FIND_ALL)
  findAll(@Payload('data') query: PharmacyQueryDto) {
    return this.pharmacyService.findAll(query);
  }

  @MessagePattern('findOnePharmacy')
  findOne(@Payload('data') id: string) {
    return this.pharmacyService.findOne(id);
  }

  @MessagePattern(PharmacyPatterns.RETRIEVE)
  retrieve(@Payload('data') id: string) {
    return this.pharmacyService.findOne(id);
  }

  @MessagePattern(PharmacyPatterns.UPDATE)
  async update(@Payload('data') updatePharmacyDto: UpdatePharmacyDto) {
    return this.pharmacyService.update(updatePharmacyDto.id, updatePharmacyDto);
  }

  @MessagePattern(PharmacyPatterns.UPDATE_BUSINESS_HOURS)
  async updateBusinessHours(
    @Payload('data') businessHoursDto: BusinessHoursDto & { id: string },
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

  @MessagePattern(PharmacyPatterns.UPDATE_SETTINGS)
  async updateSettings(@Payload('data') data: SettingsDto & { id: string }) {
    const { id, ...settings } = data;
    return this.pharmacyService.updateSettings(id, settings);
  }

  @MessagePattern('removePharmacy')
  remove(@Payload('data') id: string) {
    return this.pharmacyService.remove(id);
  }
}
