import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  AuthRole,
  ConsentAccessLevel,
  ConsentStatus,
  EhrRequester,
  ServiceError,
} from '@medicpadi-backend/contracts';
import { ConsentGrant } from '../../entities/consent-grant.entity';

/**
 * Resolves whether a requester may access a patient's EHR, based on role and
 * active consent grants. Admins always have access; patients only to their own
 * records; everyone else needs an active, unexpired grant of sufficient level.
 */
@Injectable()
export class EhrAccessService {
  constructor(
    @InjectRepository(ConsentGrant)
    private readonly consentRepo: Repository<ConsentGrant>,
  ) {}

  private activeGrantsWhere(requester: EhrRequester) {
    const base = {
      granted_to_user_id: requester.userId,
      grantee_role: requester.role,
      status: ConsentStatus.ACTIVE,
    };
    return [
      { ...base, expires_at: IsNull() },
      { ...base, expires_at: MoreThan(new Date()) },
    ];
  }

  async hasAccess(
    requester: EhrRequester,
    patientId: string,
    level: ConsentAccessLevel,
  ): Promise<boolean> {
    if (requester.role === AuthRole.ADMIN) return true;
    if (requester.role === AuthRole.PATIENT) {
      return requester.userId === patientId;
    }

    const grants = await this.consentRepo.find({
      where: this.activeGrantsWhere(requester).map((w) => ({
        ...w,
        patient_id: patientId,
      })),
    });
    return grants.some(
      (g) =>
        level === ConsentAccessLevel.VIEW_ONLY ||
        g.access_level === ConsentAccessLevel.FULL_ACCESS,
    );
  }

  async assertAccess(
    requester: EhrRequester,
    patientId: string,
    level: ConsentAccessLevel,
  ): Promise<void> {
    if (!(await this.hasAccess(requester, patientId, level))) {
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message:
          level === ConsentAccessLevel.FULL_ACCESS
            ? 'Full-access consent from the patient is required'
            : "No active consent to access this patient's records",
      } as ServiceError);
    }
  }

  /** Patient IDs the requester currently holds an active grant for (any level). */
  async grantedPatientIds(requester: EhrRequester): Promise<string[]> {
    const grants = await this.consentRepo.find({
      where: this.activeGrantsWhere(requester),
      select: { patient_id: true },
    });
    return [...new Set(grants.map((g) => g.patient_id))];
  }
}
