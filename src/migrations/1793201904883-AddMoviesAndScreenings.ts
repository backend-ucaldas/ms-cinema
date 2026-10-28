import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMoviesAndScreenings1793201904883 implements MigrationInterface {
    name = 'AddMoviesAndScreenings1793201904883'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`screenings\` (\`id\` int NOT NULL AUTO_INCREMENT, \`scheduledAt\` datetime NOT NULL, \`theater_id\` int NOT NULL, \`movie_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`movies\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(180) NOT NULL, \`duration\` int NOT NULL, \`date\` date NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`screenings\` ADD CONSTRAINT \`FK_c2ba7ed0da823f76b931b3f92c6\` FOREIGN KEY (\`theater_id\`) REFERENCES \`theaters\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`screenings\` ADD CONSTRAINT \`FK_540b3ebcebc8d837436ad0989bc\` FOREIGN KEY (\`movie_id\`) REFERENCES \`movies\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`screenings\` DROP FOREIGN KEY \`FK_540b3ebcebc8d837436ad0989bc\``);
        await queryRunner.query(`ALTER TABLE \`screenings\` DROP FOREIGN KEY \`FK_c2ba7ed0da823f76b931b3f92c6\``);
        await queryRunner.query(`DROP TABLE \`movies\``);
        await queryRunner.query(`DROP TABLE \`screenings\``);
    }

}
