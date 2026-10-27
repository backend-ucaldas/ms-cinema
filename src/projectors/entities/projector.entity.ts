import { Theater } from '../../theaters/entities/theater.entity';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('projectors')
export class Projector {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  brand!: string;

  @Column({ type: 'int' })
  high!: number;

  @Column({ type: 'int' })
  width!: number;

  @OneToOne(() => Theater, (theater) => theater.projector, {
    cascade: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'theater_id' })
  theater!: Theater;
}
