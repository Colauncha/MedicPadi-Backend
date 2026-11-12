import { ToolError } from './tool.types';

export const AGENT_TIMEZONE = 'Africa/Lagos';

export function formatDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: AGENT_TIMEZONE,
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(d);
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Orders-service RETRIEVE handlers don't check ownership. Treat records that
 * belong to someone else exactly like missing ones so IDs can't be probed.
 */
export function assertOwnedByPatient<T extends { patient_id?: string }>(
  record: T | null | undefined,
  userId: string,
  label: string,
): T {
  if (!record || record.patient_id !== userId) {
    throw new ToolError(`${label} not found`);
  }
  return record;
}

export function assertFuture(iso: string, label = 'The requested time'): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new ToolError(`${label} is not a valid date/time`);
  }
  if (d.getTime() <= Date.now()) {
    throw new ToolError(`${label} must be in the future`);
  }
  return d;
}
