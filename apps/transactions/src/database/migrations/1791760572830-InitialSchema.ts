import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791760572830 implements MigrationInterface {
  name = 'InitialSchema1791760572830';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "wallets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "balance" numeric(10, 2) NOT NULL DEFAULT '0',
                "currency" character varying NOT NULL DEFAULT 'NGN',
                CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."transactions_source_type_enum" AS ENUM(
                'appointment',
                'drug_requisition',
                'test_requisition',
                'subscription'
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."transactions_payment_status_enum" AS ENUM(
                'pending',
                'escrow',
                'paid',
                'failed',
                'refunded'
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."transactions_gateway_enum" AS ENUM('paystack', 'flutterwave', 'hmo_claim')
        `);
    await queryRunner.query(`
            CREATE TABLE "transactions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "source_type" "public"."transactions_source_type_enum" NOT NULL,
                "source_id" uuid,
                "provider_id" uuid,
                "amount" numeric(10, 2) NOT NULL,
                "currency" character varying NOT NULL DEFAULT 'NGN',
                "payment_status" "public"."transactions_payment_status_enum" NOT NULL DEFAULT 'pending',
                "gateway" "public"."transactions_gateway_enum",
                "gateway_reference" character varying,
                "access_code" character varying,
                CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."withdrawals_status_enum" AS ENUM(
                'pending',
                'processing',
                'success',
                'failed',
                'reversed'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "withdrawals" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "amount" numeric(10, 2) NOT NULL,
                "currency" character varying NOT NULL DEFAULT 'NGN',
                "status" "public"."withdrawals_status_enum" NOT NULL DEFAULT 'pending',
                "reference" character varying NOT NULL,
                "transfer_code" character varying,
                "recipient_code" character varying NOT NULL,
                "failure_reason" character varying,
                CONSTRAINT "UQ_withdrawals_reference" UNIQUE ("reference"),
                CONSTRAINT "PK_9871ec481baa7755f8bd8b7c7e9" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_withdrawals_user_id" ON "withdrawals" ("user_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "payout_accounts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "bank_code" character varying NOT NULL,
                "bank_name" character varying NOT NULL,
                "account_number" character varying NOT NULL,
                "account_name" character varying NOT NULL,
                "recipient_code" character varying NOT NULL,
                "currency" character varying NOT NULL DEFAULT 'NGN',
                CONSTRAINT "UQ_payout_accounts_user_id" UNIQUE ("user_id"),
                CONSTRAINT "PK_79642d5304997f09e3dfc6084d1" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "payout_accounts"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_withdrawals_user_id"
        `);
    await queryRunner.query(`
            DROP TABLE "withdrawals"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."withdrawals_status_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "transactions"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."transactions_gateway_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."transactions_payment_status_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."transactions_source_type_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "wallets"
        `);
  }
}
