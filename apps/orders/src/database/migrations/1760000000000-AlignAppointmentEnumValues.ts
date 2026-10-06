import { MigrationInterface, QueryRunner } from 'typeorm';

interface EnumConversion {
  table: string;
  column: string;
  type: string;
  // A label that only exists in the old enum; its absence means nothing to do
  marker: string;
  labels: string[];
  mapping: Record<string, string>;
  defaultValue?: string;
}

// InitialSchema created the appointment enums with uppercase labels, but the
// entities (contracts enums) use lowercase values. Databases created with DB_SYNC=true
// already match the entities, so each conversion is skipped when the old
// labels are absent.
const conversions: EnumConversion[] = [
  {
    table: 'appointments',
    column: 'status',
    type: 'appointments_status_enum',
    marker: 'PENDING',
    labels: ['pending', 'scheduled', 'confirmed', 'cancelled', 'completed'],
    mapping: {
      PENDING: 'pending',
      CONFIRMED: 'confirmed',
      COMPLETED: 'completed',
      CANCELLED: 'cancelled',
    },
    defaultValue: 'pending',
  },
  {
    table: 'appointments',
    column: 'paymentStatus',
    type: 'appointments_paymentStatus_enum',
    marker: 'P_PENDING',
    labels: [
      'payment_pending',
      'payment_confirmed',
      'payment_cancelled',
      'payment_failed',
      'payment_completed',
    ],
    mapping: {
      P_PENDING: 'payment_pending',
      // Escrowed funds are what the code now calls payment_confirmed
      P_ESCROW: 'payment_confirmed',
      P_CONFIRMED: 'payment_confirmed',
      P_FAILED: 'payment_failed',
    },
    defaultValue: 'payment_pending',
  },
];

const quote = (v: string) => `'${v}'`;

async function convertEnum(
  queryRunner: QueryRunner,
  c: EnumConversion,
  labels: string[],
  mapping: Record<string, string>,
  marker: string,
  defaultValue?: string,
) {
  const cases = Object.entries(mapping)
    .map(([from, to]) => `WHEN ${quote(from)} THEN ${quote(to)}`)
    .join(' ');

  await queryRunner.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = ${quote(c.type)} AND e.enumlabel = ${quote(marker)}
      ) THEN
        ALTER TYPE "public"."${c.type}" RENAME TO "${c.type}_old";
        CREATE TYPE "public"."${c.type}" AS ENUM(${labels.map(quote).join(', ')});
        ALTER TABLE "${c.table}" ALTER COLUMN "${c.column}" DROP DEFAULT;
        ALTER TABLE "${c.table}" ALTER COLUMN "${c.column}" TYPE "public"."${c.type}"
          USING (CASE "${c.column}"::text ${cases} END)::"public"."${c.type}";
        ${defaultValue ? `ALTER TABLE "${c.table}" ALTER COLUMN "${c.column}" SET DEFAULT ${quote(defaultValue)};` : ''}
        DROP TYPE "public"."${c.type}_old";
      END IF;
    END $$;
  `);
}

export class AlignAppointmentEnumValues1760000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const c of conversions) {
      await convertEnum(
        queryRunner,
        c,
        c.labels,
        c.mapping,
        c.marker,
        c.defaultValue,
      );
    }
  }

  // Best-effort: values without an old equivalent are mapped to the closest one
  public async down(queryRunner: QueryRunner): Promise<void> {
    const reverse: Record<
      string,
      {
        labels: string[];
        mapping: Record<string, string>;
        marker: string;
        defaultValue: string;
      }
    > = {
      appointments_status_enum: {
        labels: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
        mapping: {
          pending: 'PENDING',
          scheduled: 'PENDING',
          confirmed: 'CONFIRMED',
          completed: 'COMPLETED',
          cancelled: 'CANCELLED',
        },
        marker: 'pending',
        defaultValue: 'PENDING',
      },
      appointments_paymentStatus_enum: {
        labels: ['P_PENDING', 'P_ESCROW', 'P_CONFIRMED', 'P_FAILED'],
        mapping: {
          payment_pending: 'P_PENDING',
          payment_confirmed: 'P_ESCROW',
          payment_completed: 'P_CONFIRMED',
          payment_cancelled: 'P_FAILED',
          payment_failed: 'P_FAILED',
        },
        marker: 'payment_pending',
        defaultValue: 'P_PENDING',
      },
    };
    for (const c of conversions) {
      const r = reverse[c.type];
      await convertEnum(
        queryRunner,
        c,
        r.labels,
        r.mapping,
        r.marker,
        r.defaultValue,
      );
    }
  }
}
