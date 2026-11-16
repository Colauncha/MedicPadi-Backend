import { MigrationInterface, QueryRunner } from 'typeorm';

// Hand-written: a generated migration would recreate the enum and fail to cast existing rows.
export class AddSubscriptionNotificationType1794000000000
  implements MigrationInterface
{
  name = 'AddSubscriptionNotificationType1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'subscription'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres can't drop an enum value, so rebuild the type
    await queryRunner.query(`
            CREATE TYPE "public"."notifications_type_enum_old" AS ENUM(
                'appointment',
                'drug_requisition',
                'test_requisition',
                'prescription',
                'payment',
                'system',
                'other'
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "notifications"
            ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old"
            USING (
                CASE "type"::text
                    WHEN 'subscription' THEN 'system'
                    ELSE "type"::text
                END
            )::"public"."notifications_type_enum_old"
        `);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(`
            ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"
        `);
  }
}
