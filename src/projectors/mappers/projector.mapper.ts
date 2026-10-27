import { CreateProjectorDto } from '../dto/create-projector.dto';
import { ProjectorResponseDto } from '../dto/projector-response.dto';
import { UpdateProjectorDto } from '../dto/update-projector.dto';
import { Projector } from '../entities/projector.entity';

export class ProjectorMapper {
  static toEntity(dto: CreateProjectorDto, theater?: Projector['theater']): Projector {
    return {
      brand: dto.brand,
      high: dto.high,
      width: dto.width,
      theater,
    } as Projector;
  }

  static mergeEntity(entity: Projector, dto: UpdateProjectorDto): Projector {
    if (dto.brand !== undefined) entity.brand = dto.brand;
    if (dto.high !== undefined) entity.high = dto.high;
    if (dto.width !== undefined) entity.width = dto.width;
    return entity;
  }

  static toResponseDto(entity: Projector): ProjectorResponseDto {
    return {
      id: entity.id,
      brand: entity.brand,
      high: entity.high,
      width: entity.width,
      theaterId: entity.theater?.id,
    };
  }
}
