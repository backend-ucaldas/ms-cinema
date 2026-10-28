import { ScreeningMapper } from '../../screenings/mappers/screening.mapper';
import { CreateMovieDto } from '../dto/create-movie.dto';
import { MovieResponseDto } from '../dto/movie-response.dto';
import { UpdateMovieDto } from '../dto/update-movie.dto';
import { Movie } from '../entities/movie.entity';

export class MovieMapper {
  static toEntity(dto: CreateMovieDto): Movie {
    return { name: dto.name, duration: dto.duration, date: dto.date } as Movie;
  }

  static mergeEntity(entity: Movie, dto: UpdateMovieDto): Movie {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.duration !== undefined) entity.duration = dto.duration;
    if (dto.date !== undefined) entity.date = dto.date;
    return entity;
  }

  static toResponseDto(entity: Movie): MovieResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      duration: entity.duration,
      date: entity.date,
      screenings: entity.screenings
        ? ScreeningMapper.toResponseDtoList(entity.screenings)
        : undefined,
    };
  }

  static toResponseDtoList(entities: Movie[]): MovieResponseDto[] {
    return entities.map(this.toResponseDto);
  }
}
