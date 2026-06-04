import { Inject, Injectable } from '@nestjs/common';
import {
  ServicePatterns,
  CreateLabTestDto,
  PaginationDto,
  UpdateLabTestDto,
  CreatePharmacyDrugDto,
  UpdatePharmacyDrugDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from '@medicpadi-backend/contracts';
import { withServiceAuth } from '@medicpadi-backend/utils';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ServicesService {
  constructor(
    @Inject('SERVICES_SERVICE') private readonly servicesClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>('appConfig.internalServiceToken');
  }

  //////////////////////////////////////////////////////////////////////
  // Lab Tests methods ////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////
  async createLabTest(createLabTestDto: CreateLabTestDto) {
    try {
      return await firstValueFrom(
        this.servicesClient.send(
          ServicePatterns.LAB_TESTS.CREATE,
          withServiceAuth(createLabTestDto, this.serviceToken),
        ),
      );
    } catch (error) {
      throw error;
    }
  }

  async findAllLabTests(query: PaginationDto) {
    try {
      return await firstValueFrom(
        this.servicesClient.send(ServicePatterns.LAB_TESTS.FIND_ALL, withServiceAuth(query, this.serviceToken)),
      );
    } catch (error) {
      throw error;
    }
  }

  async findOneLabTest(id: string) {
    try {
      return await firstValueFrom(
        this.servicesClient.send(ServicePatterns.LAB_TESTS.RETRIEVE, withServiceAuth(id, this.serviceToken)),
      );
    } catch (error) {
      throw error;
    }
  }

  async updateLabTest(id: string, updateLabTestDto: UpdateLabTestDto) {
    try {
      return await firstValueFrom(
        this.servicesClient.send(ServicePatterns.LAB_TESTS.UPDATE, withServiceAuth({ id, ...updateLabTestDto }, this.serviceToken)),
      );
    } catch (error) {
      throw error;
    }
  }

  async removeLabTest(id: string) {
    try {
      return await firstValueFrom(
        this.servicesClient.send(ServicePatterns.LAB_TESTS.DELETE, withServiceAuth(id, this.serviceToken)),
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
      return await firstValueFrom(
        this.servicesClient.send(
          ServicePatterns.PHARMCY_DRUGS.CREATE,
          withServiceAuth(createPharmacyDrugDto, this.serviceToken),
        ),
      );
    } catch (error) {
      throw error;
    }
  }

  async findAllPharmacyDrugs(query: PaginationDto) {
    try {
      return await firstValueFrom(
        this.servicesClient.send(ServicePatterns.PHARMCY_DRUGS.FIND_ALL, withServiceAuth(query, this.serviceToken)),
      );
    } catch (error) {
      throw error;
    }
  }

  async findOnePharmacyDrug(id: string) {
    try {
      return await firstValueFrom(
        this.servicesClient.send(ServicePatterns.PHARMCY_DRUGS.RETRIEVE, withServiceAuth(id, this.serviceToken)),
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
        this.servicesClient.send(ServicePatterns.PHARMCY_DRUGS.UPDATE, withServiceAuth({ id, ...updatePharmacyDrugDto }, this.serviceToken)),
      );
    } catch (error) {
      throw error;
    }
  }

  async removePharmacyDrug(id: string) {
    try {
      return await firstValueFrom(
        this.servicesClient.send(ServicePatterns.PHARMCY_DRUGS.DELETE, withServiceAuth(id, this.serviceToken)),
      );
    } catch (error) {
      throw error;
    }
  }

  //////////////////////////////////////////////////////////////////////
  // Departments methods //////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////

  async createDepartment(dto: CreateDepartmentDto) {
    return firstValueFrom(
      this.servicesClient.send(
        ServicePatterns.DEPARTMENTS.CREATE,
        withServiceAuth(dto, this.serviceToken),
      ),
    );
  }

  async findAllDepartments(query: PaginationDto) {
    return firstValueFrom(
      this.servicesClient.send(
        ServicePatterns.DEPARTMENTS.FIND_ALL,
        withServiceAuth(query, this.serviceToken),
      ),
    );
  }

  async findOneDepartment(id: string) {
    return firstValueFrom(
      this.servicesClient.send(
        ServicePatterns.DEPARTMENTS.RETRIEVE,
        withServiceAuth(id, this.serviceToken),
      ),
    );
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto) {
    return firstValueFrom(
      this.servicesClient.send(
        ServicePatterns.DEPARTMENTS.UPDATE,
        withServiceAuth({ id, ...dto }, this.serviceToken),
      ),
    );
  }

  async removeDepartment(id: string) {
    return firstValueFrom(
      this.servicesClient.send(
        ServicePatterns.DEPARTMENTS.DELETE,
        withServiceAuth(id, this.serviceToken),
      ),
    );
  }
}
