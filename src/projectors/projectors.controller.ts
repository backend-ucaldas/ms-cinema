import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ProjectorDto } from './dto/projector.dto';
import { ProjectorsService } from './projectors.service';

@Controller('projectors')
export class ProjectorsController {
  constructor(private readonly projectorsService: ProjectorsService) {}

  @Post()
  create(@Body() dto: ProjectorDto) {
    return this.projectorsService.create(dto);
  }

  @Get()
  findAll() {
    return this.projectorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectorsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: ProjectorDto) {
    return this.projectorsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectorsService.remove(id);
  }
}
