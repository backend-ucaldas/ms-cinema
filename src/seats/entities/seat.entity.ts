import { Theater } from '../../theaters/entities/theater.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('seats')
export class Seat {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 20 })
  location!: string;

  @Column({ type: 'boolean' })
  reclining!: boolean;

  @ManyToOne(() => Theater, (theater) => theater.seats, {
    cascade: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'theater_id' })
  theater!: Theater;
}
