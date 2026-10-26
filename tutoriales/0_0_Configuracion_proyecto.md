# 0 — Configuración del proyecto (NestJS + TypeORM + MySQL)

Este documento cubre **solo la base del proyecto** para dejar todo listo antes del primer CRUD.

---

## 1) Objetivo de esta fase

Al finalizar esta guía tendrás:

- Proyecto NestJS creado.
- Dependencias base instaladas.
- Base de datos MySQL preparada.
- Variables de entorno configuradas.
- Conexión TypeORM lista para trabajar con migraciones.

---

## 2) Pre-requisitos

- Node.js LTS
- npm
- MySQL (Workbench, DBeaver o consola)
- Nest CLI

Instalar Nest CLI (si no lo tienes):

```bash
npm i -g @nestjs/cli
```

---

## 3) Crear el proyecto

```bash
nest new ms-cinema
cd ms-cinema
```

Durante el asistente de `nest new`, selecciona estas opciones:

```text
✨  We will scaffold your app in a few seconds..

✔ Which package manager would you ❤️  to use? npm
✔ Would you like to set up @nestjs/observe (distributed tracing, auto-correlated logs, metrics and alarms - free for 300k events/month, https://observe.nestjs.com)? No
✔ Which module system would you like to use? CJS (CommonJS)
        [ with jest ]
```

> Si ya tienes el proyecto creado, solo entra a la carpeta del proyecto.

---

## 4) Instalar dependencias base

```bash
npm install --save @nestjs/typeorm typeorm mysql2 @nestjs/config class-validator class-transformer axios --force
npm i @nestjs/mapped-types --force
```

---

## 5) Preparar base de datos MySQL

Ejecuta en MySQL:

```sql
CREATE DATABASE IF NOT EXISTS cinema_db;

CREATE USER IF NOT EXISTS 'admin_cine'@'localhost' IDENTIFIED BY 'cine123';
GRANT ALL PRIVILEGES ON cinema_db.* TO 'admin_cine'@'localhost';
FLUSH PRIVILEGES;
```

---

## 6) Configurar variables de entorno

Crear `.env` en la raíz del proyecto:

```ini
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=admin_cine
DB_PASS=cine123
DB_NAME=cinema_db
MS_SECURITY=http://localhost:8080
```

---

## 7) Crear configuración de TypeORM para migraciones

Crear `typeorm.config.ts` en la raíz:

```typescript
import { DataSource } from 'typeorm';
import 'dotenv/config';

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: ['src/**/*.entity{.ts,.js}', 'dist/**/*.entity.js'],
  migrations: ['src/migrations/*{.ts,.js}', 'dist/migrations/*.js'],
  synchronize: false,
});

export default dataSource;
```

---

## 8) Configurar `AppModule` para conexión a BD

Editar `src/app.module.ts`:

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
        synchronize: false,
      }),
    }),
  ],
})
export class AppModule {}
```

---

## 9) Levantar y validar proyecto

```bash
npm run start:dev
```

Validaciones esperadas:

- La aplicación inicia sin errores.
- Escucha en `http://localhost:3000`.
- No hay error de conexión con MySQL.

---

## 10) Resultado de esta fase

Con esta configuración ya puedes continuar con:

- **1_PrimerCrud** (Movies o entidad base del ejemplo de cine).
- DTOs, Mapper, Service, Controller y migraciones.
