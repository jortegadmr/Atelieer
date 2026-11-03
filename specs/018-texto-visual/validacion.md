# Validación — Spec 018 «Texto visual»

`npm run verificar` bien (tipos, tests, compilación).

| RF | Cómo | Prueba |
|---|---|---|
| RF-1 | `markdown.ts` (`bloques`, `inline`, `sinComentarios`) y `TextoVisual.svelte` | `tests/texto-visual.test.ts`; navegador (ficha de Telmo) |
| RF-2 | clic o Intro pasa a edición; al salir o «Listo» guarda por `guardarApartado` | navegador |
| RF-3 | `edicion.ts` y barra de botones | `tests/texto-visual.test.ts`; navegador (negrita guardada) |
| RF-4 | `partirTrozos`, `conTabla`, celdas como campos y «+ Fila» | `tests/texto-visual.test.ts`; navegador (celda editada) |
| RF-5 | `[[Nombre]]` es un botón que abre la ficha | navegador |
| RF-6 | «Cómo se escribe» en el editor de ficha | navegador |
| RF-7 | texto pintado con elementos normales, sin `{@html}`; resto conservado | `tests/texto-visual.test.ts` (HTML como texto, textos hostiles) |
| RF-8 | `soloLectura` con variante o canon bloqueada | revisión del código |
| RF-9 | botones con nombre, texto editable con Intro, Escape cierra | revisión del código |

## A mano
- [ ] Escribir una ficha nueva solo con los botones y verla en Obsidian.
- [ ] Rellenar una tabla del Núcleo y ver que Obsidian la muestra bien.
- [ ] Editar con VoiceOver o el lector de pantalla de Windows.

## Revisión independiente (código y seguridad)
15 puntos. Arreglados con test: título con `\r`/U+2028 que colgaba el intérprete; la alineación de columnas se perdía al editar una celda; dos cambios seguidos de celdas se pisaban (ahora cada cambio se aplica sobre el texto que hay en la cola); expresiones cuadráticas (título, comentarios, enlaces) sustituidas o acotadas; tablas dentro de comentarios; `Math.max` con tablas enormes; finales de línea mezclados; negrita y cursiva anidadas al pulsar el botón; guardados dobles y avisos cuando no se puede guardar; el foco vuelve al texto al salir; el texto ya no es un botón que contiene botones.
Decidido: Escape sale y guarda (no descarta), porque la app guarda sola.
