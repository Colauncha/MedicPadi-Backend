import { MigrationInterface, QueryRunner } from "typeorm";

// Hand-written: a generated migration would recreate the enum and fail to cast
// existing 'requisition' rows.
export class SplitRequisitionNotificationType1793390000000 implements MigrationInterface {
    name = 'SplitRequisitionNotificationType1793390000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TYPE "public"."notifications_type_enum" RENAME VALUE 'requisition' TO 'test_requisition'
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'drug_requisition'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Postgres can't drop an enum value, so rebuild the type
        await queryRunner.query(`
            CREATE TYPE "public"."notifications_type_enum_old" AS ENUM(
                'appointment',
                'requisition',
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
                    WHEN 'test_requisition' THEN 'requisition'
                    WHEN 'drug_requisition' THEN 'requisition'
                    ELSE "type"::text
                END
            )::"public"."notifications_type_enum_old"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."notifications_type_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"
        `);
    }

}
