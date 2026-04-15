import { Inject, Injectable } from '@nestjs/common';
import {
  ServicePatterns,
  CreateLabTestDto,
  PaginationDto,
  UpdateLabTestDto,
  CreatePharmacyDrugDto,
  UpdatePharmacyDrugDto,
} from '@medicpadi-backend/contracts';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ServicesService {
  constructor(
    @Inject('SERVICES_SERVICE') private readonly servicesClient: ClientProxy,
  ) {}

  //////////////////////////////////////////////////////////////////////
  // Lab Tests methods ////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////
  async createLabTest(createLabTestDto: CreateLabTestDto) {
    try {
      const service = await firstValueFrom(
        this.servicesClient.send(
          ServicePatterns.LAB_TESTS.CREATE,
          createLabTestDto,
        ),
      );
      return service;
    } catch (error) {
      throw error;
    }
  }

  async findAllLabTests(query: PaginationDto) {
    try {
      return await firstValueFrom(
        this.servicesClient.send(ServicePatterns.LAB_TESTS.FIND_ALL, query),
      );
    } catch (error) {
      throw error;
    }
  }

  async findOneLabTest(id: string) {
    try {
      return await firstValueFrom(
        this.servicesClient.send(ServicePatterns.LAB_TESTS.RETRIEVE, id),
      );
    } catch (error) {
      throw error;
    }
  }

  async updateLabTest(id: string, updateLabTestDto: UpdateLabTestDto) {
    try {
      return await firstValueFrom(
        this.servicesClient.send(ServicePatterns.LAB_TESTS.UPDATE, {
          id,
          ...updateLabTestDto,
        }),
      );
    } catch (error) {
      throw error;
    }
  }

  async removeLabTest(id: string) {
    try {
      return await firstValueFrom(
        this.servicesClient.send(ServicePatterns.LAB_TESTS.DELETE, id),
      );
    } catch (error) {
      throw error;
    }
  }

  //////////////////////////////////////////////////////////////////////
  // Pharmacy Drugs methods ///////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////
  async createPharmacyDrug(createPharmacyDrugDto: CreatePharmacyDrugDto) {
    try {
      const service = await firstValueFrom(
        this.servicesClient.send(
          ServicePatterns.PHARMCY_DRUGS.CREATE,
          createPharmacyDrugDto,
        ),
      );
      return service;
    } catch (error) {
      throw error;
    }
  }

  async findAllPharmacyDrugs(query: PaginationDto) {
    try {
      return await firstValueFrom(
        this.servicesClient.send(ServicePatterns.PHARMCY_DRUGS.FIND_ALL, query),
      );
    } catch (error) {
      throw error;
    }
  }

  async findOnePharmacyDrug(id: string) {
    try {
      return await firstValueFrom(
        this.servicesClient.send(ServicePatterns.PHARMCY_DRUGS.RETRIEVE, id),
      );
    } catch (error) {
      throw error;
    }
  }

  async updatePharmacyDrug(
    id: string,
    updatePharmacyDrugDto: UpdatePharmacyDrugDto,
  ) {
    try {
      return await firstValueFrom(
        this.servicesClient.send(ServicePatterns.PHARMCY_DRUGS.UPDATE, {
          id,
          ...updatePharmacyDrugDto,
        }),
      );
    } catch (error) {
      throw error;
    }
  }

  async removePharmacyDrug(id: string) {
    try {
      return await firstValueFrom(
        this.servicesClient.send(ServicePatterns.PHARMCY_DRUGS.DELETE, id),
      );
    } catch (error) {
      throw error;
    }
  }
}
