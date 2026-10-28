import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMoviesAndScreenings1793139000000 implements MigrationInterface {
  name = 'AddMoviesAndScreenings1793139000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `movies` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(180) NOT NULL, `duration` int NOT NULL, `date` date NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
    );
    await queryRunner.query(
      'CREATE TABLE `screenings` (`id` int NOT NULL AUTO_INCREMENT, `scheduled_at` datetime NOT NULL, `theater_id` int NOT NULL, `movie_id` int NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
    );
    await queryRunner.query(
      'ALTER TABLE `screenings` ADD CONSTRAINT `FK_screenings_theater_id` FOREIGN KEY (`theater_id`) REFERENCES `theaters`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE `screenings` ADD CONSTRAINT `FK_screenings_movie_id` FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `screenings` DROP FOREIGN KEY `FK_screenings_movie_id`');
    await queryRunner.query('ALTER TABLE `screenings` DROP FOREIGN KEY `FK_screenings_theater_id`');
    await queryRunner.query('DROP TABLE `screenings`');
    await queryRunner.query('DROP TABLE `movies`');
  }
}
