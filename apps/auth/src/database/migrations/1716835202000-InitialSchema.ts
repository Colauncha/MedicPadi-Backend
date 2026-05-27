import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1716835202000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for AuthRole
    await queryRunner.query(
      `CREATE TYPE "public"."auth_role_enum" AS ENUM('PATIENT', 'DOCTOR', 'PHARMACY', 'LABORATORY', 'ADMIN')`,
    );

    // Create auth table
    await queryRunner.query(
      `CREATE TABLE "auth" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(50) NOT NULL, "passwordhash" character varying(255) NOT NULL, "role" "public"."auth_role_enum" NOT NULL DEFAULT 'PATIENT', "phoneNumber" character varying(14), "isVerified" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "earlyUser" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_auth" PRIMARY KEY ("id"), CONSTRAINT "UQ_auth_email" UNIQUE ("email"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_auth_email" ON "auth" ("email")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table
    await queryRunner.query(`DROP INDEX "IDX_auth_email"`);
    await queryRunner.query(`DROP TABLE "auth"`);
    await queryRunner.query(`DROP TYPE "public"."auth_role_enum"`);
  }
}
