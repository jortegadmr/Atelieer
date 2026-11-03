# 0003 — La pizarra vive en `_pizarra/pizarra.md`, junto a la serie

- **Fecha:** 2026-10-29
- **Estado:** aceptada (spec 012, «Pizarra libre y llevar a la sala»)

## Contexto
La pizarra son notas sueltas, tarjetas de piezas y flechas con posición en un lienzo. No es una pieza de la serie (no tiene estado, ni episodio, ni comprobaciones) y no es una ficha de la wiki. Hacía falta decidir dónde se guarda sin romper dos cosas: que la vault sea la única verdad (constitución 1) y que la v1.0 siga abriendo la serie sin avisos ni pérdidas.

## Decisión
- Un único fichero Markdown: `appDatos/<serie>/_pizarra/pizarra.md`. Lleva un título, una línea que dice qué es y un bloque de código `json` con `version`, `elementos` y `flechas`. Lo que haya fuera del bloque se conserva al reescribir.
- La v1.0 solo recorre las carpetas de cada tipo de pieza y `serie.md`; una carpeta que empieza por `_` no se recorre (igual que `_variantes`). Una prueba de compatibilidad (`tests/compat-pizarra.test.ts`) lo comprueba con el lector de la v1.
- El orden de `elementos` es el apilado: lo último se pinta encima.
- La tarjeta guarda el **id** de la pieza, no su título: sigue a la pieza si se renombra o cambia de sitio. Si la pieza no existe se ve «pieza no encontrada» y no se borra.
- Lo que la app no entiende (campos de primer nivel y de cada elemento) se conserva en `extra` y se reescribe tal cual. Una versión de formato mayor que 1 se abre en solo lectura. Un fichero ilegible se aparta junto a la pizarra con su fecha y se empieza con una vacía, avisando; nunca se borra.
- Antes de quitar una nota con texto, una tarjeta o una flecha se guarda la pizarra anterior en `_papelera/_pizarra/<sello>.md`. La app no borra nada de la papelera.
- Guardar es entero o nada y sin pisar: si el disco ya no es lo último leído o escrito, se relee y se avisa (como en la spec 002).
- La pizarra entra en las instantáneas de la serie (al estar dentro de su carpeta) y se restaura con ella.
- «Llevar a la sala» **no escribe nada**: lee la pizarra sin apartar ni renombrar un fichero ilegible (`AlmacenPizarra.leerSinEscribir`) y usa la que está en pantalla si ya está cargada.
- Sin dependencias nuevas y sin cambios en `src-tauri/`.

## Alternativas descartadas
- **Una nota por elemento (en la wiki o en `appDatos`):** cientos de ficheros pequeños, sincronización más lenta y conflictos por cada movimiento; la v1.0 tendría que ignorarlos uno a uno.
- **Dentro de `serie.md`:** la v1.0 reescribiría o perdería lo que no entiende, y cada movimiento tocaría el fichero más importante.
- **Solo en el navegador/webview (`localStorage`):** se perdería con la caché y no viajaría con la vault ni con las instantáneas.
- **Una pieza nueva en el `Modelo`:** arrastraría esquemas, comprobaciones y formato de las notas para algo que no es parte de la serie.

## Consecuencias
- Un cambio en el formato de `pizarra.md` pide subir `version` y mantener la lectura tolerante de las anteriores.
- La pizarra no sale en la wiki de Obsidian como una ficha: se puede abrir como una nota, pero la edición va por la app.
- Los topes (200 elementos, 400 flechas, 5000 caracteres por nota) mantienen la lectura y el guardado muy por debajo de 100 ms (`tests/pizarra-rendimiento.test.ts`: unos pocos milisegundos).
