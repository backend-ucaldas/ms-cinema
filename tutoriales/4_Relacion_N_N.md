# Relacion N-N en NestJS (Theater <-> Movie mediante Screening)

## Objetivo

Implementar la relacion **muchos a muchos** entre `Theater` y `Movie` usando una entidad intermedia con datos propios:

- `Movie (id, name, duration, date)`
- `Screening (id, scheduledAt, theater, movie)`

Una pelicula puede tener funciones en muchos theaters y un theater puede proyectar muchas peliculas. Como la relacion tiene el dato `scheduledAt`, **no se usa `@ManyToMany()` ni `@JoinTable()`**: se modela con la entidad `Screening` y dos relaciones `@ManyToOne()`.

Las funciones se administran desde `ScreeningsModule`; no se crean ni actualizan embebidas dentro de los payloads de `Theater` o `Movie`.

Tambien se incluyen estas consultas SQL personalizadas:

- pelicula mas antigua;
- pelicula con mas funciones;
- las tres funciones futuras mas cercanas a la fecha actual.

---

## 1) Estructura final

Cada entidad nueva tiene su propio modulo y las capas usadas en las guias anteriores.

```text
src/
├── movies/
│   ├── dto/
│   │   ├── create-movie.dto.ts
│   │   ├── update-movie.dto.ts
│   │   └── movie-response.dto.ts
│   ├── entities/movie.entity.ts
│   ├── mappers/movie.mapper.ts
│   ├── repositories/movies.repository.ts
│   ├── movies.controller.ts
│   ├── movies.service.ts
│   └── movies.module.ts
├── screenings/
│   ├── dto/
│   │   ├── create-screening.dto.ts
│   │   ├── update-screening.dto.ts
│   │   └── screening-response.dto.ts
│   ├── entities/screening.entity.ts
│   ├── mappers/screening.mapper.ts
│   ├── repositories/screenings.repository.ts
│   ├── screenings.controller.ts
│   ├── screenings.service.ts
│   └── screenings.module.ts
└── theaters/                         # se ajusta para exponer screenings
```

Genera los recursos iniciales:

```bash
nest g resource movies --no-spec
nest g resource screenings --no-spec
```

Selecciona **REST API** en ambos casos y despues ajusta los archivos como se indica a continuacion.

---

## 2) Entidades y propietario de la relacion

`Screening` es la entidad intermedia y el lado propietario de ambas relaciones porque contiene las llaves foraneas:

- `screenings.theater_id`
- `screenings.movie_id`

### 2.1 Entidad `Movie`

Archivo: `src/movies/entities/movie.entity.ts`

```ts
import { Screening } from '../../screenings/entities/screening.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 180 })
  name!: string;

  // Duracion en minutos.
  @Column({ type: 'int' })
  duration!: number;

  // Fecha de estreno; se usa para identificar la pelicula mas antigua.
  @Column({ type: 'date' })
  date!: string;

  @OneToMany(() => Screening, (screening) => screening.movie, {
    cascade: false,
  })
  screenings?: Screening[];
}
```

### 2.2 Entidad `Screening`

Archivo: `src/screenings/entities/screening.entity.ts`

```ts
import { Movie } from '../../movies/entities/movie.entity';
import { Theater } from '../../theaters/entities/theater.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('screenings')
export class Screening {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'scheduled_at', type: 'datetime' })
  scheduledAt!: Date;

  @ManyToOne(() => Theater, (theater) => theater.screenings, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'theater_id' })
  theater!: Theater;

  @ManyToOne(() => Movie, (movie) => movie.screenings, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'movie_id' })
  movie!: Movie;
}
```

`NO ACTION` evita borrar por accidente un theater o una movie que todavia tenga funciones. Primero se deben eliminar o reasignar sus screenings.

### 2.3 Ajustar `Theater`

Archivo: `src/theaters/entities/theater.entity.ts`

Conserva `projector` y `seats`; agrega la coleccion inversa:

```ts
import { Projector } from '../../projectors/entities/projector.entity';
import { Screening } from '../../screenings/entities/screening.entity';
import { Seat } from '../../seats/entities/seat.entity';
import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

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

  @OneToMany(() => Screening, (screening) => screening.theater, {
    cascade: false,
  })
  screenings?: Screening[];
}
```

---

## 3) Migracion

Genera la migracion despues de crear las entidades y modificar `Theater`:

```bash
npx typeorm-ts-node-commonjs migration:generate ./src/migrations/AddMoviesAndScreenings -d ./typeorm.config.ts
npx typeorm-ts-node-commonjs migration:run -d ./typeorm.config.ts
```

Revisa que la migracion cree:

- tabla `movies` con `id`, `name`, `duration` y `date`;
- tabla `screenings` con `id`, `scheduled_at`, `theater_id` y `movie_id`;
- dos llaves foraneas no nulas hacia `theaters(id)` y `movies(id)`;
- `ON DELETE NO ACTION` en ambas llaves;
- sin restricciones `UNIQUE` en `theater_id` ni `movie_id`, pues ambos valores se pueden repetir.

> No ejecutes `migration:generate` si no revisaste que las migraciones anteriores ya estan aplicadas y que `typeorm.config.ts` carga las tres entidades existentes y las nuevas.

---

## 4) DTOs

### 4.1 DTOs de `Movie`

Archivo: `src/movies/dto/create-movie.dto.ts`

```ts
import { IsDateString, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateMovieDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  duration!: number;

  @IsDateString()
  date!: string;
}
```

Archivo: `src/movies/dto/update-movie.dto.ts`

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateMovieDto } from './create-movie.dto';

export class UpdateMovieDto extends PartialType(CreateMovieDto) {}
```

Archivo: `src/movies/dto/movie-response.dto.ts`

```ts
import { ScreeningResponseDto } from '../../screenings/dto/screening-response.dto';

export class MovieResponseDto {
  id!: number;
  name!: string;
  duration!: number;
  date!: string;
  screenings?: ScreeningResponseDto[];
}
```

### 4.2 DTOs de `Screening`

Archivo: `src/screenings/dto/create-screening.dto.ts`

```ts
import { IsDateString, IsInt, Min } from 'class-validator';

export class CreateScreeningDto {
  @IsDateString()
  scheduledAt!: string;

  @IsInt()
  @Min(1)
  theaterId!: number;

  @IsInt()
  @Min(1)
  movieId!: number;
}
```

El formato recomendado para `scheduledAt` es ISO 8601 con zona horaria, por ejemplo `2026-11-15T19:30:00-05:00`.

Archivo: `src/screenings/dto/update-screening.dto.ts`

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateScreeningDto } from './create-screening.dto';

export class UpdateScreeningDto extends PartialType(CreateScreeningDto) {}
```

Archivo: `src/screenings/dto/screening-response.dto.ts`

```ts
export class ScreeningResponseDto {
  id!: number;
  scheduledAt!: Date;
  theaterId!: number;
  movieId!: number;
}
```

El DTO de respuesta de `Screening` devuelve solo los IDs. Asi, al incluir funciones en las respuestas de `Movie` o `Theater`, se evita un ciclo de objetos anidados.

---

## 5) Mappers

### 5.1 `MovieMapper`

Archivo: `src/movies/mappers/movie.mapper.ts`

```ts
import { ScreeningMapper } from '../../screenings/mappers/screening.mapper';
import { CreateMovieDto } from '../dto/create-movie.dto';
import { MovieResponseDto } from '../dto/movie-response.dto';
import { UpdateMovieDto } from '../dto/update-movie.dto';
import { Movie } from '../entities/movie.entity';

export class MovieMapper {
  static toEntity(dto: CreateMovieDto): Movie {
    return { name: dto.name, duration: dto.duration, date: dto.date } as Movie;
  }

  static mergeEntity(entity: Movie, dto: UpdateMovieDto): Movie {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.duration !== undefined) entity.duration = dto.duration;
    if (dto.date !== undefined) entity.date = dto.date;
    return entity;
  }

  static toResponseDto(entity: Movie): MovieResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      duration: entity.duration,
      date: entity.date,
      screenings: entity.screenings
        ? ScreeningMapper.toResponseDtoList(entity.screenings)
        : undefined,
    };
  }

  static toResponseDtoList(entities: Movie[]): MovieResponseDto[] {
    return entities.map(this.toResponseDto);
  }
}
```

### 5.2 `ScreeningMapper`

Archivo: `src/screenings/mappers/screening.mapper.ts`

```ts
import { CreateScreeningDto } from '../dto/create-screening.dto';
import { ScreeningResponseDto } from '../dto/screening-response.dto';
import { UpdateScreeningDto } from '../dto/update-screening.dto';
import { Screening } from '../entities/screening.entity';

export class ScreeningMapper {
  static toEntity(
    dto: CreateScreeningDto,
    theater: Screening['theater'],
    movie: Screening['movie'],
  ): Screening {
    return {
      scheduledAt: new Date(dto.scheduledAt),
      theater,
      movie,
    } as Screening;
  }

  static mergeEntity(entity: Screening, dto: UpdateScreeningDto): Screening {
    if (dto.scheduledAt !== undefined) entity.scheduledAt = new Date(dto.scheduledAt);
    return entity;
  }

  static toResponseDto(entity: Screening): ScreeningResponseDto {
    return {
      id: entity.id,
      scheduledAt: entity.scheduledAt,
      theaterId: entity.theater.id,
      movieId: entity.movie.id,
    };
  }

  static toResponseDtoList(entities: Screening[]): ScreeningResponseDto[] {
    return entities.map(this.toResponseDto);
  }
}
```

### 5.3 Ajustar el DTO y mapper de `Theater`

Archivo: `src/theaters/dto/theater-response.dto.ts`

```ts
import { ProjectorResponseDto } from '../../projectors/dto/projector-response.dto';
import { ScreeningResponseDto } from '../../screenings/dto/screening-response.dto';
import { SeatResponseDto } from '../../seats/dto/seat-response.dto';

export class TheaterResponseDto {
  id!: number;
  location!: string;
  capacity!: number;
  projector?: ProjectorResponseDto;
  seats?: SeatResponseDto[];
  screenings?: ScreeningResponseDto[];
}
```

En `src/theaters/mappers/theater.mapper.ts`, importa `ScreeningMapper` y agrega dentro de `toResponseDto`:

```ts
screenings: entity.screenings
  ? ScreeningMapper.toResponseDtoList(entity.screenings)
  : undefined,
```

Tambien carga `screenings` en los `find` de `TheatersService`:

```ts
relations: {
  projector: true,
  seats: true,
  screenings: { theater: true, movie: true },
},
```

---

## 6) Repositorios de consultas personalizadas

El CRUD sigue usando `Repository<T>` de TypeORM. Los reportes SQL puros viven en repositorios independientes, igual que en las guias previas.

### 6.1 Repositorio de peliculas

Archivo: `src/movies/repositories/movies.repository.ts`

```ts
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
```

El `LEFT JOIN` hace que una pelicula sin funciones tambien pueda ser el resultado si aun no existe ninguna funcion. Los criterios secundarios resuelven empates de manera estable.

### 6.2 Repositorio de funciones

Archivo: `src/screenings/repositories/screenings.repository.ts`

```ts
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
```

`NOW()` se evalua en MySQL. Asegura que la zona horaria de la base de datos sea la esperada por la aplicacion; guarda las fechas en UTC si el proyecto maneja varias zonas horarias.

---

## 7) Modulos

### 7.1 `MoviesModule`

Archivo: `src/movies/movies.module.ts`

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from './entities/movie.entity';
import { MoviesController } from './movies.controller';
import { MoviesRepository } from './repositories/movies.repository';
import { MoviesService } from './movies.service';

@Module({
  imports: [TypeOrmModule.forFeature([Movie])],
  controllers: [MoviesController],
  providers: [MoviesService, MoviesRepository],
})
export class MoviesModule {}
```

### 7.2 `ScreeningsModule`

Archivo: `src/screenings/screenings.module.ts`

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from '../movies/entities/movie.entity';
import { Theater } from '../theaters/entities/theater.entity';
import { Screening } from './entities/screening.entity';
import { ScreeningsController } from './screenings.controller';
import { ScreeningsRepository } from './repositories/screenings.repository';
import { ScreeningsService } from './screenings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Screening, Theater, Movie])],
  controllers: [ScreeningsController],
  providers: [ScreeningsService, ScreeningsRepository],
})
export class ScreeningsModule {}
```

Registra `MoviesModule` y `ScreeningsModule` en `AppModule`, junto con los modulos ya existentes.

```ts
import { MoviesModule } from './movies/movies.module';
import { ScreeningsModule } from './screenings/screenings.module';

@Module({
  imports: [
    // ConfigModule y TypeOrmModule.forRootAsync existentes...
    TheatersModule,
    ProjectorsModule,
    SeatsModule,
    MoviesModule,
    ScreeningsModule,
  ],
})
export class AppModule {}
```

---

## 8) Servicios

### 8.1 `MoviesService`

Archivo: `src/movies/movies.service.ts`

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMovieDto } from './dto/create-movie.dto';
import { MovieResponseDto } from './dto/movie-response.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entities/movie.entity';
import { MovieMapper } from './mappers/movie.mapper';
import { MoviesRepository } from './repositories/movies.repository';

@Injectable()
export class MoviesService {
  constructor(
    @InjectRepository(Movie)
    private readonly moviesRepository: Repository<Movie>,
    private readonly customMoviesRepository: MoviesRepository,
  ) {}

  async create(dto: CreateMovieDto): Promise<MovieResponseDto> {
    const saved = await this.moviesRepository.save(MovieMapper.toEntity(dto));
    return MovieMapper.toResponseDto(saved);
  }

  async findAll(): Promise<MovieResponseDto[]> {
    const movies = await this.moviesRepository.find({
      relations: { screenings: { theater: true, movie: true } },
    });
    return MovieMapper.toResponseDtoList(movies);
  }

  async findOne(id: number): Promise<MovieResponseDto> {
    return MovieMapper.toResponseDto(await this.findMovie(id));
  }

  async update(id: number, dto: UpdateMovieDto): Promise<MovieResponseDto> {
    const movie = await this.findMovie(id);
    const saved = await this.moviesRepository.save(MovieMapper.mergeEntity(movie, dto));
    return MovieMapper.toResponseDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    const movie = await this.findMovie(id);
    await this.moviesRepository.remove(movie);
    return { message: `Movie #${id} deleted successfully` };
  }

  async getOldest(): Promise<MovieResponseDto> {
    const movie = await this.customMoviesRepository.findOldest();
    if (!movie) throw new NotFoundException('No movies found');
    return MovieMapper.toResponseDto(movie);
  }

  async getWithMostScreenings(): Promise<MovieResponseDto> {
    const movie = await this.customMoviesRepository.findWithMostScreenings();
    if (!movie) throw new NotFoundException('No movies found');
    return MovieMapper.toResponseDto(movie);
  }

  private async findMovie(id: number): Promise<Movie> {
    const movie = await this.moviesRepository.findOne({
      where: { id },
      relations: { screenings: { theater: true, movie: true } },
    });
    if (!movie) throw new NotFoundException(`Movie with id ${id} not found`);
    return movie;
  }
}
```

### 8.2 `ScreeningsService`

Archivo: `src/screenings/screenings.service.ts`

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie } from '../movies/entities/movie.entity';
import { Theater } from '../theaters/entities/theater.entity';
import { CreateScreeningDto } from './dto/create-screening.dto';
import { ScreeningResponseDto } from './dto/screening-response.dto';
import { UpdateScreeningDto } from './dto/update-screening.dto';
import { Screening } from './entities/screening.entity';
import { ScreeningMapper } from './mappers/screening.mapper';
import { ScreeningsRepository } from './repositories/screenings.repository';

@Injectable()
export class ScreeningsService {
  constructor(
    @InjectRepository(Screening)
    private readonly screeningsRepository: Repository<Screening>,
    @InjectRepository(Theater)
    private readonly theatersRepository: Repository<Theater>,
    @InjectRepository(Movie)
    private readonly moviesRepository: Repository<Movie>,
    private readonly customScreeningsRepository: ScreeningsRepository,
  ) {}

  async create(dto: CreateScreeningDto): Promise<ScreeningResponseDto> {
    const theater = await this.findTheater(dto.theaterId);
    const movie = await this.findMovie(dto.movieId);
    const saved = await this.screeningsRepository.save(
      ScreeningMapper.toEntity(dto, theater, movie),
    );
    return this.findOne(saved.id);
  }

  async findAll(): Promise<ScreeningResponseDto[]> {
    const screenings = await this.screeningsRepository.find({
      relations: { theater: true, movie: true },
    });
    return ScreeningMapper.toResponseDtoList(screenings);
  }

  async findOne(id: number): Promise<ScreeningResponseDto> {
    return ScreeningMapper.toResponseDto(await this.findScreening(id));
  }

  async update(id: number, dto: UpdateScreeningDto): Promise<ScreeningResponseDto> {
    const screening = await this.findScreening(id);
    if (dto.theaterId !== undefined) screening.theater = await this.findTheater(dto.theaterId);
    if (dto.movieId !== undefined) screening.movie = await this.findMovie(dto.movieId);

    const saved = await this.screeningsRepository.save(
      ScreeningMapper.mergeEntity(screening, dto),
    );
    return this.findOne(saved.id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const screening = await this.findScreening(id);
    await this.screeningsRepository.remove(screening);
    return { message: `Screening #${id} deleted successfully` };
  }

  async getNextThree(): Promise<ScreeningResponseDto[]> {
    const rows = await this.customScreeningsRepository.findNextThree();
    // La consulta SQL devuelve IDs, por eso se cargan las relaciones antes de mapear.
    return Promise.all(rows.map((row) => this.findOne(Number(row.id))));
  }

  private async findScreening(id: number): Promise<Screening> {
    const screening = await this.screeningsRepository.findOne({
      where: { id },
      relations: { theater: true, movie: true },
    });
    if (!screening) throw new NotFoundException(`Screening with id ${id} not found`);
    return screening;
  }

  private async findTheater(id: number): Promise<Theater> {
    const theater = await this.theatersRepository.findOneBy({ id });
    if (!theater) throw new NotFoundException(`Theater with id ${id} not found`);
    return theater;
  }

  private async findMovie(id: number): Promise<Movie> {
    const movie = await this.moviesRepository.findOneBy({ id });
    if (!movie) throw new NotFoundException(`Movie with id ${id} not found`);
    return movie;
  }
}
```

> Si se desea impedir dos funciones para la misma pelicula y el mismo theater a la misma hora, agrega una restriccion `UNIQUE(theater_id, movie_id, scheduled_at)` en una migracion y convierte el error de llave duplicada en `ConflictException`.

---

## 9) Controladores y rutas

### 9.1 `MoviesController`

Archivo: `src/movies/movies.controller.ts`

```ts
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
```

### 9.2 `ScreeningsController`

Archivo: `src/screenings/screenings.controller.ts`

```ts
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateScreeningDto } from './dto/create-screening.dto';
import { UpdateScreeningDto } from './dto/update-screening.dto';
import { ScreeningsService } from './screenings.service';

@Controller('screenings')
export class ScreeningsController {
  constructor(private readonly screeningsService: ScreeningsService) {}

  @Post()
  create(@Body() dto: CreateScreeningDto) { return this.screeningsService.create(dto); }

  @Get('reports/next-three')
  getNextThree() { return this.screeningsService.getNextThree(); }

  @Get()
  findAll() { return this.screeningsService.findAll(); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.screeningsService.findOne(id); }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScreeningDto) {
    return this.screeningsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.screeningsService.remove(id); }
}
```

Las rutas de reportes se declaran antes de `@Get(':id')`, para que `reports` no se intente convertir a numero.

---

## 10) Pruebas en Postman o Insomnia

### Crear una pelicula

`POST /movies`

```json
{
  "name": "Interestelar",
  "duration": 169,
  "date": "2014-11-07"
}
```

### Crear una funcion

`POST /screenings`

```json
{
  "scheduledAt": "2026-11-15T19:30:00-05:00",
  "theaterId": 1,
  "movieId": 1
}
```

### Actualizar una funcion

`PATCH /screenings/1`

```json
{
  "scheduledAt": "2026-11-15T21:00:00-05:00",
  "theaterId": 2
}
```

### Consultas personalizadas

- `GET /movies/reports/oldest`
- `GET /movies/reports/most-screenings`
- `GET /screenings/reports/next-three`

Una respuesta de `GET /screenings/reports/next-three` tiene esta forma:

```json
[
  {
    "id": 1,
    "scheduledAt": "2026-11-16T00:30:00.000Z",
    "theaterId": 1,
    "movieId": 1
  }
]
```

---

## 11) Resumen

1. Una relacion N-N con atributos propios se implementa con una entidad intermedia, no con `@ManyToMany()`.
2. `Screening` tiene dos `@ManyToOne()` y es propietaria de las FKs `theater_id` y `movie_id`.
3. `Theater` y `Movie` exponen sus funciones con `@OneToMany()`.
4. `MoviesModule` y `ScreeningsModule` encapsulan entidad, DTOs, mapper, repositorio, servicio y controlador.
5. El CRUD ordinario usa `Repository<T>`; los tres reportes usan repositorios SQL independientes.
6. Antes de crear o reasignar una funcion, el servicio comprueba que existan theater y movie.
7. No se permite borrar un theater o una movie con funciones pendientes mientras las FKs usen `NO ACTION`.
