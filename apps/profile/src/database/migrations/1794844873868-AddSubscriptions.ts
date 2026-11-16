import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptions1794844873868 implements MigrationInterface {
  name = 'AddSubscriptions1794844873868';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."subscriptions_role_enum" AS ENUM(
                'patient',
                'consultant',
                'pharmacy',
                'lab',
                'admin'
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."subscriptions_audience_enum" AS ENUM('patient', 'provider')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."subscriptions_plan_code_enum" AS ENUM('free', 'basic', 'premium', 'professional')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."subscriptions_pending_plan_code_enum" AS ENUM('free', 'basic', 'premium', 'professional')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."subscriptions_status_enum" AS ENUM('active', 'past_due', 'expired')
        `);
    await queryRunner.query(`
            CREATE TABLE "subscriptions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "role" "public"."subscriptions_role_enum" NOT NULL,
                "audience" "public"."subscriptions_audience_enum" NOT NULL,
                "plan_code" "public"."subscriptions_plan_code_enum" NOT NULL DEFAULT 'free',
                "pending_plan_code" "public"."subscriptions_pending_plan_code_enum",
                "status" "public"."subscriptions_status_enum" NOT NULL DEFAULT 'active',
                "cancel_at_period_end" boolean NOT NULL DEFAULT false,
                "current_period_start" TIMESTAMP WITH TIME ZONE,
                "current_period_end" TIMESTAMP WITH TIME ZONE,
                "grace_until" TIMESTAMP WITH TIME ZONE,
                "failed_attempts" integer NOT NULL DEFAULT '0',
                "last_charge_attempt_at" TIMESTAMP WITH TIME ZONE,
                "reminder_sent_for_period_end" TIMESTAMP WITH TIME ZONE,
                "paystack_authorization_code" character varying,
                "card_reusable" boolean,
                "card_last4" character varying(4),
                "card_exp_month" character varying(2),
                "card_exp_year" character varying(4),
                "card_type" character varying,
                "card_bank" character varying,
                "card_signature" character varying,
                "customer_email" character varying,
                "last_transaction_reference" character varying,
                "cancelled_at" TIMESTAMP WITH TIME ZONE,
                "downgraded_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "UQ_d0a95ef8a28188364c546eb65c1" UNIQUE ("user_id"),
                CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_c4758f4a8b45c35644813e2139" ON "subscriptions" ("status", "current_period_end")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."subscription_plans_code_enum" AS ENUM('free', 'basic', 'premium', 'professional')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."subscription_plans_audience_enum" AS ENUM('patient', 'provider')
        `);
    await queryRunner.query(`
            CREATE TABLE "subscription_plans" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "code" "public"."subscription_plans_code_enum" NOT NULL,
                "audience" "public"."subscription_plans_audience_enum" NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying,
                "price" numeric(10, 2) NOT NULL DEFAULT '0',
                "currency" character varying NOT NULL DEFAULT 'NGN',
                "interval" character varying NOT NULL DEFAULT 'monthly',
                "is_active" boolean NOT NULL DEFAULT true,
                "features" jsonb,
                "sort_order" integer NOT NULL DEFAULT '0',
                CONSTRAINT "UQ_ae56742cba63f48637c970dd24e" UNIQUE ("code", "audience"),
                CONSTRAINT "PK_9ab8fe6918451ab3d0a4fb6bb0c" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "subscription_plans"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."subscription_plans_audience_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."subscription_plans_code_enum"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_c4758f4a8b45c35644813e2139"
        `);
    await queryRunner.query(`
            DROP TABLE "subscriptions"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."subscriptions_status_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."subscriptions_pending_plan_code_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."subscriptions_plan_code_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."subscriptions_audience_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."subscriptions_role_enum"
        `);
  }
}
