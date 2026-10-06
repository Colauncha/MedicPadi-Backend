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

// InitialSchema created these enums with uppercase labels, but the entities
// (contracts enums) use lowercase values. Databases created with DB_SYNC=true
// already match the entities, so each conversion is skipped when the old
// labels are absent.
const conversions: EnumConversion[] = [
  {
    table: 'transactions',
    column: 'payment_status',
    type: 'transactions_payment_status_enum',
    marker: 'ESCROW',
    labels: ['pending', 'escrow', 'paid', 'failed', 'refunded'],
    mapping: {
      PENDING: 'pending',
      ESCROW: 'escrow',
      CONFIRMED: 'paid',
      FAILED: 'failed',
    },
    defaultValue: 'pending',
  },
  {
    table: 'transactions',
    column: 'gateway',
    type: 'transactions_gateway_enum',
    marker: 'PAYSTACK',
    labels: ['paystack', 'flutterwave', 'hmo_claim'],
    mapping: { PAYSTACK: 'paystack', FLUTTERWAVE: 'flutterwave' },
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

export class AlignEnumValues1760000000000 implements MigrationInterface {
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

  // Best-effort: 'refunded' and 'hmo_claim' have no old equivalent
  public async down(queryRunner: QueryRunner): Promise<void> {
    const reverse: Record<
      string,
      {
        labels: string[];
        mapping: Record<string, string>;
        marker: string;
        defaultValue?: string;
      }
    > = {
      transactions_payment_status_enum: {
        labels: ['PENDING', 'ESCROW', 'CONFIRMED', 'FAILED'],
        mapping: {
          pending: 'PENDING',
          escrow: 'ESCROW',
          paid: 'CONFIRMED',
          failed: 'FAILED',
          refunded: 'FAILED',
        },
        marker: 'escrow',
        defaultValue: 'PENDING',
      },
      transactions_gateway_enum: {
        labels: ['PAYSTACK', 'FLUTTERWAVE'],
        mapping: { paystack: 'PAYSTACK', flutterwave: 'FLUTTERWAVE' },
        marker: 'paystack',
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
