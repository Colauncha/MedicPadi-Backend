import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791760482982 implements MigrationInterface {
  name = 'InitialSchema1791760482982';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."auth_role_enum" AS ENUM(
                'patient',
                'consultant',
                'pharmacy',
                'lab',
                'admin'
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."auth_subscription_enum" AS ENUM('free', 'basic', 'premium', 'professional')
        `);
    await queryRunner.query(`
            CREATE TABLE "auth" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying(50) NOT NULL,
                "passwordhash" character varying(255) NOT NULL,
                "role" "public"."auth_role_enum" NOT NULL DEFAULT 'patient',
                "subscription" "public"."auth_subscription_enum" NOT NULL DEFAULT 'free',
                "isVerified" boolean NOT NULL DEFAULT false,
                "isEmailVerified" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "earlyUser" boolean NOT NULL DEFAULT false,
                CONSTRAINT "UQ_b54f616411ef3824f6a5c06ea46" UNIQUE ("email"),
                CONSTRAINT "PK_7e416cf6172bc5aec04244f6459" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "auth"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."auth_subscription_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."auth_role_enum"
        `);
  }
}
