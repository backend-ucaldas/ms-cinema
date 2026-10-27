import { Projector } from '../../projectors/entities/projector.entity';
import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

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
}
