import { Screening } from '../../screenings/entities/screening.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 180 })
  name!: string;

  @Column({ type: 'int' })
  duration!: number;

  @Column({ type: 'date' })
  date!: string;

  @OneToMany(() => Screening, (screening) => screening.movie, {
    cascade: false,
  })
  screenings?: Screening[];
}
