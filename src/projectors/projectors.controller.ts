import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateProjectorDto } from './dto/create-projector.dto';
import { UpdateProjectorDto } from './dto/update-projector.dto';
import { ProjectorsService } from './projectors.service';

@Controller('projectors')
export class ProjectorsController {
  constructor(private readonly projectorsService: ProjectorsService) {}

  @Post()
  create(@Body() dto: CreateProjectorDto) {
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
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectorDto) {
    return this.projectorsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectorsService.remove(id);
  }
}
