import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TheaterDto } from './dto/theater.dto';
import { TheaterResponseDto } from './dto/theater-response.dto';
import { TheaterMapper } from './mappers/theater.mapper';
import { TheatersRepository } from './repositories/theaters.repository';
import { Theater } from './entities/theater.entity';

@Injectable()
export class TheatersService {
  constructor(
    @InjectRepository(Theater)
    private readonly theatersRepository: Repository<Theater>,
    private readonly customTheatersRepository: TheatersRepository,
    private readonly theaterMapper: TheaterMapper,
  ) {}

  async create(dto: TheaterDto): Promise<TheaterResponseDto> {
    if (dto.location === undefined || dto.capacity === undefined) {
      throw new BadRequestException(
        'location and capacity are required for create',
      );
    }

    const entity = this.theaterMapper.toEntity(dto);
    const saved = await this.theatersRepository.save(entity);
    return this.theaterMapper.toResponseDto(saved);
  }

  async findAll(): Promise<TheaterResponseDto[]> {
    const theaters = await this.theatersRepository.find();
    return this.theaterMapper.toResponseDtoList(theaters);
  }

  async findOne(id: number): Promise<TheaterResponseDto> {
    const theater = await this.theatersRepository.findOne({ where: { id } });
    if (!theater) {
      throw new NotFoundException(`Theater with id ${id} not found`);
    }
    return this.theaterMapper.toResponseDto(theater);
  }

  async update(id: number, dto: TheaterDto): Promise<TheaterResponseDto> {
    const theater = await this.theatersRepository.findOne({ where: { id } });
    if (!theater) {
      throw new NotFoundException(`Theater with id ${id} not found`);
    }

    const merged = this.theaterMapper.mergeEntity(theater, dto);
    const saved = await this.theatersRepository.save(merged);
    return this.theaterMapper.toResponseDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    const theater = await this.theatersRepository.findOne({ where: { id } });
    if (!theater) {
      throw new NotFoundException(`Theater with id ${id} not found`);
    }

    await this.theatersRepository.remove(theater);
    return { message: `Theater #${id} deleted successfully` };
  }

  async getLargeTheatersReport(
    minCapacity: number,
  ): Promise<TheaterResponseDto[]> {
    const rows =
      await this.customTheatersRepository.findLargeTheatersReport(minCapacity);
    return this.theaterMapper.toResponseDtoList(rows);
  }
}
