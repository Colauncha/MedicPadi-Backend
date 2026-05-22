import { Inject, Injectable } from '@nestjs/common';
import {
  OrderPatterns,
  CreateAppointmentDto,
  UpdateAppointmentDto,
  CreatePrescriptionDto,
  UpdatePrescriptionDto,
  CreateDrugRequisitionDto,
  UpdateDrugRequisitionDto,
  CreateTestRequisitionDto,
  UpdateTestRequisitionDto,
  PatientGetAppointmentDto,
  DoctorGetAppointmentDto,
  PaginationDto,
} from '@medicpadi-backend/contracts';
import { withServiceAuth } from '@medicpadi-backend/utils';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrderService {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>(
      'appConfig.internalServiceToken',
    );
  }

  // Appointments

  async createAppointment(dto: CreateAppointmentDto) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.APPOINTMENTS.CREATE,
        withServiceAuth(dto, this.serviceToken),
      ),
    );
  }

  async findAllAppointments(query: PaginationDto) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.APPOINTMENTS.FIND_ALL,
        withServiceAuth(query, this.serviceToken),
      ),
    );
  }

  async findOneAppointment(id: string, role: string) {
    let resultObj: any = null;
    let result = await firstValueFrom(
      this.orderClient.send(
        OrderPatterns.APPOINTMENTS.RETRIEVE,
        withServiceAuth(id, this.serviceToken),
      ),
    );

    console.log('Order Service - findOneAppointment result:', result);

    if (role === 'patient') {
      resultObj = Object.assign(new PatientGetAppointmentDto(), result);
    } else if (role === 'consultant') {
      resultObj = Object.assign(new DoctorGetAppointmentDto(), result);
    }

    return resultObj;
  }

  async updateAppointment(id: string, dto: UpdateAppointmentDto) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.APPOINTMENTS.UPDATE,
        withServiceAuth({ id, ...dto }, this.serviceToken),
      ),
    );
  }

  async acceptAppointment(id: string) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.APPOINTMENTS.ACCEPT,
        withServiceAuth(id, this.serviceToken),
      ),
    );
  }

  async removeAppointment(id: string) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.APPOINTMENTS.DELETE,
        withServiceAuth(id, this.serviceToken),
      ),
    );
  }

  // Prescriptions

  async createPrescription(dto: CreatePrescriptionDto) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.PRESCRIPTIONS.CREATE,
        withServiceAuth(dto, this.serviceToken),
      ),
    );
  }

  async findAllPrescriptions(query: PaginationDto) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.PRESCRIPTIONS.FIND_ALL,
        withServiceAuth(query, this.serviceToken),
      ),
    );
  }

  async findOnePrescription(id: string) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.PRESCRIPTIONS.RETRIEVE,
        withServiceAuth(id, this.serviceToken),
      ),
    );
  }

  async updatePrescription(id: string, dto: UpdatePrescriptionDto) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.PRESCRIPTIONS.UPDATE,
        withServiceAuth({ id, ...dto }, this.serviceToken),
      ),
    );
  }

  async removePrescription(id: string) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.PRESCRIPTIONS.DELETE,
        withServiceAuth(id, this.serviceToken),
      ),
    );
  }

  // Drug Requisitions

  async createDrugRequisition(dto: CreateDrugRequisitionDto) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.DRUG_REQUISITIONS.CREATE,
        withServiceAuth(dto, this.serviceToken),
      ),
    );
  }

  async findAllDrugRequisitions(query: PaginationDto) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.DRUG_REQUISITIONS.FIND_ALL,
        withServiceAuth(query, this.serviceToken),
      ),
    );
  }

  async findOneDrugRequisition(id: string) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.DRUG_REQUISITIONS.RETRIEVE,
        withServiceAuth(id, this.serviceToken),
      ),
    );
  }

  async updateDrugRequisition(id: string, dto: UpdateDrugRequisitionDto) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.DRUG_REQUISITIONS.UPDATE,
        withServiceAuth({ id, ...dto }, this.serviceToken),
      ),
    );
  }

  async removeDrugRequisition(id: string) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.DRUG_REQUISITIONS.DELETE,
        withServiceAuth(id, this.serviceToken),
      ),
    );
  }

  // Test Requisitions

  async createTestRequisition(dto: CreateTestRequisitionDto) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.TEST_REQUISITIONS.CREATE,
        withServiceAuth(dto, this.serviceToken),
      ),
    );
  }

  async findAllTestRequisitions(query: PaginationDto) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.TEST_REQUISITIONS.FIND_ALL,
        withServiceAuth(query, this.serviceToken),
      ),
    );
  }

  async findOneTestRequisition(id: string) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.TEST_REQUISITIONS.RETRIEVE,
        withServiceAuth(id, this.serviceToken),
      ),
    );
  }

  async updateTestRequisition(id: string, dto: UpdateTestRequisitionDto) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.TEST_REQUISITIONS.UPDATE,
        withServiceAuth({ id, ...dto }, this.serviceToken),
      ),
    );
  }

  async removeTestRequisition(id: string) {
    return firstValueFrom(
      this.orderClient.send(
        OrderPatterns.TEST_REQUISITIONS.DELETE,
        withServiceAuth(id, this.serviceToken),
      ),
    );
  }
}
