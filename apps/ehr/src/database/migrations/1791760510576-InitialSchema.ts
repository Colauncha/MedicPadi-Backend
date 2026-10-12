import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791760510576 implements MigrationInterface {
  name = 'InitialSchema1791760510576';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."ehr_records_source_type_enum" AS ENUM(
                'appointment',
                'lab_result',
                'prescription',
                'upload'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "ehr_records" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "patient_id" uuid NOT NULL,
                "provider_id" uuid,
                "source_type" "public"."ehr_records_source_type_enum" NOT NULL,
                "source_id" uuid,
                "content_encrypted" text,
                "document_url" text,
                CONSTRAINT "PK_dcbba537248a13fa04b2d71426b" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."consent_grants_grantee_role_enum" AS ENUM(
                'patient',
                'consultant',
                'pharmacy',
                'lab',
                'admin'
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."consent_grants_access_level_enum" AS ENUM('view_only', 'full_access')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."consent_grants_status_enum" AS ENUM(
                'active',
                'revoked',
                'pending',
                'declined',
                'cancelled'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "consent_grants" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "patient_id" uuid NOT NULL,
                "granted_to_user_id" uuid NOT NULL,
                "grantee_role" "public"."consent_grants_grantee_role_enum" NOT NULL,
                "access_level" "public"."consent_grants_access_level_enum" NOT NULL,
                "status" "public"."consent_grants_status_enum" NOT NULL DEFAULT 'active',
                "expires_at" TIMESTAMP,
                CONSTRAINT "PK_f579a04c8a9da58989fb5f387b0" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "consent_grants"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."consent_grants_status_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."consent_grants_access_level_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."consent_grants_grantee_role_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "ehr_records"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."ehr_records_source_type_enum"
        `);
  }
}
