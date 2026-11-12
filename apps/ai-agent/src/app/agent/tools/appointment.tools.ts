import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AppointmentStatus,
  AuthRole,
  CreateAppointmentDto,
  DoctorPatterns,
  OrderPatterns,
} from '@medicpadi-backend/contracts';
import { AgentRpcService } from './agent-rpc.service';
import {
  assertFuture,
  assertOwnedByPatient,
  formatDateTime,
  formatNaira,
  toNumber,
} from './helpers';
import { appointmentView, paginated } from './projections';
import { ReadTool, ToolContext, ToolError, WriteTool } from './tool.types';

const CLOSED_STATUSES = [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED];

class ListAppointmentsArgs {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;
}

class AppointmentIdArgs {
  @IsUUID()
  appointment_id!: string;
}

class BookAppointmentArgs {
  @IsUUID()
  doctor_id!: string;

  @IsDateString()
  appointment_time!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  sessions?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

class RescheduleAppointmentArgs extends AppointmentIdArgs {
  @IsDateString()
  new_time!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

class CancelAppointmentArgs extends AppointmentIdArgs {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

const idSchema = {
  type: 'object' as const,
  properties: { appointment_id: { type: 'string', format: 'uuid' } },
  required: ['appointment_id'],
};

export function appointmentTools(rpc: AgentRpcService) {
  const getOwned = async (ctx: ToolContext, id: string) =>
    assertOwnedByPatient(
      await rpc.send('orders', OrderPatterns.APPOINTMENTS.RETRIEVE, id),
      ctx.userId,
      'Appointment',
    );

  const getDoctor = async (doctorId: string) => {
    const doctor = await rpc.send('profile', DoctorPatterns.RETRIEVE, doctorId);
    if (!doctor) throw new ToolError('Doctor not found');
    return doctor;
  };

  const doctorName = (d: any) =>
    `Dr ${[d.firstName, d.lastName].filter(Boolean).join(' ') || '(unnamed)'}`;

  const listMine: ReadTool<ListAppointmentsArgs> = {
    kind: 'read',
    argsType: ListAppointmentsArgs,
    definition: {
      name: 'list_my_appointments',
      description:
        "List the patient's appointments, newest first. Optionally filter by status.",
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: Object.values(AppointmentStatus) },
          page: { type: 'integer', minimum: 1 },
        },
      },
    },
    async execute(ctx, args) {
      const res = await rpc.send('orders', OrderPatterns.APPOINTMENTS.FIND_ALL, {
        id: ctx.userId,
        status: args.status,
        page: args.page ?? 1,
        limit: 10,
      });
      return paginated(res, appointmentView, (r) => r['patient_id'] === ctx.userId);
    },
  };

  const getOne: ReadTool<AppointmentIdArgs> = {
    kind: 'read',
    argsType: AppointmentIdArgs,
    definition: {
      name: 'get_appointment',
      description: 'Get details of one of the patient’s appointments.',
      inputSchema: idSchema,
    },
    async execute(ctx, args) {
      return appointmentView(await getOwned(ctx, args.appointment_id));
    },
  };

  const book: WriteTool<BookAppointmentArgs, CreateAppointmentDto> = {
    kind: 'write',
    argsType: BookAppointmentArgs,
    definition: {
      name: 'book_appointment',
      description:
        'Request a consultation with a doctor. Requires patient confirmation. The doctor must accept before a payment link is sent.',
      inputSchema: {
        type: 'object',
        properties: {
          doctor_id: {
            type: 'string',
            format: 'uuid',
            description: 'doctor_id from search_doctors',
          },
          appointment_time: {
            type: 'string',
            format: 'date-time',
            description: 'ISO 8601 with timezone offset, e.g. 2026-11-13T10:00:00+01:00',
          },
          sessions: { type: 'integer', minimum: 1, maximum: 4 },
          description: {
            type: 'string',
            description: 'Short reason for the visit',
          },
        },
        required: ['doctor_id', 'appointment_time'],
      },
    },
    async prepare(ctx, args) {
      const when = assertFuture(args.appointment_time, 'Appointment time');
      const doctor = await getDoctor(args.doctor_id);
      const sessions = args.sessions ?? 1;
      const cost = toNumber(doctor.costPerSession) * sessions;
      const length = toNumber(doctor.sessionLength) || 30;
      return {
        summary:
          `Book ${sessions} session(s) of ${length} min with ${doctorName(doctor)}` +
          `${doctor.speciality ? ` (${doctor.speciality})` : ''} on ${formatDateTime(when)}. ` +
          `Estimated cost ${formatNaira(cost)}; a payment link is sent once the doctor accepts.`,
        payload: {
          patient_id: ctx.userId,
          provider_id: args.doctor_id,
          appointment_time: when.toISOString(),
          sessions,
          sessionLen: length,
          ...(args.description ? { description: args.description } : {}),
        },
      };
    },
    async execute(_ctx, payload) {
      const res = await rpc.send('orders', OrderPatterns.APPOINTMENTS.CREATE, payload);
      return appointmentView(res);
    },
  };

  const reschedule: WriteTool<
    RescheduleAppointmentArgs,
    { id: string; appointment_time: string; reason?: string }
  > = {
    kind: 'write',
    argsType: RescheduleAppointmentArgs,
    definition: {
      name: 'reschedule_appointment',
      description: 'Move one of the patient’s appointments to a new time. Requires confirmation.',
      inputSchema: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', format: 'uuid' },
          new_time: { type: 'string', format: 'date-time' },
          reason: { type: 'string' },
        },
        required: ['appointment_id', 'new_time'],
      },
    },
    async prepare(ctx, args) {
      const appt = await getOwned(ctx, args.appointment_id);
      if (CLOSED_STATUSES.includes(appt.status)) {
        throw new ToolError(`This appointment is ${appt.status} and can't be rescheduled`);
      }
      const when = assertFuture(args.new_time, 'New time');
      return {
        summary: `Reschedule the appointment on ${formatDateTime(appt.appointment_time)} to ${formatDateTime(when)}.`,
        payload: {
          id: appt.id,
          appointment_time: when.toISOString(),
          ...(args.reason ? { reason: args.reason } : {}),
        },
      };
    },
    async execute(ctx, payload) {
      const res = await rpc.send('orders', OrderPatterns.APPOINTMENTS.RESCHEDULE, {
        ...payload,
        userId: ctx.userId,
        role: AuthRole.PATIENT,
      });
      return appointmentView(res ?? {});
    },
  };

  const cancel: WriteTool<CancelAppointmentArgs, { id: string; reason: string }> = {
    kind: 'write',
    argsType: CancelAppointmentArgs,
    definition: {
      name: 'cancel_appointment',
      description: 'Cancel one of the patient’s appointments. Requires confirmation.',
      inputSchema: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', format: 'uuid' },
          reason: { type: 'string' },
        },
        required: ['appointment_id', 'reason'],
      },
    },
    async prepare(ctx, args) {
      const appt = await getOwned(ctx, args.appointment_id);
      if (CLOSED_STATUSES.includes(appt.status)) {
        throw new ToolError(`This appointment is already ${appt.status}`);
      }
      return {
        summary: `Cancel the appointment on ${formatDateTime(appt.appointment_time)} (reason: ${args.reason}).`,
        payload: { id: appt.id, reason: args.reason },
      };
    },
    async execute(ctx, payload) {
      return rpc.send('orders', OrderPatterns.APPOINTMENTS.CANCEL, {
        ...payload,
        userId: ctx.userId,
        role: AuthRole.PATIENT,
      });
    },
  };

  const confirmCompletion: WriteTool<AppointmentIdArgs, { id: string }> = {
    kind: 'write',
    argsType: AppointmentIdArgs,
    definition: {
      name: 'confirm_appointment_completion',
      description:
        'Confirm that a consultation took place, which releases payment to the doctor. Requires confirmation.',
      inputSchema: idSchema,
    },
    async prepare(ctx, args) {
      const appt = await getOwned(ctx, args.appointment_id);
      return {
        summary: `Confirm that the consultation on ${formatDateTime(appt.appointment_time)} was completed (releases payment to the doctor).`,
        payload: { id: appt.id },
      };
    },
    async execute(ctx, payload) {
      return rpc.send('orders', OrderPatterns.APPOINTMENTS.CONFIRM_COMPLETION, {
        id: payload.id,
        userId: ctx.userId,
        role: AuthRole.PATIENT,
      });
    },
  };

  return [listMine, getOne, book, reschedule, cancel, confirmCompletion];
}
