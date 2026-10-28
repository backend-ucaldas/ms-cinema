import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from '../movies/entities/movie.entity';
import { Theater } from '../theaters/entities/theater.entity';
import { Screening } from './entities/screening.entity';
import { ScreeningsController } from './screenings.controller';
import { ScreeningsRepository } from './repositories/screenings.repository';
import { ScreeningsService } from './screenings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Screening, Theater, Movie])],
  controllers: [ScreeningsController],
  providers: [ScreeningsService, ScreeningsRepository],
})
export class ScreeningsModule {}
