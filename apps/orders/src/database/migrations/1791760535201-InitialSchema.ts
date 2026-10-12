import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791760535201 implements MigrationInterface {
  name = 'InitialSchema1791760535201';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."test_requisitions_status_enum" AS ENUM(
                'pending',
                'accepted',
                'processing',
                'ready',
                'completed',
                'cancelled'
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."test_requisitions_payment_status_enum" AS ENUM(
                'pending',
                'escrow',
                'paid',
                'failed',
                'refunded'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "test_requisitions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "patient_id" uuid NOT NULL,
                "lab_id" uuid NOT NULL,
                "referring_provider_id" uuid,
                "status" "public"."test_requisitions_status_enum" NOT NULL DEFAULT 'pending',
                "total_amount" numeric(10, 2),
                "payment_status" "public"."test_requisitions_payment_status_enum" NOT NULL DEFAULT 'pending',
                "notes" text,
                CONSTRAINT "PK_bd8334667993016690c9a71ad8c" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."test_requisition_items_status_enum" AS ENUM(
                'pending',
                'processing',
                'completed',
                'cancelled'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "test_requisition_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "requisition_id" uuid NOT NULL,
                "lab_test_id" uuid NOT NULL,
                "test_name" character varying NOT NULL,
                "unit_price" numeric(10, 2) NOT NULL,
                "result" text,
                "result_file_url" character varying,
                "status" "public"."test_requisition_items_status_enum" NOT NULL DEFAULT 'pending',
                "completed_at" TIMESTAMP,
                CONSTRAINT "PK_c0303bdab8267ef86705c5428e4" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "prescription_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "prescription_id" uuid NOT NULL,
                "medication_name" character varying NOT NULL,
                "dosage" character varying NOT NULL,
                "frequency" character varying NOT NULL,
                "duration_days" integer,
                "instructions" text,
                CONSTRAINT "PK_6216831f49afc381b3934c9672c" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."prescriptions_status_enum" AS ENUM(
                'issued',
                'fulfilled',
                'partially_fulfilled',
                'cancelled'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "prescriptions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "appointment_id" uuid,
                "patient_id" uuid NOT NULL,
                "provider_id" uuid NOT NULL,
                "notes" text,
                "status" "public"."prescriptions_status_enum" NOT NULL DEFAULT 'issued',
                "is_electronic" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_097b2cc2f2b7e56825468188503" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."drug_requisitions_status_enum" AS ENUM(
                'pending',
                'accepted',
                'processing',
                'ready',
                'completed',
                'cancelled'
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."drug_requisitions_payment_status_enum" AS ENUM(
                'pending',
                'escrow',
                'paid',
                'failed',
                'refunded'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "drug_requisitions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "patient_id" uuid NOT NULL,
                "pharmacy_id" uuid NOT NULL,
                "prescription_id" uuid,
                "status" "public"."drug_requisitions_status_enum" NOT NULL DEFAULT 'pending',
                "delivery_address" text,
                "total_amount" numeric(10, 2),
                "payment_status" "public"."drug_requisitions_payment_status_enum" NOT NULL DEFAULT 'pending',
                "notes" text,
                CONSTRAINT "PK_c8de32dc785a28c91a260472e42" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "drug_requisition_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "requisition_id" uuid NOT NULL,
                "pharmacy_drug_id" uuid NOT NULL,
                "medication_name" character varying NOT NULL,
                "quantity" integer NOT NULL,
                "unit_price" numeric(10, 2) NOT NULL,
                "requiresPrescription" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_8c6556fe4b5333e733f313e7506" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."appointments_status_enum" AS ENUM(
                'pending',
                'scheduled',
                'confirmed',
                'cancelled',
                'completed'
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."appointments_paymentstatus_enum" AS ENUM(
                'payment_pending',
                'payment_confirmed',
                'payment_cancelled',
                'payment_failed',
                'payment_completed'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "appointments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "provider_id" uuid NOT NULL,
                "patient_id" uuid NOT NULL,
                "appointment_time" TIMESTAMP NOT NULL,
                "description" text,
                "meeting_link" text,
                "join_link" text,
                "meeting_id" bigint,
                "meeting_password" text,
                "sessionCost" numeric(10, 2),
                "sessions" integer DEFAULT '1',
                "sessionLen" integer DEFAULT '30',
                "status" "public"."appointments_status_enum" NOT NULL DEFAULT 'pending',
                "paymentStatus" "public"."appointments_paymentstatus_enum" NOT NULL DEFAULT 'payment_pending',
                "doctorsNote" text,
                CONSTRAINT "PK_4a437a9a27e948726b8bb3e36ad" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_e3e268ed1125872144e68b9a41" ON "appointments" ("provider_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_3330f054416745deaa2cc13070" ON "appointments" ("patient_id")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."IDX_3330f054416745deaa2cc13070"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_e3e268ed1125872144e68b9a41"
        `);
    await queryRunner.query(`
            DROP TABLE "appointments"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."appointments_paymentstatus_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."appointments_status_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "drug_requisition_items"
        `);
    await queryRunner.query(`
            DROP TABLE "drug_requisitions"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."drug_requisitions_payment_status_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."drug_requisitions_status_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "prescriptions"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."prescriptions_status_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "prescription_items"
        `);
    await queryRunner.query(`
            DROP TABLE "test_requisition_items"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."test_requisition_items_status_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "test_requisitions"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."test_requisitions_payment_status_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."test_requisitions_status_enum"
        `);
  }
}
