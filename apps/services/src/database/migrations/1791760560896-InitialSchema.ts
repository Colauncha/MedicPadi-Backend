import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791760560896 implements MigrationInterface {
  name = 'InitialSchema1791760560896';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "drug_categories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying,
                CONSTRAINT "PK_f5fca3ec194af86f9c75b954fc6" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "pharmacy_drugs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" character varying NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying,
                "price" double precision NOT NULL,
                "stock" integer,
                "available" boolean DEFAULT false,
                "category_id" uuid NOT NULL,
                "drugImage" text,
                "requiresPrescription" boolean DEFAULT false,
                "dosage" character varying,
                "composition" character varying,
                "sideEffect" character varying,
                "linkToMedWebsite" character varying,
                CONSTRAINT "PK_d872fdbfe059477884c23234da2" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "departments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying,
                CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "lab_tests" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" character varying NOT NULL,
                "name" character varying NOT NULL,
                "shortName" character varying NOT NULL,
                "description" character varying,
                "price" double precision NOT NULL,
                "available" boolean DEFAULT false,
                "TAT" double precision NOT NULL,
                "hasImage" boolean NOT NULL DEFAULT false,
                "department_id" uuid NOT NULL,
                CONSTRAINT "PK_400d229da68540bf586c0f4a20f" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "pharmacy_drugs"
            ADD CONSTRAINT "FK_39baca4ce5707cb2bc03226cca2" FOREIGN KEY ("category_id") REFERENCES "drug_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "lab_tests"
            ADD CONSTRAINT "FK_8c81655221bc6d64ad33db778ce" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "lab_tests" DROP CONSTRAINT "FK_8c81655221bc6d64ad33db778ce"
        `);
    await queryRunner.query(`
            ALTER TABLE "pharmacy_drugs" DROP CONSTRAINT "FK_39baca4ce5707cb2bc03226cca2"
        `);
    await queryRunner.query(`
            DROP TABLE "lab_tests"
        `);
    await queryRunner.query(`
            DROP TABLE "departments"
        `);
    await queryRunner.query(`
            DROP TABLE "pharmacy_drugs"
        `);
    await queryRunner.query(`
            DROP TABLE "drug_categories"
        `);
  }
}
