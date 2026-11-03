# Validación — Spec 002 De arriba abajo

> 2026-10-20, rama `002-de-arriba-abajo`. `npm run verificar`: 49 archivos de tests, 463 tests en verde; `svelte-check` 0 errores y 0 avisos; compilación del frontal correcta. Sin cambios en `src-tauri/`.
> Navegador: `npm run dev` (serie de prueba en memoria), 1500×950, temas claro y oscuro.

## Requisito → prueba → resultado
| RF | Prueba | Resultado |
|---|---|---|
| 1 | Visor en la carcasa, encima de todas las vistas (navegador: Serie, Tramas, Temporada, Episodios, Wiki, Sincronización) | ✅ |
| 2-4 | `visor.test.ts` › una columna por temporada, episodio y evento, en orden | ✅ |
| 5-7 | `visor.test.ts` › datos de cada columna (código, título, estado, prevista/en marcha, carga, nº de episodios, escritura, trama dominante, idea central, nº de evento, cambio de valor); recorte a dos líneas por CSS (navegador) | ✅ |
| 8 | `visor.test.ts` › solo avisos de esa pieza, sin sugerencias (los silenciados ya no llegan desde `comprobar`) | ✅ |
| 9 | `visor.test.ts` › aparcado y descartado; columna con texto del estado además del color (navegador) | ✅ |
| 10 | `visor.test.ts` › «Aún no hay … · N previstos»; botón para crear la primera, o bloqueado con su texto | ✅ |
| 11, 12 | `estado-app.test.ts` › bajar elige la pieza; el evento solo se elige. Navegador: clic e Intro | ✅ |
| 13 | Navegador: Tab y flechas recorren las columnas; el foco pasa a la columna elegida o a la primera al cambiar de nivel | ✅ |
| 14 | `visor.test.ts` › miga; navegador: la miga de la v1 ya no está, la del visor sube | ✅ |
| 15-18 | `capas.test.ts`; `estado-app.test.ts` › subir. Navegador: Esc sube; con la búsqueda, una confirmación del panel o la ventana abiertas, las cierra sin subir; en un campo, sale del campo sin subir; en la serie no hace nada | ✅ |
| 19 | CSS 0,22 s; con «reducir movimiento» del sistema, `animation: none` (comprobado en el navegador) | ✅ |
| 20 | `estado-app.test.ts` › vista de cada nivel; navegador: Episodios marca el episodio y lo pone a la vista | ✅ |
| 21, 22 | `visor.test.ts` y `estado-app.test.ts` › pasos, selector, Tramas y Wiki. Navegador: igual | ✅ |
| 23 | `estado-app.test.ts` › abrir pone el nivel serie (no se guarda en disco) | ✅ |
| 24 | `visor.test.ts` › nivel válido (borrado, papelera, otra temporada, deshecho); `estado-app.test.ts` › sube y cambia la vista; en Tramas solo el nivel | ✅ |
| 25 | El visor se calcula de nuevo con cada cambio del modelo (también los de fuera, por la vigilancia) | ✅ |
| 26 | `crear.test.ts` › opciones por nivel; navegador | ✅ |
| 27 | Navegador: «Idea» de la barra abre la captura | ✅ |
| 28-32 | `crear.test.ts` › cada pieza en su sitio y en idea, tipo de trama, nueva o tramo; `estado-app.test.ts` › Crear cierra y la elige. Navegador: temporada y tramo creados | ✅ |
| 33, 34 | `crear.test.ts` › bloqueados con su texto y activos al desbloquear; `estado-app.test.ts` › Crear no crea. Navegador: botón con `aria-disabled`, texto visible, sin efecto al pulsar | ✅ |
| 35 | `estado-app.test.ts` › cerrar sin crear; navegador: Esc y Cancelar | ✅ |
| 36, 37 | `estado-app.test.ts` › abrir dos veces la deja igual; sin serie no hay carcasa. Navegador: Ctrl I desde un campo | ✅ |
| 38-41 | `crear.test.ts` › destinos, sin temporadas, vacío; `estado-app.test.ts` › el texto se queda con el aviso | ✅ |
| 42 | Navegador: Esc cierra sin crear | ✅ |
| 43 | `idea.test.ts` › deshacer por los dos caminos; `estado-app.test.ts` › la tostada se va. Navegador: Deshacer | ✅ |
| 44 | `crear.test.ts` y `idea.test.ts` › texto tal cual; la v1.0 lo lee igual | ✅ |
| 45, 46 | `crear.test.ts` › saltos, controles, 300 caracteres visibles sin partir emojis ni acentos | ✅ |
| 47 | Sin cambios en los arcos de la v1; `crear.test.ts` › trama, personaje o relación, de serie o de temporada, tramo | ✅ |
| RNF rendimiento | `rendimiento.test.ts` › columnas de los tres niveles sobre la serie grande: ~18 ms. Navegador (serie de prueba, modo desarrollo): cambio de nivel con la vista pintada, 12-23 ms. Idea en disco: `idea.test.ts` (< 2 s) | ✅ (la rejilla grande pintada: ver «A mano») |
| RNF compatibilidad | `idea.test.ts` › idea y piezas de «Nuevo…» con `: " --- # [[x]]`, leídas y guardadas por la v1.0 | ✅ |
| RNF integridad | `integridad-mesa.test.ts` (18 tests): nota cambiada o borrada fuera no se pisa ni se resucita; se compara con la nota de cuando se editó; crear es entero o nada; Ctrl Z no restaura lo cambiado fuera; el aviso se queda hasta cerrarlo | ✅ |
| RNF accesibilidad | Teclado en visor, barra y ventanas; foco atrapado en «Nueva pieza» y devuelto al cerrar; botones bloqueados alcanzables con su porqué (`aria-describedby`); la columna se lee entera, con estado y avisos en texto; contraste del hover de las columnas en los dos temas (`contraste.test.ts`) | ✅ |

## Revisión de código y seguridad
Revisor independiente sobre el diff de la rama.

| Gravedad | Hallazgos | Estado |
|---|---|---|
| 🔴 Crítico | 0 | — |
| 🟡 Importante | 5, todos de integridad de la mesa: guardar sin comparar con la nota de cuando se editó, reintentos que pisaban lo de fuera, creación a medias con la serie cambiada fuera, Ctrl Z que restauraba lo cambiado fuera, nota borrada fuera que se quedaba atascada | Arreglados en T15, con tests (`integridad-mesa.test.ts`) |
| ⚪ Menor | Interfaz, accesibilidad y tests (lista de T16) | Arreglados en T16, con tests y en el navegador |

Seguridad y privacidad: sin hallazgos. La captura y «Nuevo…» solo escriben en `appDatos/<serie>/` por el almacén (rutas por id, sin texto del usuario en la ruta); el título va como texto en el frontmatter, escapado (probado con `: " --- # [[x]]`); nada se pinta con `{@html}` (`sin-html.test.ts`); nada sale del equipo; sin dependencias nuevas; sin cambios en `src-tauri/` ni en los permisos.

## A mano (pendiente del autor)
1. PC (instalador nuevo): abrir `_prueba`, bajar de la serie a un episodio, subir con Esc y con la miga, crear una pieza de cada tipo y apuntar tres ideas en tres niveles, sin manual.
2. Abrir `_prueba` en la v1.0: las ideas salen en sus bandejas y las piezas nuevas se ven.
3. Ctrl I en Windows y Cmd I en el Mac abren la captura (ni WebView2 ni el menú del Mac se lo quedan).
4. Editar `serie.md` en Obsidian y, antes de 10 s, crear una temporada en la v2: no se pisa lo de Obsidian y sale el aviso.
5. Con una copia grande (por ejemplo, la serie grande de pruebas o una copia de Cabo Sal fuera de la vault), bajar a una temporada con muchos episodios: el cambio se nota inmediato.
