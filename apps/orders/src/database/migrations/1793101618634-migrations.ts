import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1793101618634 implements MigrationInterface {
    name = 'Migrations1793101618634'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "drug_requisitions"
            ADD "delivery_cost" numeric(10, 2)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "drug_requisitions" DROP COLUMN "delivery_cost"
        `);
    }

}
