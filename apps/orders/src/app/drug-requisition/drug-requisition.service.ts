import { Injectable } from '@nestjs/common';
import { CreateDrugRequisitionDto } from '../../../../../contracts/src/lib/dtos/orders/drug-requisition/create-drug-requisition.dto';
import { UpdateDrugRequisitionDto } from '../../../../../contracts/src/lib/dtos/orders/drug-requisition/update-drug-requisition.dto';

@Injectable()
export class DrugRequisitionService {
  create(createDrugRequisitionDto: CreateDrugRequisitionDto) {
    return 'This action adds a new drugRequisition';
  }

  findAll() {
    return `This action returns all drugRequisition`;
  }

  findOne(id: number) {
    return `This action returns a #${id} drugRequisition`;
  }

  update(id: number, updateDrugRequisitionDto: UpdateDrugRequisitionDto) {
    return `This action updates a #${id} drugRequisition`;
  }

  remove(id: number) {
    return `This action removes a #${id} drugRequisition`;
  }
}
