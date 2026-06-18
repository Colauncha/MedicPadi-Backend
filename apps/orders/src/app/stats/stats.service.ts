import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import { withServiceAuth, REDIS_CLIENT } from '@medicpadi-backend/utils';
import {
  ServicePatterns,
  DoctorStatsDto,
  LabStatsDto,
  PharmacyStatsDto,
  WeeklyChangeDto,
} from '@medicpadi-backend/contracts';
import { Appointment } from '../../entities/appointment.entity';
import { TestRequisition } from '../../entities/test-requisition.entity';
import { DrugRequisition } from '../../entities/drug-requisition.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(TestRequisition)
    private readonly testRequisitionRepo: Repository<TestRequisition>,
    @InjectRepository(DrugRequisition)
    private readonly drugRequisitionRepo: Repository<DrugRequisition>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject('SERVICES_SERVICE') private readonly servicesClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>(
      'appConfig.internalServiceToken',
    );
  }

  private get ttl(): number {
    return this.configService.get<number>('appConfig.ttl') ?? 3600;
  }

  private computeWeeklyChange(
    current: number,
    previous: number,
  ): WeeklyChangeDto {
    const percentChange =
      previous === 0 ? null : ((current - previous) / previous) * 100;
    return { currentWeek: current, previousWeek: previous, percentChange };
  }

  private getWeekWindows() {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    return { now, weekStart, prevWeekStart };
  }

  async getDoctorStats(providerId: string): Promise<DoctorStatsDto> {
    const key = `stats:doctor:${providerId}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const stats = await this.computeDoctorStats(providerId);
    await this.redis.set(key, JSON.stringify(stats), 'EX', this.ttl);
    return stats;
  }

  async getLabStats(labId: string): Promise<LabStatsDto> {
    const key = `stats:lab:${labId}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const stats = await this.computeLabStats(labId);
    await this.redis.set(key, JSON.stringify(stats), 'EX', this.ttl);
    return stats;
  }

  async getPharmacyStats(pharmacyId: string): Promise<PharmacyStatsDto> {
    const key = `stats:pharmacy:${pharmacyId}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const stats = await this.computePharmacyStats(pharmacyId);
    await this.redis.set(key, JSON.stringify(stats), 'EX', this.ttl);
    return stats;
  }

  private async computeDoctorStats(
    providerId: string,
  ): Promise<DoctorStatsDto> {
    const { weekStart, prevWeekStart } = this.getWeekWindows();

    const [
      totalPatients,
      totalAppointments,
      scheduledAppointments,
      returningCount,
      curPatients,
      prevPatients,
      curAppointments,
      prevAppointments,
      curScheduled,
      prevScheduled,
      newPatientsThisWeek,
    ] = await Promise.all([
      // Total distinct patients all-time
      this.appointmentRepo
        .createQueryBuilder('a')
        .select('COUNT(DISTINCT a.patient_id)', 'count')
        .where('a.provider_id = :pid', { pid: providerId })
        .getRawOne<{ count: string }>(),

      // Total appointments all-time
      this.appointmentRepo.count({ where: { provider_id: providerId } }),

      // Scheduled appointments (future, pending or confirmed)
      this.appointmentRepo
        .createQueryBuilder('a')
        .where('a.provider_id = :pid', { pid: providerId })
        .andWhere('a.appointment_time > NOW()')
        .andWhere("a.status IN ('pending', 'confirmed')")
        .getCount(),

      // Returning patients (appear more than once)
      this.appointmentRepo
        .createQueryBuilder('a')
        .select('COUNT(DISTINCT a.patient_id)', 'count')
        .where('a.provider_id = :pid', { pid: providerId })
        .andWhere(
          `a.patient_id IN (
            SELECT a2.patient_id FROM appointments a2
            WHERE a2.provider_id = :pid
            GROUP BY a2.patient_id
            HAVING COUNT(*) > 1
          )`,
          { pid: providerId },
        )
        .getRawOne<{ count: string }>(),

      // Current week distinct patients
      this.appointmentRepo
        .createQueryBuilder('a')
        .select('COUNT(DISTINCT a.patient_id)', 'count')
        .where('a.provider_id = :pid', { pid: providerId })
        .andWhere('a.createdAt >= :weekStart', { weekStart })
        .getRawOne<{ count: string }>(),

      // Previous week distinct patients
      this.appointmentRepo
        .createQueryBuilder('a')
        .select('COUNT(DISTINCT a.patient_id)', 'count')
        .where('a.provider_id = :pid', { pid: providerId })
        .andWhere('a.createdAt >= :prevWeekStart', { prevWeekStart })
        .andWhere('a.createdAt < :weekStart', { weekStart })
        .getRawOne<{ count: string }>(),

      // Current week appointments
      this.appointmentRepo
        .createQueryBuilder('a')
        .where('a.provider_id = :pid', { pid: providerId })
        .andWhere('a.createdAt >= :weekStart', { weekStart })
        .getCount(),

      // Previous week appointments
      this.appointmentRepo
        .createQueryBuilder('a')
        .where('a.provider_id = :pid', { pid: providerId })
        .andWhere('a.createdAt >= :prevWeekStart', { prevWeekStart })
        .andWhere('a.createdAt < :weekStart', { weekStart })
        .getCount(),

      // Current week scheduled
      this.appointmentRepo
        .createQueryBuilder('a')
        .where('a.provider_id = :pid', { pid: providerId })
        .andWhere('a.appointment_time > NOW()')
        .andWhere("a.status IN ('pending', 'confirmed')")
        .andWhere('a.createdAt >= :weekStart', { weekStart })
        .getCount(),

      // Previous week scheduled
      this.appointmentRepo
        .createQueryBuilder('a')
        .where('a.provider_id = :pid', { pid: providerId })
        .andWhere('a.appointment_time > NOW()')
        .andWhere("a.status IN ('pending', 'confirmed')")
        .andWhere('a.createdAt >= :prevWeekStart', { prevWeekStart })
        .andWhere('a.createdAt < :weekStart', { weekStart })
        .getCount(),

      // New patients this week (first-ever appointment with this doctor)
      this.appointmentRepo
        .createQueryBuilder('a')
        .select('COUNT(*)', 'count')
        .where(
          `a.patient_id IN (
            SELECT a2.patient_id FROM appointments a2
            WHERE a2.provider_id = :pid
            GROUP BY a2.patient_id
            HAVING MIN(a2.createdAt) >= :weekStart
          )`,
          { pid: providerId, weekStart },
        )
        .andWhere('a.provider_id = :pid', { pid: providerId })
        .getRawOne<{ count: string }>(),
    ]);

    const total = Number(totalPatients?.count);
    const returning = Number(returningCount?.count);

    return {
      totalPatients: total,
      totalAppointments,
      scheduledAppointments,
      returningPatientPercent: total > 0 ? (returning / total) * 100 : null,
      newPatientsThisWeek: Number(newPatientsThisWeek?.count),
      totalPatientsThisWeek: Number(curPatients?.count),
      weeklyChanges: {
        totalPatients: this.computeWeeklyChange(
          Number(curPatients?.count),
          Number(prevPatients?.count),
        ),
        totalAppointments: this.computeWeeklyChange(
          curAppointments,
          prevAppointments,
        ),
        scheduledAppointments: this.computeWeeklyChange(
          curScheduled,
          prevScheduled,
        ),
      },
    };
  }

  private async computeLabStats(labId: string): Promise<LabStatsDto> {
    const { weekStart, prevWeekStart } = this.getWeekWindows();

    const [
      totalPatients,
      totalRequisitions,
      pendingRequisitions,
      returningCount,
      curPatients,
      prevPatients,
      curRequisitions,
      prevRequisitions,
      curPending,
      prevPending,
      newPatientsThisWeek,
    ] = await Promise.all([
      this.testRequisitionRepo
        .createQueryBuilder('r')
        .select('COUNT(DISTINCT r.patient_id)', 'count')
        .where('r.lab_id = :labId', { labId })
        .getRawOne<{ count: string }>(),

      this.testRequisitionRepo.count({ where: { lab_id: labId } }),

      this.testRequisitionRepo.count({
        where: { lab_id: labId, status: 'pending' as any },
      }),

      this.testRequisitionRepo
        .createQueryBuilder('r')
        .select('COUNT(DISTINCT r.patient_id)', 'count')
        .where('r.lab_id = :labId', { labId })
        .andWhere(
          `r.patient_id IN (
            SELECT r2.patient_id FROM test_requisitions r2
            WHERE r2.lab_id = :labId
            GROUP BY r2.patient_id
            HAVING COUNT(*) > 1
          )`,
          { labId },
        )
        .getRawOne<{ count: string }>(),

      this.testRequisitionRepo
        .createQueryBuilder('r')
        .select('COUNT(DISTINCT r.patient_id)', 'count')
        .where('r.lab_id = :labId', { labId })
        .andWhere('r.createdAt >= :weekStart', { weekStart })
        .getRawOne<{ count: string }>(),

      this.testRequisitionRepo
        .createQueryBuilder('r')
        .select('COUNT(DISTINCT r.patient_id)', 'count')
        .where('r.lab_id = :labId', { labId })
        .andWhere('r.createdAt >= :prevWeekStart', { prevWeekStart })
        .andWhere('r.createdAt < :weekStart', { weekStart })
        .getRawOne<{ count: string }>(),

      this.testRequisitionRepo
        .createQueryBuilder('r')
        .where('r.lab_id = :labId', { labId })
        .andWhere('r.createdAt >= :weekStart', { weekStart })
        .getCount(),

      this.testRequisitionRepo
        .createQueryBuilder('r')
        .where('r.lab_id = :labId', { labId })
        .andWhere('r.createdAt >= :prevWeekStart', { prevWeekStart })
        .andWhere('r.createdAt < :weekStart', { weekStart })
        .getCount(),

      this.testRequisitionRepo
        .createQueryBuilder('r')
        .where('r.lab_id = :labId', { labId })
        .andWhere("r.status = 'pending'")
        .andWhere('r.createdAt >= :weekStart', { weekStart })
        .getCount(),

      this.testRequisitionRepo
        .createQueryBuilder('r')
        .where('r.lab_id = :labId', { labId })
        .andWhere("r.status = 'pending'")
        .andWhere('r.createdAt >= :prevWeekStart', { prevWeekStart })
        .andWhere('r.createdAt < :weekStart', { weekStart })
        .getCount(),

      this.testRequisitionRepo
        .createQueryBuilder('r')
        .select('COUNT(*)', 'count')
        .where(
          `r.patient_id IN (
            SELECT r2.patient_id FROM test_requisitions r2
            WHERE r2.lab_id = :labId
            GROUP BY r2.patient_id
            HAVING MIN(r2.createdAt) >= :weekStart
          )`,
          { labId, weekStart },
        )
        .andWhere('r.lab_id = :labId', { labId })
        .getRawOne<{ count: string }>(),
    ]);

    const total = Number(totalPatients?.count);
    const returning = Number(returningCount?.count);

    return {
      totalPatients: total,
      totalRequisitions,
      pendingRequisitions,
      returningPatientPercent: total > 0 ? (returning / total) * 100 : null,
      newPatientsThisWeek: Number(newPatientsThisWeek?.count),
      totalPatientsThisWeek: Number(curPatients?.count),
      weeklyChanges: {
        totalPatients: this.computeWeeklyChange(
          Number(curPatients?.count),
          Number(prevPatients?.count),
        ),
        totalRequisitions: this.computeWeeklyChange(
          curRequisitions,
          prevRequisitions,
        ),
        pendingRequisitions: this.computeWeeklyChange(curPending, prevPending),
      },
    };
  }

  private async computePharmacyStats(
    pharmacyId: string,
  ): Promise<PharmacyStatsDto> {
    const { weekStart, prevWeekStart } = this.getWeekWindows();

    const [
      totalCustomers,
      totalOrders,
      returningCount,
      curCustomers,
      prevCustomers,
      curOrders,
      prevOrders,
      newCustomersThisWeek,
      productsAllTime,
      curProducts,
      prevProducts,
    ] = await Promise.all([
      this.drugRequisitionRepo
        .createQueryBuilder('r')
        .select('COUNT(DISTINCT r.patient_id)', 'count')
        .where('r.pharmacy_id = :pharmacyId', { pharmacyId })
        .getRawOne<{ count: string }>(),

      this.drugRequisitionRepo.count({ where: { pharmacy_id: pharmacyId } }),

      this.drugRequisitionRepo
        .createQueryBuilder('r')
        .select('COUNT(DISTINCT r.patient_id)', 'count')
        .where('r.pharmacy_id = :pharmacyId', { pharmacyId })
        .andWhere(
          `r.patient_id IN (
            SELECT r2.patient_id FROM drug_requisitions r2
            WHERE r2.pharmacy_id = :pharmacyId
            GROUP BY r2.patient_id
            HAVING COUNT(*) > 1
          )`,
          { pharmacyId },
        )
        .getRawOne<{ count: string }>(),

      this.drugRequisitionRepo
        .createQueryBuilder('r')
        .select('COUNT(DISTINCT r.patient_id)', 'count')
        .where('r.pharmacy_id = :pharmacyId', { pharmacyId })
        .andWhere('r.createdAt >= :weekStart', { weekStart })
        .getRawOne<{ count: string }>(),

      this.drugRequisitionRepo
        .createQueryBuilder('r')
        .select('COUNT(DISTINCT r.patient_id)', 'count')
        .where('r.pharmacy_id = :pharmacyId', { pharmacyId })
        .andWhere('r.createdAt >= :prevWeekStart', { prevWeekStart })
        .andWhere('r.createdAt < :weekStart', { weekStart })
        .getRawOne<{ count: string }>(),

      this.drugRequisitionRepo
        .createQueryBuilder('r')
        .where('r.pharmacy_id = :pharmacyId', { pharmacyId })
        .andWhere('r.createdAt >= :weekStart', { weekStart })
        .getCount(),

      this.drugRequisitionRepo
        .createQueryBuilder('r')
        .where('r.pharmacy_id = :pharmacyId', { pharmacyId })
        .andWhere('r.createdAt >= :prevWeekStart', { prevWeekStart })
        .andWhere('r.createdAt < :weekStart', { weekStart })
        .getCount(),

      this.drugRequisitionRepo
        .createQueryBuilder('r')
        .select('COUNT(*)', 'count')
        .where(
          `r.patient_id IN (
            SELECT r2.patient_id FROM drug_requisitions r2
            WHERE r2.pharmacy_id = :pharmacyId
            GROUP BY r2.patient_id
            HAVING MIN(r2.createdAt) >= :weekStart
          )`,
          { pharmacyId, weekStart },
        )
        .andWhere('r.pharmacy_id = :pharmacyId', { pharmacyId })
        .getRawOne<{ count: string }>(),

      // Total products all-time via services microservice
      firstValueFrom(
        this.servicesClient.send(
          ServicePatterns.PHARMCY_DRUGS.FIND_ALL,
          withServiceAuth(
            { id: pharmacyId, limit: 1, page: 1 },
            this.serviceToken,
          ),
        ),
      ).then((res: any) => res?.total ?? 0),

      // Current week products via COUNT_BY_PERIOD
      firstValueFrom(
        this.servicesClient.send(
          ServicePatterns.PHARMCY_DRUGS.COUNT_BY_PERIOD,
          withServiceAuth(
            { userId: pharmacyId, from: weekStart.toISOString() },
            this.serviceToken,
          ),
        ),
      ).then((res: any) => res?.count ?? 0),

      // Previous week products
      firstValueFrom(
        this.servicesClient.send(
          ServicePatterns.PHARMCY_DRUGS.COUNT_BY_PERIOD,
          withServiceAuth(
            {
              userId: pharmacyId,
              from: prevWeekStart.toISOString(),
              to: weekStart.toISOString(),
            },
            this.serviceToken,
          ),
        ),
      ).then((res: any) => res?.count ?? 0),
    ]);

    const total = Number(totalCustomers?.count);
    const returning = Number(returningCount?.count);

    return {
      totalCustomers: total,
      totalProducts: productsAllTime,
      totalOrders,
      returningCustomerPercent: total > 0 ? (returning / total) * 100 : null,
      newCustomersThisWeek: Number(newCustomersThisWeek?.count),
      totalCustomersThisWeek: Number(curCustomers?.count),
      weeklyChanges: {
        totalCustomers: this.computeWeeklyChange(
          Number(curCustomers?.count),
          Number(prevCustomers?.count),
        ),
        totalProducts: this.computeWeeklyChange(curProducts, prevProducts),
        totalOrders: this.computeWeeklyChange(curOrders, prevOrders),
      },
    };
  }
}
