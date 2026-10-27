import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class SeatsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async countRecliningByTheater(theaterId: number): Promise<number> {
    const [row] = await this.dataSource.query<{ recliningSeats: number }[]>(
      `SELECT COUNT(*) AS recliningSeats
       FROM seats
       WHERE theater_id = ? AND reclining = true`,
      [theaterId],
    );
    return Number(row.recliningSeats);
  }
}
