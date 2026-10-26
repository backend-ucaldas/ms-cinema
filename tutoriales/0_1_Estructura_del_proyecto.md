# 0 — Conceptos base de NestJS

## ¿Qué es un controlador?
Es la capa que recibe peticiones HTTP (`GET`, `POST`, `PATCH`, `DELETE`) y delega la lógica al servicio.

## ¿Qué es un servicio?
Es la capa donde vive la lógica de negocio: validaciones, reglas, consultas y operaciones sobre datos.

## ¿Qué es una entidad?
Es una clase que representa una tabla de base de datos en TypeORM.

## ¿Qué es un repositorio?
Es el componente que permite acceder a la base de datos para una entidad (guardar, consultar, actualizar, eliminar).

## ¿Qué es un DTO?
Es una clase que define la estructura de datos de entrada/salida de la API y permite validar esos datos.

## ¿Qué es un mapper?
Es una clase que convierte objetos entre capas, por ejemplo:
- DTO de entrada → Entidad
- Entidad → DTO de respuesta

## ¿Qué es un módulo?
Es el contenedor que agrupa componentes relacionados (controller, service, providers y repositorios) por funcionalidad.

## ¿Qué es un guard?
Es una capa de seguridad que decide si una petición está autorizada para continuar.

## ¿Qué es un gateway?
Es la capa para comunicación en tiempo real con WebSocket/Socket.IO (conexiones, eventos y emisiones).

