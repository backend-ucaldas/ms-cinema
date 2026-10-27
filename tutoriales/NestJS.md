# Guía NestJS — Cinema API

Guía de implementación completa para construir una API REST de cine con **NestJS**, **TypeORM** y **MySQL**, incluyendo relaciones entre entidades, validaciones, migraciones y seguridad mediante Guards.

---

## Tabla de Contenidos

1. [Arquitectura del Framework](#1-arquitectura-del-framework)
2. [Pre-requisitos e Instalación](#2-pre-requisitos-e-instalación)
3. [Configuración de Base de Datos (MySQL)](#3-configuración-de-base-de-datos-mysql)
4. [Configuración del Entorno y Conexión](#4-configuración-del-entorno-y-conexión)
5. [Generación de Recursos (CLI)](#5-generación-de-recursos-cli)
6. [Definición de Entidades y Relaciones](#6-definición-de-entidades-y-relaciones)
7. [Validaciones (DTOs)](#7-validaciones-dtos)
8. [Lógica de Negocio (CRUD)](#8-lógica-de-negocio-crud---completo)
9. [Migraciones](#9-migraciones)
10. [Seguridad (Guards)](#10-seguridad-guards)

---

## 1. Arquitectura del Framework

NestJS opera bajo una arquitectura modular y escalable. Antes de iniciar la implementación, es fundamental comprender los componentes base adaptados al nuevo modelo de negocio:

| Componente | Descripción |
|---|---|
| **Módulos (Modules)** | Agruparemos la lógica por dominios: `MoviesModule`, `TheatersModule`, `ScreeningsModule`, `ProjectorsModule`, `SeatsModule`. |
| **Controladores (Controllers)** | Manejarán las rutas (ej: `POST /screenings` para programar una función). |
| **Servicios (Providers/Services)** | Contendrán la lógica, como validar que una película exista antes de crear una función. |
| **DTO (Data Transfer Objects)** | Definirán qué datos se envían (ej: `movie_id` y `theater_id` para crear una `Screening`). |
| **Entidades (Entities)** | Mapeo ORM de las tablas: `Movie`, `Screening`, `Theater`, `Projector`, `Seat`. |
| **Guards** | Autorización mediante microservicio externo. |

---

## 2. Pre-requisitos e Instalación

Se requiere tener instalado **Node.js** (versión LTS recomendada).

### Instalación del CLI de NestJS

```bash
npm i -g @nestjs/cli
```

### Creación del Proyecto

```bash
nest new demo-cinema

```

Luego será necesario ingresar a la carpeta creada que contiene el proyecto

```bash
cd demo-cinema

```

### Instalación de Dependencias

Instalamos TypeORM, MySQL, Validadores y el paquete `mapped-types` para evitar errores en tipos parciales.

```bash
npm install --save @nestjs/typeorm typeorm mysql2 @nestjs/config class-validator class-transformer axios --force

npm i @nestjs/mapped-types --force
```

---

## 3. Configuración de Base de Datos (MySQL)

Ejecuta este script en tu cliente SQL (Workbench/DBeaver):

```sql
-- 1. Crear la base de datos
CREATE DATABASE IF NOT EXISTS cinema_db;

-- 2. Crear el usuario
CREATE USER IF NOT EXISTS 'admin_cine'@'localhost' IDENTIFIED BY 'cine123';

-- 3. Asignar privilegios
GRANT ALL PRIVILEGES ON cinema_db.* TO 'admin_cine'@'localhost';

FLUSH PRIVILEGES;
```

---

## 4. Configuración del Entorno y Conexión

### 4.1. Archivo `.env`

Crea un archivo `.env` en la raíz del proyecto:

```ini
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=admin_cine
DB_PASS=cine123
DB_NAME=cinema_db
MS_SECURITY=http://localhost:8080
```

### 4.2. Archivo `typeorm.config.ts`

Crea este archivo en la raíz para las migraciones:

```typescript
import { DataSource } from 'typeorm';
import 'dotenv/config'; // Carga las variables del archivo .env

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  // El CLI usa las fuentes TypeScript para evitar cargar migraciones duplicadas.
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});

export default dataSource;
```

### 4.3. Configuración del `AppModule`

En `src/app.module.ts`, importamos los nuevos módulos del diagrama:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASS'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // Usaremos migraciones
      }),
    }),
  ],
})
export class AppModule {}
```

---

## 5. Generación de Recursos (CLI)

Generamos los recursos basados en el nuevo diagrama:

```bash
nest g resource movies
nest g resource theaters
nest g resource projectors
nest g resource seats
nest g resource screenings
```

---

## 6. Definición de Entidades y Relaciones

Relaciones reflejadas en el diagrama:

- **Theater → Projector:** `1:1`
- **Theater → Seat:** `1:N`
- **Movie → Screening:** `1:N`
- **Theater → Screening:** `1:N` (Una sala tiene muchas funciones)

### 6.1. Entidad `Projector` (1:1 Inversa)

`src/projectors/entities/projector.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { Theater } from '../../theaters/entities/theater.entity';

@Entity('projectors')
export class Projector {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  brand!: string;

  @Column()
  high!: number;

  @Column()
  width!: number;

  @OneToOne(() => Theater, (theater) => theater.projector)
  theater!: Theater;
}
```

### 6.2. Entidad `Seat` (N:1)

`src/seats/entities/seat.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Theater } from '../../theaters/entities/theater.entity';

@Entity('seats')
export class Seat {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  location!: string;

  @Column()
  reclining!: boolean;

  @ManyToOne(() => Theater, (theater) => theater.seats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'theater_id' })
  theater!: Theater;
}
```

### 6.3. Entidad `Movie` (Padre)

`src/movies/entities/movie.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Screening } from '../../screenings/entities/screening.entity';

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  duration!: number; // minutos

  @Column({ type: 'date' })
  date!: Date;

  @OneToMany(() => Screening, (screening) => screening.movie)
  screenings!: Screening[];
}
```

### 6.4. Entidad `Screening` (Tabla Intermedia con datos)

`src/screenings/entities/screening.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Movie } from '../../movies/entities/movie.entity';
import { Theater } from '../../theaters/entities/theater.entity';

@Entity('screenings')
export class Screening {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'datetime' })
  date!: Date;

  @ManyToOne(() => Movie, (movie) => movie.screenings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'movie_id' })
  movie!: Movie;

  @ManyToOne(() => Theater, (theater) => theater.screenings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'theater_id' })
  theater!: Theater;
}
```

### 6.5. Entidad `Theater` (Principal)

`src/theaters/entities/theater.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, OneToOne, OneToMany } from 'typeorm';
import { Projector } from '../../projectors/entities/projector.entity';
import { Seat } from '../../seats/entities/seat.entity';
import { Screening } from '../../screenings/entities/screening.entity';

@Entity('theaters')
export class Theater {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  location!: string;

  @Column()
  capacity!: number;

  @OneToOne(() => Projector, (projector) => projector.theater)
  projector!: Projector;

  @OneToMany(() => Seat, (seat) => seat.theater, { cascade: true })
  seats!: Seat[];

  @OneToMany(() => Screening, (screening) => screening.theater)
  screenings!: Screening[];
}
```

---

## 7. Validaciones (DTOs)

Configura validación global en `src/main.ts`:

```typescript
const app = await NestFactory.create(AppModule);
// Esta línea es nueva
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
//-------
 await app.listen(process.env.PORT ?? 3000);
```

### DTO Creación de `Screening`

`src/screenings/dto/create-screening.dto.ts`

Este DTO es vital para conectar `Movie` y `Theater` mediante sus IDs:

```typescript
import { IsInt, IsNotEmpty, IsISO8601 } from 'class-validator';

export class CreateScreeningDto {
  @IsISO8601()
  date!: string; // "2024-10-20T18:00:00Z"

  @IsInt()
  @IsNotEmpty()
  movie_id!: number;

  @IsInt()
  @IsNotEmpty()
  theater_id!: number;
}
```

---

## 8. Lógica de Negocio (CRUD) — Completo

Esta sección contiene la implementación crítica para evitar errores de dependencias.

### 8.1. Registro de Repositorios en Módulos ⚠️ IMPORTANTE

Para que el servicio de `Screenings` pueda acceder a `Movies` y `Theaters`, debemos usar `forFeature` con las tres entidades.

**`src/screenings/screenings.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScreeningsService } from './screenings.service';
import { ScreeningsController } from './screenings.controller';
import { Screening } from './entities/screening.entity';
import { Movie } from '../movies/entities/movie.entity';
import { Theater } from '../theaters/entities/theater.entity';

@Module({
  // AQUÍ SE INYECTAN LOS REPOSITORIOS
  imports: [TypeOrmModule.forFeature([Screening, Movie, Theater])],
  controllers: [ScreeningsController],
  providers: [ScreeningsService],
})
export class ScreeningsModule {}
```

**`src/theaters/theaters.module.ts`**

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Theater])],
  controllers: [TheatersController],
  providers: [TheatersService],
})
export class TheatersModule {}
```

**Nota:**  Debe hacerse lo mismo para las demás entidades

### 8.2. Implementación de Servicios Completos

**`src/theaters/theaters.service.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theater } from './entities/theater.entity';
import { CreateTheaterDto } from './dto/create-theater.dto';

@Injectable()
export class TheatersService {
  constructor(
    @InjectRepository(Theater)
    private readonly theaterRepository: Repository<Theater>,
  ) { }

  async create(createTheaterDto: CreateTheaterDto) {
    const theater = this.theaterRepository.create(createTheaterDto);
    return await this.theaterRepository.save(theater);
  }

  async findAll() {
    return await this.theaterRepository.find({
      relations: ['projector', 'seats', 'screenings'],
    });
  }

  async findOne(id: number) {
    const theater = await this.theaterRepository.findOne({
      where: { id },
      relations: ['projector', 'seats', 'screenings'],
    });

    if (!theater) throw new NotFoundException(`Teatro #${id} no encontrado`);
    return theater;
  }
  async update(id: number, updateTheaterDto: Partial<CreateTheaterDto>) {
    const theater = await this.findOne(id); // reutiliza validación

    const updated = Object.assign(theater, updateTheaterDto);

    return await this.theaterRepository.save(updated);
  }

  async remove(id: number) {
    const theater = await this.findOne(id); // asegura que exista

    await this.theaterRepository.remove(theater);

    return { message: `Teatro #${id} eliminado correctamente` };
  }
}
```

**`src/screenings/screenings.service.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateScreeningDto } from './dto/create-screening.dto';
import { Screening } from './entities/screening.entity';
import { Movie } from '../../movies/entities/movie.entity';
import { Theater } from '../../theaters/entities/theater.entity';

@Injectable()
export class ScreeningsService {
  constructor(
    @InjectRepository(Screening) private screeningRepo: Repository<Screening>,
    @InjectRepository(Movie) private movieRepo: Repository<Movie>,
    @InjectRepository(Theater) private theaterRepo: Repository<Theater>,
  ) {}

  async create(dto: CreateScreeningDto) {
    // 1. Buscamos la película
    const movie = await this.movieRepo.findOneBy({ id: dto.movie_id });
    if (!movie) throw new NotFoundException('Película no encontrada');

    // 2. Buscamos el teatro
    const theater = await this.theaterRepo.findOneBy({ id: dto.theater_id });
    if (!theater) throw new NotFoundException('Teatro no encontrado');

    // 3. Creamos la relación
    const screening = this.screeningRepo.create({
      date: new Date(dto.date),
      movie: movie,
      theater: theater,
    });

    return await this.screeningRepo.save(screening);
  }

  async findAll() {
    return await this.screeningRepo.find({
      relations: ['movie', 'theater'], // Trae los datos relacionados
    });
  }

  async findOne(id: number) {
    const screening = await this.screeningRepo.findOne({
      where: { id },
      relations: ['movie', 'theater'],
    });

    if (!screening) throw new NotFoundException(`Función #${id} no encontrada`);
    return screening;
  }
}
```

### 8.3. Controladores

**`src/theaters/theaters.controller.ts`**

```typescript

import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TheatersService } from './theaters.service';
import { CreateTheaterDto } from './dto/create-theater.dto';
import { UpdateTheaterDto } from './dto/update-theater.dto';

@Controller('theaters')
export class TheatersController {
  constructor(private readonly theatersService: TheatersService) {}

  @Post()
  create(@Body() createTheaterDto: CreateTheaterDto) {
    return this.theatersService.create(createTheaterDto);
  }

  @Get()
  findAll() {
    return this.theatersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.theatersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTheaterDto: UpdateTheaterDto) {
    return this.theatersService.update(+id, updateTheaterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.theatersService.remove(+id);
  }
}

```

**`src/screenings/screenings.controller.ts`**

```typescript
import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ScreeningsService } from './screenings.service';
import { CreateScreeningDto } from './dto/create-screening.dto';

@Controller('screenings')
export class ScreeningsController {
  constructor(private readonly screeningsService: ScreeningsService) {}

  @Post()
  create(@Body() createScreeningDto: CreateScreeningDto) {
    return this.screeningsService.create(createScreeningDto);
  }

  @Get()
  findAll() {
    return this.screeningsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.screeningsService.findOne(id);
  }
}
```

---

## 9. Migraciones

### Generar Migración

```bash
npx typeorm-ts-node-commonjs migration:generate ./src/migrations/InitCinemaSchema -d ./typeorm.config.ts
```

### Ejecutar Migración

```bash
npx typeorm-ts-node-commonjs migration:run -d ./typeorm.config.ts
```

### Correr el Proyecto

```bash
npm run start
```

### Prueba en Postman

La creación y actualización del teatro solo reciben sus propios campos. Crea o modifica el proyector mediante las rutas de `ProjectorsController`.

| Campo | Valor |
|---|---|
| **Método** | `POST` |
| **URL** | `http://localhost:3000/theaters` |

**Body (JSON):**

```json
{
  "location": "Sala IMAX - Centro Mayor",
  "capacity": 150
}
```

Para crear un proyector asociado al teatro creado usa `POST /projectors` con `theaterId` en el body. Para modificarlo usa `PATCH /projectors/{id}`.

---

## 10. Seguridad (Guards)

### Implementación del Guard

`src/common/guards/security.guard.ts`

```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SecurityGuard implements CanActivate {
  private readonly logger = new Logger('SecurityGuard');

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { headers, url, method } = request;

    if (!headers.authorization) {
      throw new UnauthorizedException('Token de autorización faltante');
    }

    const token = headers.authorization.replace('Bearer ', '');
    const permissionData = { url, method };

    try {
      const securityUrl = `${process.env.MS_SECURITY}/api/public/security/permissions-validation`;
      const response = await axios.post(securityUrl, permissionData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data === true) return true;
      else throw new UnauthorizedException('Permisos insuficientes');
    } catch (error) {
      this.logger.error(`Error auth: ${error.message}`);
      throw new UnauthorizedException('Acceso denegado');
    }
  }
}
```

### Registro Global (protege TODO por defecto)

En `src/app.module.ts`, registra el guard globalmente:

```typescript
import { APP_GUARD } from '@nestjs/core';
import { SecurityGuard } from './common/guards/security.guard';

@Module({
  providers: [{ provide: APP_GUARD, useClass: SecurityGuard }],
})
export class AppModule {}
```

> ⚠️ Reiniciar el servidor después de aplicar este cambio y volver a probar los endpoints.

---

*Guía generada para el proyecto Cinema API con NestJS + TypeORM + MySQL.*
