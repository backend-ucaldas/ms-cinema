import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Screening } from '../entities/screening.entity';

@Injectable()
export class ScreeningsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findNextThree(): Promise<Screening[]> {
    const rows = await this.dataSource.query(
      `SELECT id, scheduled_at, theater_id, movie_id
       FROM screenings
       WHERE scheduled_at >= NOW()
       ORDER BY scheduled_at ASC, id ASC
       LIMIT 3`,
    );
    return rows as Screening[];
  }
}
