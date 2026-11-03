# Plan — Spec 015 «La app crea y edita todo» (fichas editables)

> Estado: aprobado por el autor junto con la spec (2026-10-29, «Apruebo y empieza a escribir todo el código»).

## Decisiones técnicas
- **Sin claves nuevas en `serie.md`.** Las carpetas de las categorías nuevas se calculan a partir de `wiki.raiz` con nombres fijos (`Glosario`, `Grupos`, `Poderes y reglas`, `Eventos del mundo`, `Especies`, `Documentos`). Así la v1.0 no ve nada distinto (RNF-2). Las tres de hoy siguen usando `personajes`, `lugares` y `eras`.
- **Un módulo nuevo de lógica pura** `src/lib/wiki/mundo.ts` (sin Svelte): categorías, lectura de una carpeta como `FichaMundo`, plantillas (las del vault si existen, si no las propuestas por la app, con los apartados que piden las guías), crear, renombrar con enlaces, mover, quitar a papelera, usos, relaciones y bloc de ideas. Todo sobre `Fs`; se prueba con `FsMemoria`.
- **Escribir una ficha** sigue pasando por `escribirFicha` (spec 009): compara texto entero, copia de cómo estaba, escritura segura. Renombrar y quitar usan la misma copia y la papelera de la serie (`appDatos/<serie>/_papelera/_wiki/`).
- **Relaciones** = campo `relaciones` de las propiedades de la ficha, una lista de `"[[Nombre]] — tipo"`. Se escribe con la librería `yaml` conservando comentarios y orden de lo demás.
- **Bloc de ideas** = apartado `## Ideas` al final de la ficha (se crea si no existe).
- **Interfaz:** la vista `wiki` pasa a llamarse «Mundo» (misma clave de vista para no romper atajos): rejilla de carpetas → listado con buscador → editor de ficha a ancho completo (`src/vistas/mundo/`). Estado en `src/lib/app/estado-mundo.svelte.ts`.
- **Barra lateral por niveles** (RF-14b): un panel plegable en el menú izquierdo con pestañas Capítulos · Personajes · Notas; abre en pantalla propia.
- Sin dependencias nuevas y sin cambios en `src-tauri/` (las bóvedas nuevas de la 016 se crean con el permiso de carpeta que ya existe; si no basta, se para y se pregunta).

## Cómo se prueba
Tests de `mundo.ts` con disco en memoria: crear (plantilla, Fuentes, Log, nombres inválidos, ya existe), leer, renombrar (enlaces en piezas, guion y fichas; copias; nada fuera de la serie), mover, quitar (papelera), usos, relaciones (ida y vuelta, se conserva lo ajeno), ideas, cambio por fuera. Interfaz en el navegador con la serie de prueba en memoria.

## Orden
Bloque 1 lógica (T1-T6) · Bloque 2 interfaz (T7-T11) · Bloque 3 cierre (T12-T13).
