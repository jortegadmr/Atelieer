# Spec 016 — Serie nueva guiada

Aprobada por el autor el 2026-10-29 («apruebo y empieza a escribir todo el código que nos falta»), a partir del vistazo de la spec 015.

## Qué
Crear una serie desde cero en la app y que ésta acompañe en orden, sin obligar.

## Requisitos
- RF-1: AL crear una serie, el autor elige dónde: **dentro de la vault de ahora** o en una **vault nueva** (una carpeta vacía que pasa a ser vault de Obsidian, con `.obsidian` y `appDatos`).
- RF-2: UNA carpeta con contenido no se usa como vault nueva: se dice y no se toca nada.
- RF-3: AL crear, se crean las carpetas de la wiki (raíz, personajes, lugares, épocas y cada categoría del mundo). Nunca se pisa nada que ya exista.
- RF-4: EN la vista Serie hay un recorrido «Tu serie, paso a paso»: premisa, personajes, lugares, arcos y tramas, temporadas, episodios, escenas, guion. Cada paso lleva a su pantalla; el primero sin hacer se sugiere.
- RF-5: EL recorrido no obliga ni guarda nada: se calcula de lo que hay, se puede plegar y saltarse pasos.
- RF-6: NADA sale del equipo. La compatibilidad con la v1.0 se mantiene: no se añade ningún campo a `serie.md`.

## Fuera
Plantillas de serie por género; importar una serie de otra app.
