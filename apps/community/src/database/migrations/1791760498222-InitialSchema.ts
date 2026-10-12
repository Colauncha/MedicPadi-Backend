import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791760498222 implements MigrationInterface {
  name = 'InitialSchema1791760498222';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "community_posts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "group_id" uuid NOT NULL,
                "author_id" uuid NOT NULL,
                "content" text NOT NULL,
                "is_anonymous" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_af0c0b33e03b933e3e48119f2e3" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "community_groups" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "name" character varying NOT NULL,
                "description" text,
                "created_by" uuid NOT NULL,
                CONSTRAINT "PK_c69dcd2be64285e2c7031894f3a" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "community_groups"
        `);
    await queryRunner.query(`
            DROP TABLE "community_posts"
        `);
  }
}
