# 6 - Notificaciones en tiempo real con WebSockets (Socket.IO)

## Objetivo

Agregar un canal de notificaciones en tiempo real a Cinema API usando Socket.IO y un gateway de NestJS.

En esta guía:

1. Un cliente se conecta a la API por WebSocket.
2. El gateway registra la conexión y emite una bienvenida.
3. El cliente puede enviar el evento `message`.
4. Al crear una función (`Screening`), `ScreeningsService` emite `new_notification` para todos los clientes conectados.

> Esta guía usa Socket.IO, no WebSocket nativo. Por eso un cliente debe utilizar un cliente compatible con Socket.IO.

---

## 1) Verificar o instalar dependencias

Archivo: `package.json`

Confirma que estén en `dependencies`:

- `@nestjs/websockets`
- `@nestjs/platform-socket.io`
- `socket.io`

Si no están instaladas, ejecuta:

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

Las versiones las resolverá npm de acuerdo con la versión de NestJS que ya usa el proyecto. No agregues manualmente versiones de Nest distintas a la versión principal instalada.

---

## 2) Consideración sobre el Guard global HTTP

La guía anterior registra `SecurityGuard` como `APP_GUARD`. Ese guard fue escrito para solicitudes HTTP y usa `context.switchToHttp()`.

Para que el guard no intente leer un request HTTP cuando Nest esté manejando un evento del gateway, agrega al inicio de `canActivate` en `src/common/guards/security.guard.ts`:

```ts
async canActivate(context: ExecutionContext): Promise<boolean> {
  if (context.getType() !== 'http') return true;

  const request = context.switchToHttp().getRequest<Request>();
  // ...resto del guard HTTP existente
}
```

Con esta guía, el guard continúa protegiendo los endpoints REST. El socket queda abierto para recibir notificaciones. Si se necesita autenticar también los sockets, debe validarse el token del `handshake` dentro del gateway o con un guard exclusivo de WebSocket; no reutilices sin adaptación el guard HTTP.

---

## 3) Crear el gateway de notificaciones

Archivo: `src/gateways/notifications/notifications.gateway.ts`

```ts
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server?: Server;

  handleConnection(client: Socket): void {
    this.logger.log(`Nuevo dispositivo conectado: ${client.id}`);
    this.logger.debug(`Query del socket: ${JSON.stringify(client.handshake.query)}`);

    client.emit('new_notification', { hello: 'world' });
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Dispositivo desconectado: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: unknown): string {
    this.logger.log(`Mensaje recibido: ${JSON.stringify(data)}`);
    return 'Mensaje recibido correctamente';
  }

  broadcastNotification(payload: { event: string; data: unknown }): void {
    this.server?.emit(payload.event, payload.data);
  }
}
```

`@WebSocketServer()` recibe el servidor Socket.IO que Nest crea. El método `broadcastNotification` permite que los servicios de negocio publiquen eventos sin conocer detalles de Socket.IO.

> `cors: { origin: '*' }` es útil para desarrollo. En producción, reemplázalo por los dominios concretos del frontend, por ejemplo `origin: ['https://cinema.example.com']`.

---

## 4) Encapsular el gateway en un módulo

Archivo: `src/gateways/notifications/notifications.module.ts`

```ts
import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}
```

La exportación permite inyectar `NotificationsGateway` desde módulos como `ScreeningsModule`.

---

## 5) Registrar el módulo en `AppModule`

Archivo: `src/app.module.ts`

Importa el módulo:

```ts
import { NotificationsModule } from './gateways/notifications/notifications.module';
```

Después agrégalo en `imports`, junto a los demás módulos de dominio:

```ts
imports: [
  // ConfigModule y TypeOrmModule existentes...
  TheatersModule,
  ProjectorsModule,
  SeatsModule,
  MoviesModule,
  ScreeningsModule,
  NotificationsModule,
],
```

---

## 6) Permitir la inyección desde `ScreeningsModule`

Archivo: `src/screenings/screenings.module.ts`

Importa el módulo de notificaciones:

```ts
import { NotificationsModule } from '../gateways/notifications/notifications.module';
```

Inclúyelo en los imports ya existentes:

```ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Screening, Theater, Movie]),
    NotificationsModule,
  ],
  controllers: [ScreeningsController],
  providers: [ScreeningsService, ScreeningsRepository],
})
export class ScreeningsModule {}
```

---

## 7) Emitir una notificación al crear una función

Archivo: `src/screenings/screenings.service.ts`

Agrega el import:

```ts
import { NotificationsGateway } from '../gateways/notifications/notifications.gateway';
```

Inyecta el gateway en el constructor:

```ts
constructor(
  @InjectRepository(Screening)
  private readonly screeningsRepository: Repository<Screening>,
  @InjectRepository(Theater)
  private readonly theatersRepository: Repository<Theater>,
  @InjectRepository(Movie)
  private readonly moviesRepository: Repository<Movie>,
  private readonly customScreeningsRepository: ScreeningsRepository,
  private readonly notificationsGateway: NotificationsGateway,
) {}
```

Finalmente, actualiza `create`. La notificación debe enviarse únicamente después de que la función se guarde correctamente:

```ts
async create(dto: CreateScreeningDto): Promise<ScreeningResponseDto> {
  const theater = await this.findTheater(dto.theaterId);
  const movie = await this.findMovie(dto.movieId);
  const saved = await this.screeningsRepository.save(
    ScreeningMapper.toEntity(dto, theater, movie),
  );

  const response = await this.findOne(saved.id);

  this.notificationsGateway.broadcastNotification({
    event: 'new_notification',
    data: {
      message: 'Nueva función creada',
      screening: response,
    },
  });

  return response;
}
```

Todos los clientes conectados reciben el evento. Para enviar eventos solo a ciertos usuarios, salas o roles, utiliza rooms de Socket.IO en una guía posterior.

---

## 8) Cliente de prueba con Python

Instala el cliente de Socket.IO para Python si es necesario:

```bash
pip install "python-socketio[client]"
```

Crea `clientSocket.py` fuera de `src` o en una carpeta de pruebas locales:

```python
import socketio

sio = socketio.Client()

@sio.event
def connect():
    print('Conectado al servidor')
    sio.emit('message', {'from': 'python-client', 'text': 'hola desde cliente'})

@sio.event
def disconnect():
    print('Desconectado del servidor')

@sio.on('new_notification')
def on_new_notification(data):
    print('Notificación recibida:', data)

sio.connect('http://localhost:3000', transports=['websocket'])
sio.wait()
```

Ejecuta el servidor de Nest y después el cliente:

```bash
python clientSocket.py
```

El cliente debe recibir primero la bienvenida:

```text
Notificación recibida: {'hello': 'world'}
```

Luego crea una función con `POST /screenings` y un token con permiso válido. El cliente debe recibir un nuevo evento `new_notification` con los datos de la función creada.

---

## 9) Resumen de archivos

| Archivo | Cambio |
|---|---|
| `package.json` | Dependencias de Socket.IO/Nest WebSockets. |
| `src/common/guards/security.guard.ts` | Ignorar contextos que no sean HTTP. |
| `src/gateways/notifications/notifications.gateway.ts` | Conexiones, mensajes y publicación de eventos. |
| `src/gateways/notifications/notifications.module.ts` | Provider y exportación del gateway. |
| `src/app.module.ts` | Registro de `NotificationsModule`. |
| `src/screenings/screenings.module.ts` | Importación de `NotificationsModule`. |
| `src/screenings/screenings.service.ts` | Emisión de `new_notification` tras crear una función. |
| `clientSocket.py` | Prueba manual opcional. |
