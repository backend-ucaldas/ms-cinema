import { Movie } from '../../movies/entities/movie.entity';
import { Theater } from '../../theaters/entities/theater.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('screenings')
export class Screening {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'scheduled_at', type: 'datetime' })
  scheduledAt!: Date;

  @ManyToOne(() => Theater, (theater) => theater.screenings, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'theater_id' })
  theater!: Theater;

  @ManyToOne(() => Movie, (movie) => movie.screenings, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'movie_id' })
  movie!: Movie;
}
