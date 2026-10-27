# Relación 1-1 en NestJS (Theater ↔ Projector)

Objetivo: implementar la relación **uno a uno** entre:

- `Theater`
- `Projector (id:int, brand:string, high:int, width:int)`

## 1) Definir quién es el dueño de la relación

En este proyecto, el dueño de la relación es `Projector`, porque allí está la llave foránea:

- `projectors.theater_id`

Por eso, `@JoinColumn()` debe ir en `Projector`.

---

## 2) Crear/ajustar entidades

### 2.1 Entidad `Projector` (lado dueño)

Archivo: `src/projectors/entities/projector.entity.ts`

```ts
import { Theater } from 'src/theaters/entities/theater.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';

@Entity('projectors')
export class Projector {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  brand?: string;

  @Column()
  high?: number;

  @Column()
  width?: number;

  @OneToOne(() => Theater, (theater) => theater.projector)
  @JoinColumn({ name: 'theater_id', unique: true })
  theater?: Theater;
}
```

> Nota: En `@OneToOne`, TypeORM suele generar el `UNIQUE` automáticamente en la FK del lado dueño; aquí se deja explícito (`unique: true`) para que la intención 1-1 quede clara en la entidad.

### 2.2 Entidad `Theater` (lado inverso)

Archivo: `src/theaters/entities/theater.entity.ts`

```ts
import { Projector } from 'src/projectors/entities/projector.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from 'typeorm';

@Entity('theaters')
export class Theater {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  location?: string;

  @Column()
  capacity?: number;

  @OneToOne(() => Projector, (projector) => projector.theater, { cascade: true })
  projector?: Projector;
}
```

---

## 3) Generar migración

Ejecuta:

```bash
npx typeorm-ts-node-commonjs migration:generate ./src/migrations/InitCinemaSchema -d ./typeorm.config.ts
```

Para una relación 1-1 correcta, en la tabla `projectors` debe aparecer:

- columna `theater_id`
- índice `UNIQUE` sobre `theater_id`
- llave foránea a `theaters(id)`

> En este proyecto ya existe una migración que crea ese `UNIQUE` (`REL_39723a507706f581bc5928ff8f`), lo que garantiza el 1-1 en base de datos.

---

## 4) Ejecutar migraciones

```bash
npx typeorm-ts-node-commonjs migration:run -d ./typeorm.config.ts
```

---

## 5) DTOs para crear el proyector

### 5.1 DTO base del proyector

Archivo: `src/projectors/dto/base-projector.dto.ts`

```ts
import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class BaseProjectorDto {
  @IsString()
  @IsNotEmpty()
  brand!: string;

  @IsInt()
  @Min(1)
  high!: number;

  @IsInt()
  @Min(1)
  width!: number;
}
```

### 5.2 DTO para crear theater con projector embebido

Archivo: `src/projectors/dto/create-theater-projector.dto.ts`

```ts
import { BaseProjectorDto } from './base-projector.dto';

export class CreateTheaterProjectorDto extends BaseProjectorDto {}
```

### 5.3 DTO de Theater con projector opcional

Archivo: `src/theaters/dto/create-theater.dto.ts`

```ts
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateTheaterProjectorDto } from 'src/projectors/dto/create-theater-projector.dto';

export class CreateTheaterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  location?: string;

  @IsInt()
  @Min(1)
  @Max(200)
  capacity?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTheaterProjectorDto)
  projector?: CreateTheaterProjectorDto;
}
```

---

## 6) Crear DTOs de respuesta (obligatorio con mapper)

### 6.1 DTO de respuesta de `Projector`

Archivo: `src/projectors/dto/projector-response.dto.ts`

```ts
export class ProjectorResponseDto {
  id!: number;
  brand!: string;
  high!: number;
  width!: number;
}
```

### 6.2 DTO de respuesta de `Theater`

Archivo: `src/theaters/dto/theater-response.dto.ts`

```ts
import { ProjectorResponseDto } from 'src/projectors/dto/projector-response.dto';

export class TheaterResponseDto {
  id!: number;
  location!: string;
  capacity!: number;
  projector?: ProjectorResponseDto;
}
```

---

## 7) Crear mappers

### 7.1 Mapper de `Projector`

Archivo: `src/projectors/mappers/projector.mapper.ts`

```ts
import { ProjectorResponseDto } from '../dto/projector-response.dto';
import { Projector } from '../entities/projector.entity';

export class ProjectorMapper {
  static toResponseDto(entity: Projector): ProjectorResponseDto {
    return {
      id: entity.id ?? 0,
      brand: entity.brand ?? '',
      high: entity.high ?? 0,
      width: entity.width ?? 0,
    };
  }
}
```

### 7.2 Mapper de `Theater`

Archivo: `src/theaters/mappers/theater.mapper.ts`

```ts
import { ProjectorMapper } from 'src/projectors/mappers/projector.mapper';
import { TheaterResponseDto } from '../dto/theater-response.dto';
import { Theater } from '../entities/theater.entity';

export class TheaterMapper {
  static toResponseDto(entity: Theater): TheaterResponseDto {
    return {
      id: entity.id ?? 0,
      location: entity.location ?? '',
      capacity: entity.capacity ?? 0,
      projector: entity.projector
        ? ProjectorMapper.toResponseDto(entity.projector)
        : undefined,
    };
  }
}
```

---

## 8) Servicio: usar mapper para responder

Archivo: `src/theaters/theaters.service.ts`

```ts
import { TheaterMapper } from './mappers/theater.mapper';
import { TheaterResponseDto } from './dto/theater-response.dto';

async create(createTheaterDto: CreateTheaterDto): Promise<TheaterResponseDto> {
  const theater = this.theaterRepository.create(createTheaterDto);
  const saved = await this.theaterRepository.save(theater);
  const withProjector = await this.theaterRepository.findOne({
    where: { id: saved.id },
    relations: ['projector'],
  });
  if (!withProjector) throw new NotFoundException('Teatro recién creado no encontrado');
  return TheaterMapper.toResponseDto(withProjector);
}

async findAll(): Promise<TheaterResponseDto[]> {
  const theaters = await this.theaterRepository.find({
    relations: ['projector'],
  });
  return theaters.map(TheaterMapper.toResponseDto);
}

async findOne(id: number): Promise<TheaterResponseDto> {
  const theater = await this.theaterRepository.findOne({
    where: { id },
    relations: ['projector'],
  });

  if (!theater) throw new NotFoundException(`Teatro #${id} no encontrado`);
  return TheaterMapper.toResponseDto(theater);
}
```

---

## 9) Controlador (retorna DTO mapeado)

Archivo: `src/theaters/theaters.controller.ts`

```ts
import { TheaterResponseDto } from './dto/theater-response.dto';

@Post()
create(@Body() createTheaterDto: CreateTheaterDto): Promise<TheaterResponseDto> {
  return this.theatersService.create(createTheaterDto);
}
```

Al crear un teatro, puedes enviar también su proyector.

---

## 10) Prueba en Postman/Insomnia

### 8.1 Crear theater con projector (1-1)

`POST /theaters`

```json
{
  "location": "Sala VIP Norte",
  "capacity": 120,
  "projector": {
    "brand": "Epson",
    "high": 1080,
    "width": 1920
  }
}
```

### 8.2 Consultar theater y verificar projector

`GET /theaters/{id}`

Debe retornar el objeto `projector` asociado.

---

## 11) Resumen

Checklist para una relación 1-1 en Nest con TypeORM:

1. `@OneToOne` en ambas entidades.
2. `@JoinColumn` en el lado dueño (`Projector`).
3. Migración con `UNIQUE` en la FK (`theater_id`).
4. DTOs de entrada y de salida separados.
5. Mappers para convertir entidad → response DTO.
6. `relations: ['projector']` al consultar.
