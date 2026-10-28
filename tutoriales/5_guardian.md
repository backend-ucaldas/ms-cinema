# 5 - Guardian de seguridad (token y permisos remotos)

## Objetivo

Proteger la API de cine con un **Guard** de NestJS. Antes de que un controlador ejecute cualquiera de sus endpoints, el guard:

1. Intercepta la solicitud HTTP.
2. Comprueba que llegue el header `Authorization: Bearer <token>`.
3. Extrae el token sin modificarlo.
4. Envía al microservicio de seguridad el token, la URL y el método HTTP solicitados.
5. Si el microservicio responde `{ "allowed": true }`, Nest permite que la petición continúe.
6. Si responde `{ "allowed": false }`, no responde o falla, Nest rechaza el acceso.

El guard no valida ni decodifica el JWT localmente. El microservicio de seguridad es la fuente de verdad para determinar si el token tiene permisos sobre la ruta solicitada.

---

## 1) Flujo de autorización

```text
Cliente HTTP
    │ Authorization: Bearer eyJ...
    ▼
Cinema API: SecurityGuard
    │ POST MS_SECURITY/api/internal/security/permissions-validation
    │ Authorization: Bearer eyJ...
    │ { url: "/movies", method: "POST" }
    ▼
Microservicio de seguridad
    │ true / false
    ▼
SecurityGuard
    ├── true  → Controller y Service
    └── false → 403 Forbidden
```

El guard se ejecuta antes de llegar al controlador; por eso un usuario sin permiso no puede ejecutar el CRUD ni los reportes.

---

## 2) Dependencia y variable de entorno

El proyecto ya incluye `axios`. Si no estuviera instalado, ejecuta:

```bash
npm install axios
```

En `.env`, configura la URL base del microservicio de seguridad:

```ini
MS_SECURITY=http://localhost:8080
```

En este ejemplo se asume que el microservicio expone:

```text
POST /api/internal/security/permissions-validation
```

con este contrato:

Solicitud enviada por Cinema API:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "url": "/movies",
  "method": "POST"
}
```

Respuesta esperada del microservicio:

```json
{
  "allowed": true
}
```

Este contrato es interno y requiere el JWT del usuario. `ms_security` devuelve HTTP 200 tanto para permiso concedido como denegado; la decisión está en la propiedad `allowed`.

---

## 3) Crear el Guard

Crea la carpeta y el archivo:

```text
src/common/guards/security.guard.ts
```

Contenido completo:

```ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Request } from 'express';

interface PermissionValidationResponse {
  allowed: boolean;
}

@Injectable()
export class SecurityGuard implements CanActivate {
  private readonly logger = new Logger(SecurityGuard.name);

  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request.headers.authorization);

    const securityBaseUrl = this.configService.get<string>('MS_SECURITY');
    if (!securityBaseUrl) {
      this.logger.error('MS_SECURITY no esta configurada');
      throw new ServiceUnavailableException('Servicio de seguridad no configurado');
    }

    try {
      const response = await axios.post<PermissionValidationResponse>(
        `${securityBaseUrl}/api/internal/security/permissions-validation`,
        {
          // La tabla de permisos de ms_security registra rutas como /movies.
          // No se incluye el query string porque no forma parte del permiso.
          url: request.path,
          method: request.method,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        },
      );

      if (response.data.allowed === true) return true;

      throw new ForbiddenException('No tiene permiso para acceder a este recurso');
    } catch (error) {
      // No se transforma el rechazo normal de permisos en un error de infraestructura.
      if (error instanceof ForbiddenException) throw error;

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        this.logger.warn(
          `Validacion de permisos rechazada: ${status ?? error.code ?? 'sin respuesta'}`,
        );

        if (status === 401) {
          throw new UnauthorizedException('Token invalido o expirado');
        }
        if (status === 403) {
          throw new ForbiddenException('No tiene permiso para acceder a este recurso');
        }
      }

      this.logger.error('No fue posible consultar el servicio de seguridad');
      throw new ServiceUnavailableException('Servicio de seguridad no disponible');
    }
  }

  private extractBearerToken(authorization?: string): string {
    if (!authorization) {
      throw new UnauthorizedException('Token de autorizacion faltante');
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token || authorization.split(' ').length !== 2) {
      throw new UnauthorizedException('Formato de Authorization invalido');
    }

    return token;
  }
}
```

### Resultado de cada caso

| Situación | Respuesta de Cinema API |
|---|---|
| No llega `Authorization` | `401 Unauthorized` |
| Header no tiene formato Bearer | `401 Unauthorized` |
| Seguridad responde `{ allowed: true }` | El endpoint continúa |
| Seguridad responde `{ allowed: false }` | `403 Forbidden` |
| Seguridad responde `401` | `401 Unauthorized` |
| Seguridad responde `403` | `403 Forbidden` |
| Seguridad no responde, excede 5 s o falla | `503 Service Unavailable` |

---

## 4) Registrar el guard globalmente

Para proteger toda la API por defecto, registra el guard con `APP_GUARD`.

Archivo: `src/app.module.ts`

Agrega los imports:

```ts
import { APP_GUARD } from '@nestjs/core';
import { SecurityGuard } from './common/guards/security.guard';
```

En el arreglo `providers`, agrega el proveedor global sin eliminar `AppService`:

```ts
providers: [
  AppService,
  {
    provide: APP_GUARD,
    useClass: SecurityGuard,
  },
],
```

Con esto quedan protegidas rutas como:

- `POST /movies`
- `GET /movies/reports/oldest`
- `POST /screenings`
- `PATCH /theaters/:id`

No debes añadir `@UseGuards(SecurityGuard)` uno por uno cuando se usa `APP_GUARD`.

---

## 5) Permitir rutas públicas (opcional)

Al usar un guard global, una ruta de salud o documentación también queda protegida. Para declarar excepciones explícitas, crea este decorador.

Archivo: `src/common/decorators/public.decorator.ts`

```ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

Actualiza el guard para inyectar `Reflector` y retornar inmediatamente en rutas públicas:

```ts
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

constructor(
  private readonly configService: ConfigService,
  private readonly reflector: Reflector,
) {}

async canActivate(context: ExecutionContext): Promise<boolean> {
  const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
    context.getHandler(),
    context.getClass(),
  ]);
  if (isPublic) return true;

  // Continúa aquí con el código de extracción y validación del token.
}
```

Luego usa `@Public()` únicamente donde corresponda:

```ts
import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
```

No marques rutas de negocio como públicas solo para evitar configurar o probar el microservicio de seguridad.

---

## 6) Probar desde Postman o Insomnia

Ejemplo: crear una película.

```http
POST http://localhost:3000/movies
Authorization: Bearer <token-valido>
Content-Type: application/json
```

```json
{
  "name": "Interestelar",
  "duration": 169,
  "date": "2014-11-07"
}
```

El guard enviará al servicio remoto:

```json
{
  "url": "/movies",
  "method": "POST"
}
```

- Si el microservicio devuelve `{ "allowed": true }`, recibes la respuesta normal `201 Created`.
- Si devuelve `{ "allowed": false }`, recibes `403 Forbidden` y el controlador no se ejecuta.
- Si el token falta o tiene formato inválido, recibes `401 Unauthorized`.

---

## 7) Resumen

1. `SecurityGuard` implementa `CanActivate` y se ejecuta antes de los controladores.
2. El token se toma de `Authorization: Bearer <token>`.
3. Cinema API reenvía el token al microservicio de seguridad junto con la ruta y el método.
4. Solo la respuesta `{ allowed: true }` autoriza la solicitud.
5. `false` se traduce en `403`; un token ausente o inválido, en `401`.
6. Si el microservicio no está disponible, se responde `503` para no permitir accesos sin validar.
