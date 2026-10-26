# 1 — Primer CRUD (Theater) en NestJS

En este tutorial implementaremos el primer CRUD del proyecto de cine usando la entidad **Theater**.

> Enfoque: seguir filosofía NestJS, manteniendo todo dentro del dominio `theaters` (controller, service, dto, mapper, entity, repository).
>
> En esta versión usamos **un solo DTO de entrada** para crear y actualizar: `TheaterDto`.

---

## 1) Objetivo

Construir estos endpoints:

- `POST /theaters`
- `GET /theaters`
- `GET /theaters/:id`
- `PATCH /theaters/:id`
- `DELETE /theaters/:id`

Con:

- `Entity`
- `DTOs`
- `Mapper`
- `Service`
- `Controller`
- `Repository` por defecto de Nest/TypeORM para CRUD
- `Repository` independiente para reportes SQL personalizados

---

## 2) Estructura que vamos a usar

```text
src/
└── theaters/
    ├── dto/
    │   ├── theater.dto.ts
    │   └── theater-response.dto.ts
    ├── entities/
    │   └── theater.entity.ts
    ├── mappers/
    │   └── theater.mapper.ts
    ├── repositories/
    │   └── theaters.repository.ts
    ├── theaters.controller.ts
    ├── theaters.service.ts
    └── theaters.module.ts
```

---

## 3) Crear el recurso base

```bash
nest g resource theaters
```

Selecciona REST API cuando el CLI lo pida.

---

## 4) Entity: `Theater`

Archivo: `src/theaters/entities/theater.entity.ts`

```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('theaters')
export class Theater {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  location!: string;

  @Column({ type: 'int' })
  capacity!: number;
}
```

---

## 5) DTOs

### 5.1 DTO único para crear y actualizar

Archivo: `src/theaters/dto/theater.dto.ts`

```typescript
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TheaterDto {
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity?: number;
}
```

### 5.2 DTO de respuesta

Archivo: `src/theaters/dto/theater-response.dto.ts`

```typescript
export class TheaterResponseDto {
  id!: number;
  location!: string;
  capacity!: number;
}
```

---

## 6) Mapper

Archivo: `src/theaters/mappers/theater.mapper.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { TheaterDto } from '../dto/theater.dto';
import { TheaterResponseDto } from '../dto/theater-response.dto';
import { Theater } from '../entities/theater.entity';

@Injectable()
export class TheaterMapper {
  toEntity(dto: TheaterDto): Theater {
    return {
      location: dto.location,
      capacity: dto.capacity,
    } as Theater;
  }

  mergeEntity(entity: Theater, dto: TheaterDto): Theater {
    if (dto.location !== undefined) entity.location = dto.location;
    if (dto.capacity !== undefined) entity.capacity = dto.capacity;
    return entity;
  }

  toResponseDto(entity: Theater): TheaterResponseDto {
    return {
      id: entity.id,
      location: entity.location,
      capacity: entity.capacity,
    };
  }

  toResponseDtoList(entities: Theater[]): TheaterResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
```

---

## 7) Service (CRUD con repositorio por defecto + reportes personalizados)

Archivo: `src/theaters/theaters.service.ts`

```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TheaterDto } from './dto/theater.dto';
import { TheaterResponseDto } from './dto/theater-response.dto';
import { TheaterMapper } from './mappers/theater.mapper';
import { TheatersRepository } from './repositories/theaters.repository';
import { Theater } from './entities/theater.entity';

@Injectable()
export class TheatersService {
  constructor(
    @InjectRepository(Theater)
    private readonly theatersRepository: Repository<Theater>,
    private readonly customTheatersRepository: TheatersRepository,
    private readonly theaterMapper: TheaterMapper,
  ) {}

  async create(dto: TheaterDto): Promise<TheaterResponseDto> {
    if (dto.location === undefined || dto.capacity === undefined) {
      throw new BadRequestException('location and capacity are required for create');
    }

    const entity = this.theaterMapper.toEntity(dto);
    const saved = await this.theatersRepository.save(entity);
    return this.theaterMapper.toResponseDto(saved);
  }

  async findAll(): Promise<TheaterResponseDto[]> {
    const theaters = await this.theatersRepository.find();
    return this.theaterMapper.toResponseDtoList(theaters);
  }

  async findOne(id: number): Promise<TheaterResponseDto> {
    const theater = await this.theatersRepository.findOne({ where: { id } });
    if (!theater) {
      throw new NotFoundException(`Theater with id ${id} not found`);
    }
    return this.theaterMapper.toResponseDto(theater);
  }

  async update(id: number, dto: TheaterDto): Promise<TheaterResponseDto> {
    const theater = await this.theatersRepository.findOne({ where: { id } });
    if (!theater) {
      throw new NotFoundException(`Theater with id ${id} not found`);
    }

    const merged = this.theaterMapper.mergeEntity(theater, dto);
    const saved = await this.theatersRepository.save(merged);
    return this.theaterMapper.toResponseDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    const theater = await this.theatersRepository.findOne({ where: { id } });
    if (!theater) {
      throw new NotFoundException(`Theater with id ${id} not found`);
    }

    await this.theatersRepository.remove(theater);
    return { message: `Theater #${id} deleted successfully` };
  }

  async getLargeTheatersReport(minCapacity: number): Promise<TheaterResponseDto[]> {
    const rows = await this.customTheatersRepository.findLargeTheatersReport(minCapacity);
    return this.theaterMapper.toResponseDtoList(rows);
  }
}
```

## 8) Repository independiente (solo para reportes SQL puros)

Archivo: `src/theaters/repositories/theaters.repository.ts`

```typescript
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
```

Aquí concentras únicamente reportes SQL puros (`dataSource.query`).  
El CRUD normal se mantiene con `Repository<Theater>` de Nest/TypeORM.

---

## 9) Controller

Archivo: `src/theaters/theaters.controller.ts`

```typescript
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
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
```

---

## 10) Module de `theaters` (todo dentro del mismo dominio)

Archivo: `src/theaters/theaters.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TheatersController } from './theaters.controller';
import { TheatersService } from './theaters.service';
import { Theater } from './entities/theater.entity';
import { TheaterMapper } from './mappers/theater.mapper';
import { TheatersRepository } from './repositories/theaters.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Theater])],
  controllers: [TheatersController],
  providers: [TheatersService, TheaterMapper, TheatersRepository],
  exports: [TheatersService],
})
export class TheatersModule {}
```

---

## 11) Registrar en `AppModule`

Archivo: `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TheatersModule } from './theaters/theaters.module';

@Module({
  imports: [TheatersModule],
})
export class AppModule {}
```

---

## 12) Activar validación global

Archivo: `src/main.ts`

```typescript
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

---

## 13) Probar CRUD rápido (Postman)

### Crear teatro

`POST /theaters`

```json
{
  "location": "Sala IMAX - Centro Mayor",
  "capacity": 150
}
```

### Listar

`GET /theaters`

### Obtener por id

`GET /theaters/1`

### Actualizar

`PATCH /theaters/1`

```json
{
  "capacity": 180
}
```

### Eliminar

`DELETE /theaters/1`

---

## 14) Resultado

Con esto ya tienes el **Primer CRUD** completo en NestJS con:

- Controller
- Service
- Repository por defecto para CRUD
- Repository independiente para reportes SQL puros
- Mapper
- DTOs
- Entity

Listo para pasar al siguiente tutorial y agregar relaciones (`Projector`, `Seat`, `Screening`).
