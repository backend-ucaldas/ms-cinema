import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { TheatersService } from './theaters.service';
import { TheaterDto } from './dto/theater.dto';

@Controller('theaters')
export class TheatersController {
  constructor(private readonly theatersService: TheatersService) {}

  @Post()
  create(@Body() dto: TheaterDto) {
    return this.theatersService.create(dto);
  }

  @Get()
  findAll() {
    return this.theatersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.theatersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: TheaterDto) {
    return this.theatersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.theatersService.remove(id);
  }

  @Get('reports/large/:minCapacity')
  largeReport(@Param('minCapacity', ParseIntPipe) minCapacity: number) {
    return this.theatersService.getLargeTheatersReport(minCapacity);
  }
}
