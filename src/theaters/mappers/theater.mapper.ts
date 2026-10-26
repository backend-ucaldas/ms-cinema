import { Injectable } from '@nestjs/common';
import { TheaterDto } from '../dto/theater.dto';
import { TheaterResponseDto } from '../dto/theater-response.dto';
import { Theater } from '../entities/theater.entity';

@Injectable()
export class TheaterMapper {
  toEntity(dto: TheaterDto): Theater {
    return {
      location: dto.location,
      capacity: dto.capacity,
    } as Theater;
  }

  mergeEntity(entity: Theater, dto: TheaterDto): Theater {
    if (dto.location !== undefined) entity.location = dto.location;
    if (dto.capacity !== undefined) entity.capacity = dto.capacity;
    return entity;
  }

  toResponseDto(entity: Theater): TheaterResponseDto {
    return {
      id: entity.id,
      location: entity.location,
      capacity: entity.capacity,
    };
  }

  toResponseDtoList(entities: Theater[]): TheaterResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
