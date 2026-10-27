# Relacion 1-N en NestJS (Theater <-> Seat)

Objetivo: implementar la relacion **uno a muchos** entre:

- `Theater`
- `Seat (id:int, location:string, reclining:bool)`

Un `Theater` puede tener muchas sillas y cada `Seat` pertenece a un unico theater. Las sillas se administran desde `SeatsModule`; no se crean ni actualizan embebidas en el payload de `Theater`.

## Crear el modulo `Seats`

Genera el recurso con Nest CLI:

```bash
nest g resource seats --no-spec
```

Selecciona **REST API** cuando la CLI lo solicite. Despues ajusta los archivos generados siguiendo esta guia.

## 1) Definir el dueño de la relacion

El dueño de la relacion es `Seat`, porque la llave foranea vive en la tabla `seats`:

- `seats.theater_id`

Por eso, `@JoinColumn()` se declara en `Seat` junto con `@ManyToOne()`.

---

## 2) Crear y ajustar entidades

### 2.1 Entidad `Seat` (lado dueño)

Archivo: `src/seats/entities/seat.entity.ts`

```ts
import { Theater } from '../../theaters/entities/theater.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('seats')
export class Seat {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 20 })
  location!: string;

  @Column({ type: 'boolean' })
  reclining!: boolean;

  @ManyToOne(() => Theater, (theater) => theater.seats, {
    cascade: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'theater_id' })
  theater!: Theater;
}
```

`cascade: false` evita creaciones o actualizaciones embebidas desde TypeORM. `nullable: false` exige que cada seat tenga un theater. `onDelete: 'CASCADE'` hace que MySQL elimine las seats asociadas cuando se elimina su theater.

### 2.2 Agregar la relacion inversa a `Theater`

Archivo: `src/theaters/entities/theater.entity.ts`

Conserva la relacion actual con `Projector` y agrega `seats`:

```ts
import { Projector } from '../../projectors/entities/projector.entity';
import { Seat } from '../../seats/entities/seat.entity';
import { Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('theaters')
export class Theater {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  location!: string;

  @Column({ type: 'int' })
  capacity!: number;

  @OneToOne(() => Projector, (projector) => projector.theater)
  projector?: Projector;

  @OneToMany(() => Seat, (seat) => seat.theater, { cascade: false })
  seats?: Seat[];
}
```

---

## 3) Generar la migracion

La migracion inicial de theaters y projectors ya esta aplicada. Despues de agregar la entidad `Seat`, genera una nueva migracion:

```bash
npx typeorm-ts-node-commonjs migration:generate ./src/migrations/AddSeatsRelation -d ./typeorm.config.ts
```

La migracion debe crear la tabla `seats` con:

- columnas `id`, `location`, `reclining` y `theater_id`;
- una llave foranea desde `seats.theater_id` hacia `theaters.id`;
- `ON DELETE CASCADE` en la llave foranea;
- sin indice `UNIQUE` sobre `theater_id`, porque un theater puede tener muchas seats.

---

## 4) Ejecutar migraciones

```bash
npx typeorm-ts-node-commonjs migration:run -d ./typeorm.config.ts
```

> En este proyecto se genero y ejecuto `src/migrations/1793137658606-AddSeatsRelation.ts`.

---

## 5) DTOs

### 5.1 DTO de creacion de `Seat`

Archivo: `src/seats/dto/create-seat.dto.ts`

```ts
import { IsBoolean, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateSeatDto {
  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsBoolean()
  reclining!: boolean;

  @IsInt()
  @Min(1)
  theaterId!: number;
}
```

Los decoradores del DTO validan que los tres campos sean obligatorios en `POST`, incluido `reclining`; el valor `false` es valido.

### 5.2 DTO de actualizacion de `Seat`

Archivo: `src/seats/dto/update-seat.dto.ts`

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateSeatDto } from './create-seat.dto';

export class UpdateSeatDto extends PartialType(CreateSeatDto) {}
```

En `PATCH`, todos los campos son opcionales. Si llega `theaterId`, la silla se reasigna a ese theater.

### 5.3 DTO de respuesta de `Seat`

Archivo: `src/seats/dto/seat-response.dto.ts`

```ts
export class SeatResponseDto {
  id!: number;
  location!: string;
  reclining!: boolean;
  theaterId!: number;
}
```

### 5.4 DTO de reporte

Archivo: `src/seats/dto/reclining-seats-report.dto.ts`

```ts
export class RecliningSeatsReportDto {
  theaterId!: number;
  recliningSeats!: number;
}
```

### 5.5 Incluir seats en la respuesta de `Theater`

Archivo: `src/theaters/dto/theater-response.dto.ts`

```ts
import { ProjectorResponseDto } from '../../projectors/dto/projector-response.dto';
import { SeatResponseDto } from '../../seats/dto/seat-response.dto';

export class TheaterResponseDto {
  id!: number;
  location!: string;
  capacity!: number;
  projector?: ProjectorResponseDto;
  seats?: SeatResponseDto[];
}
```

---

## 6) Crear mappers

### 6.1 Mapper de `Seat`

Archivo: `src/seats/mappers/seat.mapper.ts`

```ts
import { CreateSeatDto } from '../dto/create-seat.dto';
import { SeatResponseDto } from '../dto/seat-response.dto';
import { UpdateSeatDto } from '../dto/update-seat.dto';
import { Seat } from '../entities/seat.entity';

export class SeatMapper {
  static toEntity(dto: CreateSeatDto, theater: Seat['theater']): Seat {
    return {
      location: dto.location,
      reclining: dto.reclining,
      theater,
    } as Seat;
  }

  static mergeEntity(entity: Seat, dto: UpdateSeatDto): Seat {
    if (dto.location !== undefined) entity.location = dto.location;
    if (dto.reclining !== undefined) entity.reclining = dto.reclining;
    return entity;
  }

  static toResponseDto(entity: Seat, theaterId = entity.theater?.id): SeatResponseDto {
    return {
      id: entity.id,
      location: entity.location,
      reclining: entity.reclining,
      theaterId: theaterId!,
    };
  }

  static toResponseDtoList(entities: Seat[], theaterId?: number): SeatResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity, theaterId));
  }
}
```

### 6.2 Ajustar `TheaterMapper`

Archivo: `src/theaters/mappers/theater.mapper.ts`

Importa `SeatMapper` y agrega la propiedad `seats` en `toResponseDto`:

```ts
import { SeatMapper } from '../../seats/mappers/seat.mapper';

// Dentro de toResponseDto:
seats: entity.seats
  ? SeatMapper.toResponseDtoList(entity.seats, entity.id)
  : undefined,
```

Tambien carga la relacion `seats` en `TheatersService.findAll` y `TheatersService.findOne`:

```ts
relations: { projector: true, seats: true },
```

---

## 7) Repositorio personalizado para el reporte

Este repositorio consulta directamente la base de datos para obtener la cantidad de seats reclinables de un theater. Sigue el patron de `TheatersRepository` con `DataSource`.

Archivo: `src/seats/repositories/seats.repository.ts`

```ts
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class SeatsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async countRecliningByTheater(theaterId: number): Promise<number> {
    const [row] = await this.dataSource.query(
      `SELECT COUNT(*) AS recliningSeats
       FROM seats
       WHERE theater_id = ? AND reclining = true`,
      [theaterId],
    );
    return Number(row.recliningSeats);
  }
}
```

---

## 8) Crear modulo `Seats`

Archivo: `src/seats/seats.module.ts`

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Theater } from '../theaters/entities/theater.entity';
import { Seat } from './entities/seat.entity';
import { SeatsController } from './seats.controller';
import { SeatsRepository } from './repositories/seats.repository';
import { SeatsService } from './seats.service';

@Module({
  imports: [TypeOrmModule.forFeature([Seat, Theater])],
  controllers: [SeatsController],
  providers: [SeatsService, SeatsRepository],
})
export class SeatsModule {}
```

Registra `SeatsModule` en `AppModule` junto con `TheatersModule` y `ProjectorsModule`.

---

## 9) Servicio de `Seat`

Archivo: `src/seats/seats.service.ts`

El servicio debe implementar estas reglas:

1. En `create`, recibir `CreateSeatDto`; sus decoradores validan `location`, `reclining` y `theaterId` antes de entrar al servicio.
2. Antes de crear o reasignar, buscar el theater y lanzar `NotFoundException` si no existe.
3. Cargar `relations: { theater: true }` para mapear `theaterId` en las respuestas.
4. Usar `SeatsRepository.countRecliningByTheater` para el reporte, despues de comprobar que el theater existe.
5. La FK elimina las seats en cascada cuando se elimina su theater.

Implementacion completa:

```ts
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
```

---

## 10) Rutas de `SeatsController`

Declara la ruta de reporte antes de `@Get(':id')`, para que Nest no interprete `reports` como un id.

```ts
@Controller('seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Post()
  create(@Body() dto: CreateSeatDto) {
    return this.seatsService.create(dto);
  }

  @Get('reports/theater/:theaterId/reclining-count')
  getRecliningCount(@Param('theaterId', ParseIntPipe) theaterId: number) {
    return this.seatsService.getRecliningCount(theaterId);
  }

  @Get()
  findAll() {
    return this.seatsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.seatsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSeatDto) {
    return this.seatsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.seatsService.remove(id);
  }
}
```

Rutas resultantes:

- `POST /seats` crea una seat asociada a un theater.
- `GET /seats` lista seats con `theaterId`.
- `GET /seats/:id` consulta una seat.
- `PATCH /seats/:id` actualiza datos y opcionalmente reasigna con `theaterId`.
- `DELETE /seats/:id` elimina una seat.
- `GET /seats/reports/theater/:theaterId/reclining-count` devuelve el total de seats reclinables.

---

## 11) Pruebas en Postman o Insomnia

### 11.1 Crear theater

`POST /theaters`

```json
{
  "location": "Sala Central",
  "capacity": 120
}
```

### 11.2 Crear seat asociada

`POST /seats`

```json
{
  "location": "A1",
  "reclining": true,
  "theaterId": 1
}
```

### 11.3 Actualizar una seat

`PATCH /seats/1`

```json
{
  "reclining": false,
  "theaterId": 2
}
```

### 11.4 Consultar el reporte

`GET /seats/reports/theater/1/reclining-count`

Respuesta esperada:

```json
{
  "theaterId": 1,
  "recliningSeats": 1
}
```

### 11.5 Verificar eliminacion en cascada

Ejecuta `DELETE /theaters/1` mientras existan seats asociadas. MySQL debe eliminar automaticamente las seats de ese theater mediante la FK con `ON DELETE CASCADE`.

---

## 12) Resumen

1. `Seat` es el dueño con `@ManyToOne` y `@JoinColumn`.
2. `Theater` expone las seats con `@OneToMany`.
3. La FK `seats.theater_id` no es unica y usa `ON DELETE CASCADE`.
4. `CreateSeatDto` y `UpdateSeatDto` validan las entradas de creacion y actualizacion; `SeatResponseDto` es el de salida.
5. `SeatsRepository` implementa el conteo de sillas reclinables.
6. El reporte se publica en `GET /seats/reports/theater/:theaterId/reclining-count`.
7. No hay creacion, actualizacion ni eliminacion embebida desde `Theater`.
