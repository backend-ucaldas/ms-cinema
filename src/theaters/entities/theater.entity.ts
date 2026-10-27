import { Projector } from '../../projectors/entities/projector.entity';
import { Seat } from '../../seats/entities/seat.entity';
import { Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('theaters')
export class Theater {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  location!: string;

  @Column({ type: 'int' })
  capacity!: number;

  @OneToOne(() => Projector, (projector) => projector.theater)
  projector?: Projector;

  @OneToMany(() => Seat, (seat) => seat.theater, { cascade: false })
  seats?: Seat[];
}
