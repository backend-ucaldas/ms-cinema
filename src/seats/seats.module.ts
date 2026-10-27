import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Theater } from '../theaters/entities/theater.entity';
import { Seat } from './entities/seat.entity';
import { SeatsRepository } from './repositories/seats.repository';
import { SeatsController } from './seats.controller';
import { SeatsService } from './seats.service';

@Module({
  imports: [TypeOrmModule.forFeature([Seat, Theater])],
  controllers: [SeatsController],
  providers: [SeatsService, SeatsRepository],
})
export class SeatsModule {}
