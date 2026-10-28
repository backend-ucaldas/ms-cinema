import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { MoviesService } from './movies.service';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Post()
  create(@Body() dto: CreateMovieDto) { return this.moviesService.create(dto); }

  @Get('reports/oldest')
  getOldest() { return this.moviesService.getOldest(); }

  @Get('reports/most-screenings')
  getWithMostScreenings() { return this.moviesService.getWithMostScreenings(); }

  @Get()
  findAll() { return this.moviesService.findAll(); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.moviesService.findOne(id); }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMovieDto) {
    return this.moviesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.moviesService.remove(id); }
}
