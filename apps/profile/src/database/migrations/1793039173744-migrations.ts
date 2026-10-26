import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1793039173744 implements MigrationInterface {
    name = 'Migrations1793039173744'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "pharmacy"
            ADD "deliveryCost" numeric(10, 2)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "pharmacy" DROP COLUMN "deliveryCost"
        `);
    }

}
