import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Theater } from '../theaters/entities/theater.entity';
import { Projector } from './entities/projector.entity';
import { ProjectorsController } from './projectors.controller';
import { ProjectorsService } from './projectors.service';

@Module({
  imports: [TypeOrmModule.forFeature([Projector, Theater])],
  controllers: [ProjectorsController],
  providers: [ProjectorsService],
})
export class ProjectorsModule {}
