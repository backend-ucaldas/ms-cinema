import { MigrationInterface, QueryRunner } from "typeorm";

export class InitCinemaSchema1793135320152 implements MigrationInterface {
    name = 'InitCinemaSchema1793135320152'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`theaters\` (\`id\` int NOT NULL AUTO_INCREMENT, \`location\` varchar(120) NOT NULL, \`capacity\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`projectors\` (\`id\` int NOT NULL AUTO_INCREMENT, \`brand\` varchar(120) NOT NULL, \`high\` int NOT NULL, \`width\` int NOT NULL, \`theater_id\` int NULL, UNIQUE INDEX \`REL_39723a507706f581bc5928ff8f\` (\`theater_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`projectors\` ADD CONSTRAINT \`FK_39723a507706f581bc5928ff8f3\` FOREIGN KEY (\`theater_id\`) REFERENCES \`theaters\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`projectors\` DROP FOREIGN KEY \`FK_39723a507706f581bc5928ff8f3\``);
        await queryRunner.query(`DROP INDEX \`REL_39723a507706f581bc5928ff8f\` ON \`projectors\``);
        await queryRunner.query(`DROP TABLE \`projectors\``);
        await queryRunner.query(`DROP TABLE \`theaters\``);
    }

}
