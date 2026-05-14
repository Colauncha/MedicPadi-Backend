import { Inject, Injectable } from '@nestjs/common';
import {
  EhrPatterns,
  CreateEhrRecordDto,
  UpdateEhrRecordDto,
  CreateConsentGrantDto,
  UpdateConsentGrantDto,
  PaginationDto,
} from '@medicpadi-backend/contracts';
import { withServiceAuth } from '@medicpadi-backend/utils';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EhrService {
  constructor(
    @Inject('EHR_SERVICE') private readonly ehrClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>('appConfig.internalServiceToken');
  }

  // EHR Records

  async createRecord(dto: CreateEhrRecordDto) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.EHR_RECORDS.CREATE, withServiceAuth(dto, this.serviceToken)),
    );
  }

  async findAllRecords(query: PaginationDto) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.EHR_RECORDS.FIND_ALL, withServiceAuth(query, this.serviceToken)),
    );
  }

  async findOneRecord(id: string) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.EHR_RECORDS.RETRIEVE, withServiceAuth(id, this.serviceToken)),
    );
  }

  async updateRecord(id: string, dto: UpdateEhrRecordDto) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.EHR_RECORDS.UPDATE, withServiceAuth({ id, ...dto }, this.serviceToken)),
    );
  }

  async removeRecord(id: string) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.EHR_RECORDS.DELETE, withServiceAuth(id, this.serviceToken)),
    );
  }

  // Consents

  async createConsent(dto: CreateConsentGrantDto) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.CONSENTS.CREATE, withServiceAuth(dto, this.serviceToken)),
    );
  }

  async findAllConsents(query: PaginationDto) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.CONSENTS.FIND_ALL, withServiceAuth(query, this.serviceToken)),
    );
  }

  async findOneConsent(id: string) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.CONSENTS.RETRIEVE, withServiceAuth(id, this.serviceToken)),
    );
  }

  async updateConsent(id: string, dto: UpdateConsentGrantDto) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.CONSENTS.UPDATE, withServiceAuth({ id, ...dto }, this.serviceToken)),
    );
  }

  async revokeConsent(id: string) {
    return firstValueFrom(
      this.ehrClient.send(EhrPatterns.CONSENTS.REVOKE, withServiceAuth(id, this.serviceToken)),
    );
  }
}
