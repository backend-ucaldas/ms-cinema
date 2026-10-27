import { CreateSeatDto } from '../dto/create-seat.dto';
import { SeatResponseDto } from '../dto/seat-response.dto';
import { UpdateSeatDto } from '../dto/update-seat.dto';
import { Seat } from '../entities/seat.entity';

export class SeatMapper {
  static toEntity(dto: CreateSeatDto, theater: Seat['theater']): Seat {
    return {
      location: dto.location,
      reclining: dto.reclining,
      theater,
    } as Seat;
  }

  static mergeEntity(entity: Seat, dto: UpdateSeatDto): Seat {
    if (dto.location !== undefined) entity.location = dto.location;
    if (dto.reclining !== undefined) entity.reclining = dto.reclining;
    return entity;
  }

  static toResponseDto(entity: Seat, theaterId = entity.theater?.id): SeatResponseDto {
    return {
      id: entity.id,
      location: entity.location,
      reclining: entity.reclining,
      theaterId: theaterId!,
    };
  }

  static toResponseDtoList(entities: Seat[], theaterId?: number): SeatResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity, theaterId));
  }
}
