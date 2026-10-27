# Relación 1-1 en NestJS (Theater ↔ Projector)

Objetivo: implementar la relación **uno a uno** entre:

- `Theater`
- `Projector (id:int, brand:string, high:int, width:int)`

El proyector debe vivir en su propio módulo, `ProjectorsModule`, con controlador, servicio y operaciones CRUD. La creación, actualización y asociación de proyectores se realizan exclusivamente desde `ProjectorsController`. Al crearlo, el `theaterId` es opcional.

## Crear el módulo `Projectors`

Primero genera el recurso con Nest CLI. Este comando crea `ProjectorsModule`, `ProjectorsController`, `ProjectorsService`, la entidad y los DTOs iniciales:

```bash
nest g resource projectors --no-spec
```

Cuando la CLI lo solicite, selecciona **REST API** y confirma la generación de endpoints CRUD. Después ajusta los archivos generados como se indica en esta guía.

## 1) Definir quién es el dueño de la relación

En este proyecto, el dueño de la relación es `Projector`, porque allí está la llave foránea:

- `projectors.theater_id`

Por eso, `@JoinColumn()` debe ir en `Projector`.

---

## 2) Crear/ajustar entidades

### 2.1 Entidad `Projector` (lado dueño)

Archivo: `src/projectors/entities/projector.entity.ts`

```ts
import { Theater } from '../../theaters/entities/theater.entity';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('projectors')
export class Projector {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  brand!: string;

  @Column({ type: 'int' })
  high!: number;

  @Column({ type: 'int' })
  width!: number;

  @OneToOne(() => Theater, (theater) => theater.projector, {
    cascade: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'theater_id' })
  theater!: Theater;
}
```

> Nota: `JoinColumnOptions` no acepta `unique: true`. `@OneToOne` hace que TypeORM genere una restricción `UNIQUE` para `projectors.theater_id`. Verifícala en la migración generada.

> La relación no permite eliminación en cascada: `cascade: false` impide cascadas desde TypeORM y `onDelete: 'NO ACTION'` hace que MySQL rechace eliminar un theater que todavía tenga un projector asociado.

### 2.2 Entidad `Theater` (lado inverso)

Archivo: `src/theaters/entities/theater.entity.ts`

```ts
import { Projector } from '../../projectors/entities/projector.entity';
import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

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

La migración debe contener una restricción equivalente a esta:

```ts
await queryRunner.createUniqueConstraint(
  'projectors',
  new TableUnique({
    name: 'UQ_projectors_theater_id',
    columnNames: ['theater_id'],
  }),
);
```

> La migración inicial ya fue generada y ejecutada en `src/migrations/1793135320152-InitCinemaSchema.ts`. Genera una nueva migración solo cuando cambies las entidades.

---

## 4) Ejecutar migraciones

```bash
npx typeorm-ts-node-commonjs migration:run -d ./typeorm.config.ts
```

---

## 5) DTOs de entrada

### 5.1 DTO único de `Projector`

Archivo: `src/projectors/dto/projector.dto.ts`

```ts
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class ProjectorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  brand?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  high?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  theaterId?: number;
}
```

El mismo DTO se usa en `POST` y `PATCH`: el servicio exige `brand`, `high` y `width` al crear; para actualizar, todos los campos son opcionales. En ambos casos, si se envía `theaterId`, debe corresponder a un theater existente sin otro projector asignado.

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
  theaterId?: number;
}
```

### 6.2 DTO de respuesta de `Theater`

Archivo: `src/theaters/dto/theater-response.dto.ts`

```ts
import { ProjectorResponseDto } from '../../projectors/dto/projector-response.dto';

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
import { ProjectorDto } from '../dto/projector.dto';
import { ProjectorResponseDto } from '../dto/projector-response.dto';
import { Projector } from '../entities/projector.entity';

export class ProjectorMapper {
  static toEntity(dto: ProjectorDto, theater?: Projector['theater']): Projector {
    return {
      brand: dto.brand!,
      high: dto.high!,
      width: dto.width!,
      theater,
    } as Projector;
  }

  static mergeEntity(entity: Projector, dto: ProjectorDto): Projector {
    if (dto.brand !== undefined) entity.brand = dto.brand;
    if (dto.high !== undefined) entity.high = dto.high;
    if (dto.width !== undefined) entity.width = dto.width;
    return entity;
  }

  static toResponseDto(entity: Projector): ProjectorResponseDto {
    return {
      id: entity.id,
      brand: entity.brand,
      high: entity.high,
      width: entity.width,
      theaterId: entity.theater?.id,
    };
  }
}
```

### 7.2 Mapper de `Theater`

Archivo: `src/theaters/mappers/theater.mapper.ts`

```ts
import { Injectable } from '@nestjs/common';
import { ProjectorMapper } from '../../projectors/mappers/projector.mapper';
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
      projector: entity.projector
        ? ProjectorMapper.toResponseDto(entity.projector)
        : undefined,
    };
  }

  toResponseDtoList(entities: Theater[]): TheaterResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
```

---

## 8) Crear módulo `Projectors` (explícito)

Además de entidad/DTO/mapper, `projectors` debe quedar encapsulado como módulo con su propio controlador y servicio.

### 8.1 Módulo

Archivo: `src/projectors/projectors.module.ts`

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Theater } from '../theaters/entities/theater.entity';
import { Projector } from './entities/projector.entity';
import { ProjectorsController } from './projectors.controller';
import { ProjectorsService } from './projectors.service';

@Module({
  imports: [TypeOrmModule.forFeature([Projector, Theater])],
  controllers: [ProjectorsController],
  providers: [ProjectorsService],
})
export class ProjectorsModule {}
```

### 8.2 Registro del módulo

`AppModule` importa `TheatersModule` y `ProjectorsModule`. `ProjectorsService` no se exporta porque ningún otro módulo lo inyecta actualmente.

---

## 9) CRUD de `Projector` + asociación por ruta

El `ProjectorsController` es el punto de entrada para administrar proyectores. La creación recibe opcionalmente el `theaterId` en el body.

### 9.1 Rutas recomendadas

- `POST /projectors` → crear projector, con asociación opcional mediante `theaterId`.
- `GET /projectors` → listar projectors.
- `GET /projectors/:id` → consultar uno.
- `PATCH /projectors/:id` → actualizar datos (`brand`, `high`, `width`) y, opcionalmente, asociar o reasignar mediante `theaterId`.
- `DELETE /projectors/:id` → eliminar projector.

### 9.2 Reglas de negocio 1-1 en service

En `ProjectorsService` valida siempre:

1. Que el theater exista antes de asociar.
2. Que el theater no tenga otro projector asignado.
3. Cargar `relations: ['theater']` o equivalente al responder.

---

## 10) Controlador de `Theater` (retorna DTO mapeado)

Archivo: `src/theaters/theaters.controller.ts`

```ts
@Post()
create(@Body() dto: TheaterDto): Promise<TheaterResponseDto> {
  return this.theatersService.create(dto);
}
```

---

## 11) Pruebas en Postman/Insomnia

### 11.1 Crear theater

`POST /theaters`

```json
{
  "location": "Sala VIP Norte",
  "capacity": 120
}
```

### 11.2 Crear projector sin asociación

`POST /projectors`

```json
{
  "brand": "Epson",
  "high": 1080,
  "width": 1920
}
```

### 11.3 Crear projector y asociarlo opcionalmente

`POST /projectors`

```json
{
  "brand": "Epson",
  "high": 1080,
  "width": 1920,
  "theaterId": 1
}
```

Si el theater no existe o ya tiene un projector, la API responde con un error. Si omites `theaterId`, el proyector se crea sin theater asociado.

### 11.4 Actualizar projector

`PATCH /projectors/{id}`

```json
{
  "brand": "Sony",
  "theaterId": 2
}
```

Si envías `theaterId`, el projector se asocia o reasigna a ese theater.

### 11.5 Verificar asociación

- `GET /theaters/{id}` debe devolver `projector`.
- `GET /projectors/{id}` debe devolver `theaterId`.

---

## 12) Resumen

Checklist para una relación 1-1 en Nest con TypeORM:

1. `@OneToOne` en ambas entidades.
2. `@JoinColumn` en el lado dueño (`Projector`).
3. Migración con `UNIQUE` en la FK (`theater_id`).
4. `ProjectorsModule` creado (módulo + service + controller).
5. CRUD completo de `Projector`.
6. Creación, modificación y asociación de proyectores gestionadas por rutas de `ProjectorsController`.
7. DTOs de entrada/salida separados + mappers.
8. Consultas con `relations` para devolver la relación cargada.
