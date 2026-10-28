import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMovieDto } from './dto/create-movie.dto';
import { MovieResponseDto } from './dto/movie-response.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entities/movie.entity';
import { MovieMapper } from './mappers/movie.mapper';
import { MoviesRepository } from './repositories/movies.repository';

@Injectable()
export class MoviesService {
  constructor(
    @InjectRepository(Movie)
    private readonly moviesRepository: Repository<Movie>,
    private readonly customMoviesRepository: MoviesRepository,
  ) {}

  async create(dto: CreateMovieDto): Promise<MovieResponseDto> {
    const saved = await this.moviesRepository.save(MovieMapper.toEntity(dto));
    return MovieMapper.toResponseDto(saved);
  }

  async findAll(): Promise<MovieResponseDto[]> {
    const movies = await this.moviesRepository.find({
      relations: { screenings: { theater: true, movie: true } },
    });
    return MovieMapper.toResponseDtoList(movies);
  }

  async findOne(id: number): Promise<MovieResponseDto> {
    return MovieMapper.toResponseDto(await this.findMovie(id));
  }

  async update(id: number, dto: UpdateMovieDto): Promise<MovieResponseDto> {
    const movie = await this.findMovie(id);
    const saved = await this.moviesRepository.save(MovieMapper.mergeEntity(movie, dto));
    return MovieMapper.toResponseDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    const movie = await this.findMovie(id);
    await this.moviesRepository.remove(movie);
    return { message: `Movie #${id} deleted successfully` };
  }

  async getOldest(): Promise<MovieResponseDto> {
    const movie = await this.customMoviesRepository.findOldest();
    if (!movie) throw new NotFoundException('No movies found');
    return MovieMapper.toResponseDto(movie);
  }

  async getWithMostScreenings(): Promise<MovieResponseDto> {
    const movie = await this.customMoviesRepository.findWithMostScreenings();
    if (!movie) throw new NotFoundException('No movies found');
    return MovieMapper.toResponseDto(movie);
  }

  private async findMovie(id: number): Promise<Movie> {
    const movie = await this.moviesRepository.findOne({
      where: { id },
      relations: { screenings: { theater: true, movie: true } },
    });
    if (!movie) throw new NotFoundException(`Movie with id ${id} not found`);
    return movie;
  }
}
