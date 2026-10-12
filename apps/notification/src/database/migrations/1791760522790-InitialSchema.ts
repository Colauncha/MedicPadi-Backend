import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791760522790 implements MigrationInterface {
  name = 'InitialSchema1791760522790';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."device_tokens_platform_enum" AS ENUM('ios', 'android', 'web')
        `);
    await queryRunner.query(`
            CREATE TABLE "device_tokens" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "platform" "public"."device_tokens_platform_enum" NOT NULL,
                "token" character varying(1024) NOT NULL,
                "web_push_keys" jsonb,
                "device_name" character varying,
                "last_seen_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_977e24c520c49436d08e5eeea8a" UNIQUE ("token"),
                CONSTRAINT "PK_84700be257607cfb1f9dc2e52c3" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_17e1f528b993c6d55def4cf5be" ON "device_tokens" ("user_id")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."notifications_type_enum" AS ENUM(
                'appointment',
                'requisition',
                'prescription',
                'payment',
                'system',
                'other'
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."notifications_channel_enum" AS ENUM('push', 'email', 'sms', 'in_app')
        `);
    await queryRunner.query(`
            CREATE TABLE "notifications" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "title" character varying NOT NULL,
                "body" text NOT NULL,
                "type" "public"."notifications_type_enum" NOT NULL,
                "source_id" uuid,
                "channel" "public"."notifications_channel_enum" NOT NULL,
                "is_read" boolean NOT NULL DEFAULT false,
                "sent_at" TIMESTAMP,
                CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "notifications"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."notifications_channel_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."notifications_type_enum"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_17e1f528b993c6d55def4cf5be"
        `);
    await queryRunner.query(`
            DROP TABLE "device_tokens"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."device_tokens_platform_enum"
        `);
  }
}
