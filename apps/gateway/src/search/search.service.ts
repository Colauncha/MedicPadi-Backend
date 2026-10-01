import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout } from 'rxjs';
import {
  DoctorPatterns,
  GlobalSearchQueryDto,
  GlobalSearchResponse,
  LaboratoryPatterns,
  PharmacyPatterns,
  SearchBucket,
  SearchEntity,
  ServicePatterns,
} from '@medicpadi-backend/contracts';
import { logError, withServiceAuth } from '@medicpadi-backend/utils';

// Per-service budget so one slow microservice can't stall the whole search.
const SEARCH_TIMEOUT_MS = 5000;

@Injectable()
export class SearchService {
  constructor(
    @Inject('PROFILE_SERVICE') private readonly profileClient: ClientProxy,
    @Inject('SERVICES_SERVICE') private readonly servicesClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>(
      'appConfig.internalServiceToken',
    );
  }

  // Patients are deliberately not searchable here; admins use /profile?role=patient.
  private get targets(): Record<SearchEntity, [ClientProxy, string]> {
    return {
      [SearchEntity.DOCTORS]: [this.profileClient, DoctorPatterns.FIND_ALL],
      [SearchEntity.PHARMACIES]: [this.profileClient, PharmacyPatterns.FIND_ALL],
      [SearchEntity.LABORATORIES]: [
        this.profileClient,
        LaboratoryPatterns.FIND_ALL,
      ],
      [SearchEntity.DRUGS]: [
        this.servicesClient,
        ServicePatterns.PHARMCY_DRUGS.FIND_ALL,
      ],
      [SearchEntity.LAB_TESTS]: [
        this.servicesClient,
        ServicePatterns.LAB_TESTS.FIND_ALL,
      ],
    };
  }

  async globalSearch(query: GlobalSearchQueryDto): Promise<GlobalSearchResponse> {
    const types = query.types?.length
      ? query.types
      : Object.values(SearchEntity);
    const payload = withServiceAuth(
      { search: query.q, limit: query.limit ?? 5, page: 1, order: 'desc' },
      this.serviceToken,
    );

    const results = await Promise.allSettled(
      types.map((type) => {
        const [client, pattern] = this.targets[type];
        return firstValueFrom(
          client.send(pattern, payload).pipe(timeout(SEARCH_TIMEOUT_MS)),
        );
      }),
    );

    const response = {} as GlobalSearchResponse;
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        response[types[i]] = this.toBucket(result.value);
      } else {
        logError(result.reason, `${SearchService.name}.globalSearch:${types[i]}`);
        response[types[i]] = { data: [], total: 0 };
      }
    });
    return response;
  }

  private toBucket(res: any): SearchBucket {
    if (Array.isArray(res)) return { data: res, total: res.length };
    const data = Array.isArray(res?.data) ? res.data : [];
    return { data, total: res?.meta?.total ?? res?.total ?? data.length };
  }
}
