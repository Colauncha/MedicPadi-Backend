import { Inject, Injectable } from '@nestjs/common';
import {
  EhrPatterns,
  CreateEhrRecordDto,
  UpdateEhrRecordDto,
  CreateConsentGrantDto,
  UpdateConsentGrantDto,
  PaginationDto,
} from '@medicpadi-backend/contracts';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EhrService {
  constructor(
    @Inject('EHR_SERVICE') private readonly ehrClient: ClientProxy,
  ) {}

  // EHR Records

  async createRecord(dto: CreateEhrRecordDto) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.EHR_RECORDS.CREATE, dto),
    );
  }

  async findAllRecords(query: PaginationDto) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.EHR_RECORDS.FIND_ALL, query),
    );
  }

  async findOneRecord(id: string) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.EHR_RECORDS.RETRIEVE, id),
    );
  }

  async updateRecord(id: string, dto: UpdateEhrRecordDto) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.EHR_RECORDS.UPDATE, { id, ...dto }),
    );
  }

  async removeRecord(id: string) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.EHR_RECORDS.DELETE, id),
    );
  }

  // Consents

  async createConsent(dto: CreateConsentGrantDto) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.CONSENTS.CREATE, dto),
    );
  }

  async findAllConsents(query: PaginationDto) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.CONSENTS.FIND_ALL, query),
    );
  }

  async findOneConsent(id: string) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.CONSENTS.RETRIEVE, id),
    );
  }

  async updateConsent(id: string, dto: UpdateConsentGrantDto) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.CONSENTS.UPDATE, { id, ...dto }),
    );
  }

  async revokeConsent(id: string) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.CONSENTS.REVOKE, id),
    );
  }
}
