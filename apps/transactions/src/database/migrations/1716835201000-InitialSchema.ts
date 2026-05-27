import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1716835201000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_source_type_enum" AS ENUM('appointment', 'drug_requisition', 'test_requisition', 'subscription')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_payment_status_enum" AS ENUM('PENDING', 'ESCROW', 'CONFIRMED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_gateway_enum" AS ENUM('PAYSTACK', 'FLUTTERWAVE')`,
    );

    // Create transactions table
    await queryRunner.query(
      `CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "user_id" uuid NOT NULL, "source_type" "public"."transactions_source_type_enum" NOT NULL, "source_id" uuid, "provider_id" uuid, "amount" numeric(10,2) NOT NULL, "currency" varchar NOT NULL DEFAULT 'NGN', "payment_status" "public"."transactions_payment_status_enum" NOT NULL DEFAULT 'PENDING', "gateway" "public"."transactions_gateway_enum", "gateway_reference" varchar, "access_code" varchar, CONSTRAINT "PK_transactions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_user_id" ON "transactions" ("user_id")`,
    );

    // Create wallets table
    await queryRunner.query(
      `CREATE TABLE "wallets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "user_id" uuid NOT NULL, "balance" numeric(10,2) NOT NULL DEFAULT '0', "currency" varchar NOT NULL DEFAULT 'NGN', CONSTRAINT "PK_wallets" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_wallets_user_id" ON "wallets" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP INDEX "IDX_wallets_user_id"`);
    await queryRunner.query(`DROP TABLE "wallets"`);
    await queryRunner.query(`DROP INDEX "IDX_transactions_user_id"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_gateway_enum"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_source_type_enum"`);
  }
}
