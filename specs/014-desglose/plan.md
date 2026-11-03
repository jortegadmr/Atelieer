# Plan — Spec 014

Todo en `src/lib/desglose/` (TypeScript puro, probado con el disco en memoria) y una vista `Desglose.svelte` que solo presenta. Sin dependencias nuevas, sin tocar `src-tauri/`.

- `analisis.ts`: lee un guion con `clasificarTexto` y saca encabezado (locación, interior/exterior, momento), personajes (por línea de personaje y por referencias) y segundos de habla por personaje (RF-2, RF-5, RF-9).
- `desglose.ts`: filas por escena con el guion (o la ficha de escena si no hay), resolución contra fichas del mundo por nombre o alias sin tildes ni mayúsculas, filtros, grupos y tabla Markdown (RF-1, RF-3 a RF-5, RF-7, RF-8).
- `datos.ts`: datos por personaje, por lugar y de la serie (RF-9 a RF-11, RF-13, RF-14).
- `objetivo.ts`: duración objetivo en `<mesa>/_desglose/objetivo.md` (carpeta con guion bajo que la v1.0 no recorre; escritura segura) (RF-12).
- `cuadre.ts`: listas «en el guion y no en la escena» y al revés; «Añadir a la escena» por el camino normal de la spec 002 (RF-16 a RF-18).
- `Desglose.svelte`: pestaña dentro de «Análisis» (respuesta 1), tabla con filtros y grupos, datos, cuadre.
- La lectura de los guiones reutiliza `AlmacenGuion` y no toca lo «conocido» del almacén (como `IndiceGuion`).
