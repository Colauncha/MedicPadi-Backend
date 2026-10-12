import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791760548308 implements MigrationInterface {
  name = 'InitialSchema1791760548308';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."doctor_gender_enum" AS ENUM('male', 'female')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."doctor_speciality_enum" AS ENUM(
                'general consultant',
                'oncology',
                'cardiologists',
                'dermatologists',
                'endocrinologists',
                'neurologists',
                'psychiatrists',
                'radiologists',
                'pathologists',
                'others'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "doctor" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "firstName" character varying,
                "lastName" character varying,
                "gender" "public"."doctor_gender_enum" NOT NULL DEFAULT 'male',
                "phoneNumber" character varying(14),
                "licenceNumber" character varying,
                "speciality" "public"."doctor_speciality_enum" NOT NULL DEFAULT 'general consultant',
                "bio" character varying(240),
                "costPerSession" numeric(10, 2),
                "sessionLength" integer DEFAULT '30',
                "profilePicture" text,
                "education" jsonb DEFAULT '[]',
                "businessHours" jsonb,
                "placeOfWork" character varying,
                "yearsOfService" integer,
                "awards" integer,
                "settings" text,
                "isProfileComplete" boolean NOT NULL DEFAULT false,
                "rating" numeric(10, 2),
                "totalReviews" integer,
                CONSTRAINT "UQ_a685e79dc974f768c39e5d12281" UNIQUE ("user_id"),
                CONSTRAINT "UQ_91c53543bf9a22b538c8634873e" UNIQUE ("licenceNumber"),
                CONSTRAINT "PK_ee6bf6c8de78803212c548fcb94" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "pharmacy" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "name" character varying,
                "phoneNumber" character varying(14),
                "registrationNumber" character varying,
                "address" character varying,
                "profilePicture" text,
                "businessHours" jsonb,
                "about" character varying,
                "yearsOfService" integer,
                "awards" integer,
                "settings" text,
                "isProfileComplete" boolean NOT NULL DEFAULT false,
                "rating" numeric(10, 2),
                "totalReviews" integer,
                CONSTRAINT "UQ_672832178b734bba48fe9438ed1" UNIQUE ("user_id"),
                CONSTRAINT "UQ_c42fa28000de3d27b5699fafbd0" UNIQUE ("registrationNumber"),
                CONSTRAINT "PK_f6712b909f461cf4fe9926e0c5d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "laboratory" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "name" character varying,
                "phoneNumber" character varying(14),
                "registrationNumber" character varying,
                "address" character varying,
                "profilePicture" jsonb,
                "businessHours" jsonb,
                "about" character varying,
                "yearsOfService" integer,
                "awards" integer,
                "settings" text,
                "isProfileComplete" boolean NOT NULL DEFAULT false,
                "rating" numeric(10, 2),
                "totalReviews" integer,
                CONSTRAINT "UQ_6490d143a2072372b6d617ad6fb" UNIQUE ("user_id"),
                CONSTRAINT "UQ_8d0e15785ae6f34ec854d6e1009" UNIQUE ("registrationNumber"),
                CONSTRAINT "PK_3bf32a10e42e572b37799d66f1c" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."patient_gender_enum" AS ENUM('male', 'female')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."patient_bloodgroup_enum" AS ENUM('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."patient_genotype_enum" AS ENUM('AA', 'AS', 'AC', 'SS', 'CC', 'SC')
        `);
    await queryRunner.query(`
            CREATE TABLE "patient" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "firstName" character varying,
                "lastName" character varying,
                "gender" "public"."patient_gender_enum" NOT NULL DEFAULT 'male',
                "bloodGroup" "public"."patient_bloodgroup_enum" NOT NULL DEFAULT 'O+',
                "genotype" "public"."patient_genotype_enum" NOT NULL DEFAULT 'AA',
                "allergies" text array,
                "height" numeric(10, 2),
                "weight" numeric(10, 2),
                "dateOfBirth" date,
                "phoneNumber" character varying(14),
                "emergencyContact" character varying(14),
                "nextOfKin" text,
                "profilePicture" text,
                "settings" text,
                "isProfileComplete" boolean NOT NULL DEFAULT false,
                CONSTRAINT "UQ_f20f0bf6b734938c710e12c2782" UNIQUE ("user_id"),
                CONSTRAINT "PK_8dfa510bb29ad31ab2139fbfb99" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."reviews_profile_type_enum" AS ENUM('doctor', 'pharmacy', 'laboratory')
        `);
    await queryRunner.query(`
            CREATE TABLE "reviews" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "message" character varying NOT NULL,
                "profile_type" "public"."reviews_profile_type_enum" NOT NULL,
                "doctor_id" uuid,
                "pharmacy_id" uuid,
                "laboratory_id" uuid,
                "reviewer_id" uuid NOT NULL,
                "rating" numeric(10, 2) NOT NULL,
                CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "admin" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "firstName" character varying,
                "lastName" character varying,
                "permissions" text array NOT NULL,
                "settings" text,
                CONSTRAINT "UQ_a28028ba709cd7e5053a86857b4" UNIQUE ("user_id"),
                CONSTRAINT "PK_e032310bcef831fb83101899b10" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "reviews"
            ADD CONSTRAINT "FK_eefa239f3536811d445eae9250b" FOREIGN KEY ("doctor_id") REFERENCES "doctor"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "reviews"
            ADD CONSTRAINT "FK_cf02f0bd6791a707c1f8df8b5ba" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacy"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "reviews"
            ADD CONSTRAINT "FK_c66b1af26c5cce24d1e584c5786" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "reviews"
            ADD CONSTRAINT "FK_92e950a2513a79bb3fab273c92e" FOREIGN KEY ("reviewer_id") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "reviews" DROP CONSTRAINT "FK_92e950a2513a79bb3fab273c92e"
        `);
    await queryRunner.query(`
            ALTER TABLE "reviews" DROP CONSTRAINT "FK_c66b1af26c5cce24d1e584c5786"
        `);
    await queryRunner.query(`
            ALTER TABLE "reviews" DROP CONSTRAINT "FK_cf02f0bd6791a707c1f8df8b5ba"
        `);
    await queryRunner.query(`
            ALTER TABLE "reviews" DROP CONSTRAINT "FK_eefa239f3536811d445eae9250b"
        `);
    await queryRunner.query(`
            DROP TABLE "admin"
        `);
    await queryRunner.query(`
            DROP TABLE "reviews"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."reviews_profile_type_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "patient"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."patient_genotype_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."patient_bloodgroup_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."patient_gender_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "laboratory"
        `);
    await queryRunner.query(`
            DROP TABLE "pharmacy"
        `);
    await queryRunner.query(`
            DROP TABLE "doctor"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."doctor_speciality_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."doctor_gender_enum"
        `);
  }
}
