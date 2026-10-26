import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Theater } from '../entities/theater.entity';

@Injectable()
export class TheatersRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findLargeTheatersReport(minCapacity: number): Promise<Theater[]> {
    const rows = await this.dataSource.query(
      `SELECT id, location, capacity
       FROM theaters
       WHERE capacity >= ?
       ORDER BY capacity DESC`,
      [minCapacity],
    );
    return rows as Theater[];
  }
}
