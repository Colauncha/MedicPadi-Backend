import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DrugRequisitionService } from './drug-requisition.service';
import { CreateDrugRequisitionDto } from '../../../../../contracts/src/lib/dtos/orders/drug-requisition/create-drug-requisition.dto';
import { UpdateDrugRequisitionDto } from '../../../../../contracts/src/lib/dtos/orders/drug-requisition/update-drug-requisition.dto';

@Controller()
export class DrugRequisitionController {
  constructor(
    private readonly drugRequisitionService: DrugRequisitionService,
  ) {}

  @MessagePattern('createDrugRequisition')
  create(@Payload() createDrugRequisitionDto: CreateDrugRequisitionDto) {
    return this.drugRequisitionService.create(createDrugRequisitionDto);
  }

  @MessagePattern('findAllDrugRequisition')
  findAll() {
    return this.drugRequisitionService.findAll();
  }

  @MessagePattern('findOneDrugRequisition')
  findOne(@Payload() id: number) {
    return this.drugRequisitionService.findOne(id);
  }

  @MessagePattern('updateDrugRequisition')
  update(@Payload() updateDrugRequisitionDto: UpdateDrugRequisitionDto) {
    return this.drugRequisitionService.update(
      updateDrugRequisitionDto.id,
      updateDrugRequisitionDto,
    );
  }

  @MessagePattern('removeDrugRequisition')
  remove(@Payload() id: number) {
    return this.drugRequisitionService.remove(id);
  }
}
