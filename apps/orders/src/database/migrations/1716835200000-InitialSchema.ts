import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1716835200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(
      `CREATE TYPE "public"."appointments_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."appointments_paymentStatus_enum" AS ENUM('P_PENDING', 'P_ESCROW', 'P_CONFIRMED', 'P_FAILED')`,
    );

    // Create appointments table
    await queryRunner.query(
      `CREATE TABLE "appointments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "provider_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "appointment_time" TIMESTAMP NOT NULL, "description" text, "meeting_link" text, "join_link" text, "meeting_id" bigint, "sessionCost" numeric(10,2), "sessions" integer DEFAULT '1', "status" "public"."appointments_status_enum" NOT NULL DEFAULT 'PENDING', "paymentStatus" "public"."appointments_paymentStatus_enum" NOT NULL DEFAULT 'P_PENDING', "doctorsNote" text, CONSTRAINT "PK_appointments" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_appointments_provider_id" ON "appointments" ("provider_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_appointments_patient_id" ON "appointments" ("patient_id")`,
    );

    // Create prescriptions table
    await queryRunner.query(
      `CREATE TABLE "prescriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "patient_id" uuid NOT NULL, "provider_id" uuid NOT NULL, "diagnosis" text NOT NULL, "notes" text, CONSTRAINT "PK_prescriptions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_prescriptions_patient_id" ON "prescriptions" ("patient_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_prescriptions_provider_id" ON "prescriptions" ("provider_id")`,
    );

    // Create prescription_items table
    await queryRunner.query(
      `CREATE TABLE "prescription_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "prescription_id" uuid NOT NULL, "drug_id" uuid NOT NULL, "dosage" text NOT NULL, "frequency" text NOT NULL, "duration" text NOT NULL, CONSTRAINT "PK_prescription_items" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_prescription_items_prescription_id" ON "prescription_items" ("prescription_id")`,
    );

    // Create test_requisitions table
    await queryRunner.query(
      `CREATE TABLE "test_requisitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "patient_id" uuid NOT NULL, "provider_id" uuid NOT NULL, "notes" text, CONSTRAINT "PK_test_requisitions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_test_requisitions_patient_id" ON "test_requisitions" ("patient_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_test_requisitions_provider_id" ON "test_requisitions" ("provider_id")`,
    );

    // Create test_requisition_items table
    await queryRunner.query(
      `CREATE TABLE "test_requisition_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "test_requisition_id" uuid NOT NULL, "test_id" uuid NOT NULL, CONSTRAINT "PK_test_requisition_items" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_test_requisition_items_test_requisition_id" ON "test_requisition_items" ("test_requisition_id")`,
    );

    // Create drug_requisitions table
    await queryRunner.query(
      `CREATE TABLE "drug_requisitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "patient_id" uuid NOT NULL, "provider_id" uuid NOT NULL, "notes" text, CONSTRAINT "PK_drug_requisitions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_drug_requisitions_patient_id" ON "drug_requisitions" ("patient_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_drug_requisitions_provider_id" ON "drug_requisitions" ("provider_id")`,
    );

    // Create drug_requisition_items table
    await queryRunner.query(
      `CREATE TABLE "drug_requisition_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "drug_requisition_id" uuid NOT NULL, "drug_id" uuid NOT NULL, "quantity" integer NOT NULL, CONSTRAINT "PK_drug_requisition_items" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_drug_requisition_items_drug_requisition_id" ON "drug_requisition_items" ("drug_requisition_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP INDEX "IDX_drug_requisition_items_drug_requisition_id"`);
    await queryRunner.query(`DROP TABLE "drug_requisition_items"`);
    await queryRunner.query(`DROP INDEX "IDX_drug_requisitions_provider_id"`);
    await queryRunner.query(`DROP INDEX "IDX_drug_requisitions_patient_id"`);
    await queryRunner.query(`DROP TABLE "drug_requisitions"`);
    await queryRunner.query(`DROP INDEX "IDX_test_requisition_items_test_requisition_id"`);
    await queryRunner.query(`DROP TABLE "test_requisition_items"`);
    await queryRunner.query(`DROP INDEX "IDX_test_requisitions_provider_id"`);
    await queryRunner.query(`DROP INDEX "IDX_test_requisitions_patient_id"`);
    await queryRunner.query(`DROP TABLE "test_requisitions"`);
    await queryRunner.query(`DROP INDEX "IDX_prescription_items_prescription_id"`);
    await queryRunner.query(`DROP TABLE "prescription_items"`);
    await queryRunner.query(`DROP INDEX "IDX_prescriptions_provider_id"`);
    await queryRunner.query(`DROP INDEX "IDX_prescriptions_patient_id"`);
    await queryRunner.query(`DROP TABLE "prescriptions"`);
    await queryRunner.query(`DROP INDEX "IDX_appointments_patient_id"`);
    await queryRunner.query(`DROP INDEX "IDX_appointments_provider_id"`);
    await queryRunner.query(`DROP TABLE "appointments"`);
    await queryRunner.query(`DROP TYPE "public"."appointments_paymentStatus_enum"`);
    await queryRunner.query(`DROP TYPE "public"."appointments_status_enum"`);
  }
}
