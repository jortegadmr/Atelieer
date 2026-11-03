# 0002 — La v2 se construye sobre el código de la v1

- **Fecha:** 2026-10-20
- **Estado:** aceptada (sustituye la idea de empezar desde cero en un repositorio nuevo)

## Contexto
Se empezó la v2 en un repositorio nuevo como lienzo en blanco. Tras los bocetos, el autor concluyó que la v2 es «coger lo mejor de la v1 y mejorar lo que falta, añadiendo funcionalidades». La v1 tiene 252 tests en verde, 0 errores de tipos, lector tolerante, almacén con instantáneas y aviso de uso, comprobaciones, puente con la wiki y compilación de Windows y Mac Intel probada.

## Decisión
- La v2 sigue en `main` del mismo repositorio.
- La v1 queda congelada en la etiqueta `v1.0` y la rama `v1` (solo arreglos), con sus instaladores guardados.
- La v2 se instala **al lado** de la v1: otro nombre («Atelier v2») y otro identificador (`com.jortegadmr.atelier-v2`).
- **Formato compatible:** la v2 usa la misma `appDatos/` que la v1 y lo que escribe lo tiene que seguir leyendo la v1.0.
- Lo decidido en el repositorio de arranque (PRD, constitución, inventario, bocetos) se trae a `docs/`; ese repositorio se archiva.

## Alternativas descartadas
- **Desde cero:** semanas para rehacer lo que ya funciona y está probado.
- **Traer piezas sueltas a un repo nuevo:** el mismo trabajo de revisión, sin conservar el historial ni la compilación de Mac.
- **Mesa separada para la v2 (`appDatos-v2/`):** más aislada, pero el autor prefiere ver lo mismo en las dos versiones.

## Consecuencias
- Se reutilizan módulos, tests y estilo de la v1; la interfaz evoluciona hacia el boceto H.
- Cada cambio de formato en `appDatos/` necesita una prueba de que la v1.0 lo sigue leyendo (o se pregunta al autor).
- Hay que vigilar dos instalaciones: no abrir la misma serie en la v1 y la v2 a la vez (el aviso de uso `.abierta` es común a las dos).
