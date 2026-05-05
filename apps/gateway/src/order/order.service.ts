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
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrderService {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
  ) {}

  // Appointments

  async createAppointment(dto: CreateAppointmentDto) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.APPOINTMENTS.CREATE, dto),
    );
  }

  async findAllAppointments(query: PaginationDto) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.APPOINTMENTS.FIND_ALL, query),
    );
  }

  async findOneAppointment(id: string, role: string) {
    let resultObj: any = null;
    let result = firstValueFrom(
      this.orderClient.send(OrderPatterns.APPOINTMENTS.RETRIEVE, id),
    );

    if (role === 'patient') {
      resultObj = Object.assign(new PatientGetAppointmentDto(), result);
    } else if (role === 'consultant') {
      resultObj = Object.assign(new DoctorGetAppointmentDto(), result);
    }

    return resultObj;
  }

  async updateAppointment(id: string, dto: UpdateAppointmentDto) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.APPOINTMENTS.UPDATE, { id, ...dto }),
    );
  }

  async removeAppointment(id: string) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.APPOINTMENTS.DELETE, id),
    );
  }

  // Prescriptions

  async createPrescription(dto: CreatePrescriptionDto) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.PRESCRIPTIONS.CREATE, dto),
    );
  }

  async findAllPrescriptions(query: PaginationDto) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.PRESCRIPTIONS.FIND_ALL, query),
    );
  }

  async findOnePrescription(id: string) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.PRESCRIPTIONS.RETRIEVE, id),
    );
  }

  async updatePrescription(id: string, dto: UpdatePrescriptionDto) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.PRESCRIPTIONS.UPDATE, { id, ...dto }),
    );
  }

  async removePrescription(id: string) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.PRESCRIPTIONS.DELETE, id),
    );
  }

  // Drug Requisitions

  async createDrugRequisition(dto: CreateDrugRequisitionDto) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.DRUG_REQUISITIONS.CREATE, dto),
    );
  }

  async findAllDrugRequisitions(query: PaginationDto) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.DRUG_REQUISITIONS.FIND_ALL, query),
    );
  }

  async findOneDrugRequisition(id: string) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.DRUG_REQUISITIONS.RETRIEVE, id),
    );
  }

  async updateDrugRequisition(id: string, dto: UpdateDrugRequisitionDto) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.DRUG_REQUISITIONS.UPDATE, {
        id,
        ...dto,
      }),
    );
  }

  async removeDrugRequisition(id: string) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.DRUG_REQUISITIONS.DELETE, id),
    );
  }

  // Test Requisitions

  async createTestRequisition(dto: CreateTestRequisitionDto) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.TEST_REQUISITIONS.CREATE, dto),
    );
  }

  async findAllTestRequisitions(query: PaginationDto) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.TEST_REQUISITIONS.FIND_ALL, query),
    );
  }

  async findOneTestRequisition(id: string) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.TEST_REQUISITIONS.RETRIEVE, id),
    );
  }

  async updateTestRequisition(id: string, dto: UpdateTestRequisitionDto) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.TEST_REQUISITIONS.UPDATE, {
        id,
        ...dto,
      }),
    );
  }

  async removeTestRequisition(id: string) {
    return firstValueFrom(
      this.orderClient.send(OrderPatterns.TEST_REQUISITIONS.DELETE, id),
    );
  }
}
