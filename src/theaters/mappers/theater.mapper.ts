import { Injectable } from '@nestjs/common';
import { CreateTheaterDto } from '../dto/create-theater.dto';
import { TheaterResponseDto } from '../dto/theater-response.dto';
import { UpdateTheaterDto } from '../dto/update-theater.dto';
import { Theater } from '../entities/theater.entity';
import { ProjectorMapper } from '../../projectors/mappers/projector.mapper';
import { ScreeningMapper } from '../../screenings/mappers/screening.mapper';
import { SeatMapper } from '../../seats/mappers/seat.mapper';

@Injectable()
export class TheaterMapper {
  toEntity(dto: CreateTheaterDto): Theater {
    return {
      location: dto.location,
      capacity: dto.capacity,
    } as Theater;
  }

  mergeEntity(entity: Theater, dto: UpdateTheaterDto): Theater {
    if (dto.location !== undefined) entity.location = dto.location;
    if (dto.capacity !== undefined) entity.capacity = dto.capacity;
    return entity;
  }

  toResponseDto(entity: Theater): TheaterResponseDto {
    return {
      id: entity.id,
      location: entity.location,
      capacity: entity.capacity,
      projector: entity.projector
        ? ProjectorMapper.toResponseDto(entity.projector)
        : undefined,
      seats: entity.seats
        ? SeatMapper.toResponseDtoList(entity.seats, entity.id)
        : undefined,
      screenings: entity.screenings
        ? ScreeningMapper.toResponseDtoList(entity.screenings)
        : undefined,
    };
  }

  toResponseDtoList(entities: Theater[]): TheaterResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
