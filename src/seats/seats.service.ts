import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theater } from '../theaters/entities/theater.entity';
import { CreateSeatDto } from './dto/create-seat.dto';
import { RecliningSeatsReportDto } from './dto/reclining-seats-report.dto';
import { SeatResponseDto } from './dto/seat-response.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';
import { Seat } from './entities/seat.entity';
import { SeatMapper } from './mappers/seat.mapper';
import { SeatsRepository } from './repositories/seats.repository';

@Injectable()
export class SeatsService {
  constructor(
    @InjectRepository(Seat)
    private readonly seatsRepository: Repository<Seat>,
    @InjectRepository(Theater)
    private readonly theatersRepository: Repository<Theater>,
    private readonly customSeatsRepository: SeatsRepository,
  ) {}

  async create(dto: CreateSeatDto): Promise<SeatResponseDto> {
    const theater = await this.findTheater(dto.theaterId);
    const saved = await this.seatsRepository.save(SeatMapper.toEntity(dto, theater));
    return this.findOne(saved.id);
  }

  async findAll(): Promise<SeatResponseDto[]> {
    const seats = await this.seatsRepository.find({ relations: { theater: true } });
    return SeatMapper.toResponseDtoList(seats);
  }

  async findOne(id: number): Promise<SeatResponseDto> {
    return SeatMapper.toResponseDto(await this.findSeat(id));
  }

  async update(id: number, dto: UpdateSeatDto): Promise<SeatResponseDto> {
    const seat = await this.findSeat(id);
    if (dto.theaterId !== undefined) {
      seat.theater = await this.findTheater(dto.theaterId);
    }

    const saved = await this.seatsRepository.save(SeatMapper.mergeEntity(seat, dto));
    return SeatMapper.toResponseDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    const seat = await this.findSeat(id);
    await this.seatsRepository.remove(seat);
    return { message: `Seat #${id} deleted successfully` };
  }

  async getRecliningCount(theaterId: number): Promise<RecliningSeatsReportDto> {
    await this.findTheater(theaterId);
    return {
      theaterId,
      recliningSeats: await this.customSeatsRepository.countRecliningByTheater(
        theaterId,
      ),
    };
  }

  private async findSeat(id: number): Promise<Seat> {
    const seat = await this.seatsRepository.findOne({
      where: { id },
      relations: { theater: true },
    });
    if (!seat) throw new NotFoundException(`Seat with id ${id} not found`);
    return seat;
  }

  private async findTheater(id: number): Promise<Theater> {
    const theater = await this.theatersRepository.findOneBy({ id });
    if (!theater) throw new NotFoundException(`Theater with id ${id} not found`);
    return theater;
  }
}
