import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSeatsRelation1793137658606 implements MigrationInterface {
    name = 'AddSeatsRelation1793137658606'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`seats\` (\`id\` int NOT NULL AUTO_INCREMENT, \`location\` varchar(20) NOT NULL, \`reclining\` tinyint NOT NULL, \`theater_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`seats\` ADD CONSTRAINT \`FK_0e2547501640e2c3c68c2036277\` FOREIGN KEY (\`theater_id\`) REFERENCES \`theaters\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`seats\` DROP FOREIGN KEY \`FK_0e2547501640e2c3c68c2036277\``);
        await queryRunner.query(`DROP TABLE \`seats\``);
    }

}
