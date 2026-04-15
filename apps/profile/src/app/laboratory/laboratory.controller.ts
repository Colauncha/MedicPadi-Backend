import { Controller, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { LaboratoryService } from './laboratory.service';
import {
  BusinessHoursDto,
  CreateLaboratoryDto,
  LaboratoryPatterns,
  PaginationDto,
  ServiceError,
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
    const { id, ...rest } = updateLaboratoryDto;
    return this.laboratoryService.update(id, rest);
  }

  @MessagePattern(LaboratoryPatterns.UPDATE_BUSINESS_HOURS)
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
    return this.laboratoryService.updateBusinessHours(id, rest);
  }

  @MessagePattern('removeLaboratory')
  remove(@Payload() id: string) {
    return this.laboratoryService.remove(id);
  }
}
