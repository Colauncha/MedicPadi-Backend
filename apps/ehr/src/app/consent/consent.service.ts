import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
  AuthRole,
  ConsentAccessLevel,
  ConsentStatus,
  CreateConsentGrantDto,
  EhrAccessRequestedEventDto,
  EhrRequester,
  NotificationEvents,
  PaginationDto,
  PaginationResponseDto,
  RequestConsentDto,
  ServiceError,
  UpdateConsentGrantDto,
} from '@medicpadi-backend/contracts';
import {
  buildPaginationResponse,
  logError,
  withServiceAuth,
} from '@medicpadi-backend/utils';
import { ConsentGrant } from '../../entities/consent-grant.entity';
import { EhrAccessService } from './ehr-access.service';

@Injectable()
export class ConsentService {
  constructor(
    @InjectRepository(ConsentGrant)
    private readonly consentRepo: Repository<ConsentGrant>,
    private readonly ehrAccess: EhrAccessService,
    private readonly configService: ConfigService,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>(
      'appConfig.internalServiceToken',
    );
  }

  private forbidden(message = 'You do not have access to this consent grant') {
    return new RpcException({
      statusCode: HttpStatus.FORBIDDEN,
      message,
    } as ServiceError);
  }

  /** Loads a grant and checks the requester may see it (owner patient, grantee, or admin). */
  private async getAccessible(
    id: string,
    requester: EhrRequester,
    manage = false,
  ): Promise<ConsentGrant> {
    const existing = await this.consentRepo.findOne({ where: { id } });
    if (!existing) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Consent grant not found',
      } as ServiceError);
    }
    if (requester.role === AuthRole.ADMIN) return existing;

    const isOwner =
      requester.role === AuthRole.PATIENT &&
      existing.patient_id === requester.userId;
    const isGrantee = existing.granted_to_user_id === requester.userId;

    // Only the patient who owns the grant (or an admin) may modify it
    if (manage ? !isOwner : !isOwner && !isGrantee) throw this.forbidden();
    return existing;
  }

  async create(dto: CreateConsentGrantDto, requester: EhrRequester) {
    const patient_id =
      requester.role === AuthRole.PATIENT ? requester.userId : dto.patient_id;
    if (!patient_id) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'patient_id is required',
      } as ServiceError);
    }
    if (patient_id === dto.granted_to_user_id) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'A patient cannot grant consent to themselves',
      } as ServiceError);
    }

    try {
      const consent = this.consentRepo.create({ ...dto, patient_id });
      await this.consentRepo.save(consent);
      return consent;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create consent grant',
      } as ServiceError);
    }
  }

  async findAll(
    query: PaginationDto,
    requester: EhrRequester,
  ): Promise<PaginationResponseDto<ConsentGrant>> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    let where: FindOptionsWhere<ConsentGrant>;
    if (requester.role === AuthRole.ADMIN) {
      where = query.id ? { patient_id: query.id } : {};
    } else if (requester.role === AuthRole.PATIENT) {
      where = { patient_id: requester.userId };
    } else {
      where = { granted_to_user_id: requester.userId };
      if (query.id) where.patient_id = query.id;
    }

    try {
      const [data, total] = await this.consentRepo.findAndCount({
        where,
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: 'DESC' },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get consent grants',
      } as ServiceError);
    }
  }

  async findOne(id: string, requester: EhrRequester) {
    try {
      return await this.getAccessible(id, requester);
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to get consent grant',
          } as ServiceError);
    }
  }

  async update(
    id: string,
    dto: UpdateConsentGrantDto,
    requester: EhrRequester,
  ) {
    try {
      await this.getAccessible(id, requester, true);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, patient_id, ...changes } = dto;
      const update =
        requester.role === AuthRole.ADMIN && patient_id
          ? { ...changes, patient_id }
          : changes;

      const result = await this.consentRepo.update({ id }, update);
      return result.raw;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to update consent grant',
          } as ServiceError);
    }
  }

  async revoke(id: string, requester: EhrRequester) {
    try {
      await this.getAccessible(id, requester, true);
      await this.consentRepo.update({ id }, { status: ConsentStatus.REVOKED });
      return { message: 'Consent grant revoked successfully' };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to revoke consent grant',
          } as ServiceError);
    }
  }

  /** A consultant asks a patient for access; creates a PENDING grant and notifies the patient. */
  async request(dto: RequestConsentDto, requester: EhrRequester) {
    try {
      if (dto.patient_id === requester.userId) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'You cannot request access to your own records',
        } as ServiceError);
      }
      if (
        await this.ehrAccess.hasAccess(
          requester,
          dto.patient_id,
          dto.access_level,
        )
      ) {
        throw new RpcException({
          statusCode: HttpStatus.CONFLICT,
          message: 'You already have this level of access to the patient',
        } as ServiceError);
      }
      const pending = await this.consentRepo.findOne({
        where: {
          patient_id: dto.patient_id,
          granted_to_user_id: requester.userId,
          status: ConsentStatus.PENDING,
        },
      });
      if (pending) {
        throw new RpcException({
          statusCode: HttpStatus.CONFLICT,
          message: 'An access request to this patient is already pending',
        } as ServiceError);
      }

      const consent = this.consentRepo.create({
        patient_id: dto.patient_id,
        granted_to_user_id: requester.userId,
        grantee_role: requester.role,
        access_level: dto.access_level,
        status: ConsentStatus.PENDING,
      });
      await this.consentRepo.save(consent);

      const baseUrl =
        this.configService.get<string>('appConfig.frontendUrl') ??
        'https://medicpadi.com';
      const eventDto: EhrAccessRequestedEventDto = {
        consentId: consent.id,
        patientId: dto.patient_id,
        doctorId: requester.userId,
        accessLevel: dto.access_level,
        message: dto.message,
        reviewLink: `${baseUrl}/ehr/access-requests/${consent.id}`,
      };
      this.notificationClient.emit(
        NotificationEvents.EHR_ACCESS_REQUESTED,
        withServiceAuth(eventDto, this.serviceToken),
      );

      return consent;
    } catch (error) {
      logError(error, `${ConsentService.name}.request`);
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to request EHR access',
          } as ServiceError);
    }
  }

  /** The requesting consultant withdraws their own pending request. */
  async cancel(id: string, requester: EhrRequester) {
    try {
      const existing = await this.getAccessible(id, requester);
      if (
        requester.role !== AuthRole.ADMIN &&
        existing.granted_to_user_id !== requester.userId
      ) {
        throw this.forbidden('Only the requester can cancel this request');
      }
      if (existing.status !== ConsentStatus.PENDING) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Only pending access requests can be cancelled',
        } as ServiceError);
      }

      await this.consentRepo.update(
        { id },
        { status: ConsentStatus.CANCELLED },
      );
      return { ...existing, status: ConsentStatus.CANCELLED };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to cancel access request',
          } as ServiceError);
    }
  }

  async approve(id: string, requester: EhrRequester) {
    return this.resolveRequest(id, requester, ConsentStatus.ACTIVE);
  }

  async decline(id: string, requester: EhrRequester) {
    return this.resolveRequest(id, requester, ConsentStatus.DECLINED);
  }

  private async resolveRequest(
    id: string,
    requester: EhrRequester,
    status: ConsentStatus.ACTIVE | ConsentStatus.DECLINED,
  ) {
    try {
      const existing = await this.getAccessible(id, requester, true);
      if (existing.status !== ConsentStatus.PENDING) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Only pending access requests can be approved or declined',
        } as ServiceError);
      }

      await this.consentRepo.update({ id }, { status });

      // Approving supersedes the grantee's other active grants for this patient
      if (status === ConsentStatus.ACTIVE) {
        const others = await this.consentRepo.find({
          where: {
            patient_id: existing.patient_id,
            granted_to_user_id: existing.granted_to_user_id,
            status: ConsentStatus.ACTIVE,
          },
          select: { id: true },
        });
        const staleIds = others.map((g) => g.id).filter((gid) => gid !== id);
        if (staleIds.length) {
          await this.consentRepo.update(
            { id: In(staleIds) },
            { status: ConsentStatus.REVOKED },
          );
        }
      }

      return { ...existing, status };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to update access request',
          } as ServiceError);
    }
  }
}
