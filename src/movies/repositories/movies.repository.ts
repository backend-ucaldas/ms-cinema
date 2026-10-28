import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Movie } from '../entities/movie.entity';

@Injectable()
export class MoviesRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findOldest(): Promise<Movie | null> {
    const [row] = await this.dataSource.query(
      `SELECT id, name, duration, date
       FROM movies
       ORDER BY date ASC, id ASC
       LIMIT 1`,
    );
    return (row as Movie | undefined) ?? null;
  }

  async findWithMostScreenings(): Promise<Movie | null> {
    const [row] = await this.dataSource.query(
      `SELECT m.id, m.name, m.duration, m.date
       FROM movies m
       LEFT JOIN screenings s ON s.movie_id = m.id
       GROUP BY m.id, m.name, m.duration, m.date
       ORDER BY COUNT(s.id) DESC, m.date ASC, m.id ASC
       LIMIT 1`,
    );
    return (row as Movie | undefined) ?? null;
  }
}
