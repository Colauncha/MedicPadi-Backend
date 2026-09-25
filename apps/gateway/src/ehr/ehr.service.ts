import { Inject, Injectable } from '@nestjs/common';
import {
  AuthRole,
  EhrPatterns,
  EhrRequester,
  CreateEhrRecordDto,
  UpdateEhrRecordDto,
  CreateConsentGrantDto,
  UpdateConsentGrantDto,
  PaginationDto,
  RequestConsentDto,
} from '@medicpadi-backend/contracts';
import { withServiceAuth } from '@medicpadi-backend/utils';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

type RequestUser = { id: string; role: AuthRole };

@Injectable()
export class EhrService {
  constructor(
    @Inject('EHR_SERVICE') private readonly ehrClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>('appConfig.internalServiceToken');
  }

  private requester(user: { id: string; role: AuthRole }): EhrRequester {
    return { userId: user.id, role: user.role };
  }

  private send<T>(pattern: string, data: T) {
    return firstValueFrom(
      this.ehrClient.send(pattern, withServiceAuth(data, this.serviceToken)),
    );
  }

  // EHR Records

  async createRecord(dto: CreateEhrRecordDto, user: RequestUser) {
    return this.send(EhrPatterns.EHR_RECORDS.CREATE, {
      dto,
      requester: this.requester(user),
    });
  }

  async findAllRecords(query: PaginationDto, user: RequestUser) {
    return this.send(EhrPatterns.EHR_RECORDS.FIND_ALL, {
      query,
      requester: this.requester(user),
    });
  }

  async findOneRecord(id: string, user: RequestUser) {
    return this.send(EhrPatterns.EHR_RECORDS.RETRIEVE, {
      id,
      requester: this.requester(user),
    });
  }

  async updateRecord(id: string, dto: UpdateEhrRecordDto, user: RequestUser) {
    return this.send(EhrPatterns.EHR_RECORDS.UPDATE, {
      id,
      dto,
      requester: this.requester(user),
    });
  }

  async removeRecord(id: string) {
    return this.send(EhrPatterns.EHR_RECORDS.DELETE, id);
  }

  // Consents

  async createConsent(dto: CreateConsentGrantDto, user: RequestUser) {
    return this.send(EhrPatterns.CONSENTS.CREATE, {
      dto,
      requester: this.requester(user),
    });
  }

  async findAllConsents(query: PaginationDto, user: RequestUser) {
    return this.send(EhrPatterns.CONSENTS.FIND_ALL, {
      query,
      requester: this.requester(user),
    });
  }

  async findOneConsent(id: string, user: RequestUser) {
    return this.send(EhrPatterns.CONSENTS.RETRIEVE, {
      id,
      requester: this.requester(user),
    });
  }

  async updateConsent(
    id: string,
    dto: UpdateConsentGrantDto,
    user: RequestUser,
  ) {
    return this.send(EhrPatterns.CONSENTS.UPDATE, {
      id,
      dto,
      requester: this.requester(user),
    });
  }

  async revokeConsent(id: string, user: RequestUser) {
    return this.send(EhrPatterns.CONSENTS.REVOKE, {
      id,
      requester: this.requester(user),
    });
  }

  async requestConsent(dto: RequestConsentDto, user: RequestUser) {
    return this.send(EhrPatterns.CONSENTS.REQUEST, {
      dto,
      requester: this.requester(user),
    });
  }

  async approveConsent(id: string, user: RequestUser) {
    return this.send(EhrPatterns.CONSENTS.APPROVE, {
      id,
      requester: this.requester(user),
    });
  }

  async declineConsent(id: string, user: RequestUser) {
    return this.send(EhrPatterns.CONSENTS.DECLINE, {
      id,
      requester: this.requester(user),
    });
  }

  async cancelConsentRequest(id: string, user: RequestUser) {
    return this.send(EhrPatterns.CONSENTS.CANCEL, {
      id,
      requester: this.requester(user),
    });
  }
}
