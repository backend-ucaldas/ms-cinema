import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theater } from '../theaters/entities/theater.entity';
import { ProjectorDto } from './dto/projector.dto';
import { ProjectorResponseDto } from './dto/projector-response.dto';
import { Projector } from './entities/projector.entity';
import { ProjectorMapper } from './mappers/projector.mapper';

@Injectable()
export class ProjectorsService {
  constructor(
    @InjectRepository(Projector)
    private readonly projectorsRepository: Repository<Projector>,
    @InjectRepository(Theater)
    private readonly theatersRepository: Repository<Theater>,
  ) {}

  async create(dto: ProjectorDto): Promise<ProjectorResponseDto> {
    if (dto.brand === undefined || dto.high === undefined || dto.width === undefined) {
      throw new BadRequestException('brand, high and width are required for create');
    }

    const theater =
      dto.theaterId === undefined
        ? undefined
        : await this.getAvailableTheater(dto.theaterId);
    const saved = await this.projectorsRepository.save(ProjectorMapper.toEntity(dto, theater));
    return this.findOne(saved.id);
  }

  async findAll(): Promise<ProjectorResponseDto[]> {
    const projectors = await this.projectorsRepository.find({ relations: { theater: true } });
    return projectors.map(ProjectorMapper.toResponseDto);
  }

  async findOne(id: number): Promise<ProjectorResponseDto> {
    const projector = await this.findProjector(id);
    return ProjectorMapper.toResponseDto(projector);
  }

  async update(id: number, dto: ProjectorDto): Promise<ProjectorResponseDto> {
    const projector = await this.findProjector(id);
    if (dto.theaterId !== undefined) {
      projector.theater = await this.getAvailableTheater(dto.theaterId, id);
    }
    const saved = await this.projectorsRepository.save(ProjectorMapper.mergeEntity(projector, dto));
    return ProjectorMapper.toResponseDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    const projector = await this.findProjector(id);
    await this.projectorsRepository.remove(projector);
    return { message: `Projector #${id} deleted successfully` };
  }

  private async findProjector(id: number): Promise<Projector> {
    const projector = await this.projectorsRepository.findOne({
      where: { id },
      relations: { theater: true },
    });
    if (!projector) throw new NotFoundException(`Projector with id ${id} not found`);
    return projector;
  }

  private async getAvailableTheater(theaterId: number, currentProjectorId?: number): Promise<Theater> {
    const theater = await this.theatersRepository.findOne({
      where: { id: theaterId },
      relations: { projector: true },
    });
    if (!theater) throw new NotFoundException(`Theater with id ${theaterId} not found`);
    if (theater.projector && theater.projector.id !== currentProjectorId) {
      throw new ConflictException(`Theater with id ${theaterId} already has a projector`);
    }
    return theater;
  }
}
