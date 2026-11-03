# Validación — Spec 006 «¿Y si…?»

> 2026-10-22 · rama `006-y-si` · `npm run verificar`: 86 archivos, 803 tests en verde, 0 avisos, compilación correcta.
> Navegador: `npm run dev` (serie de prueba en memoria), 1440 × 900. Tests ligeros (decisión del autor en la 003): la lógica, el disco, el canon y la v1.0, con tests; la interfaz, en el navegador.

## Requisito → prueba → resultado
| RF | Prueba | Resultado |
|---|---|---|
| 1 | `almacen-variantes.test.ts` › se listan por sus propiedades. Navegador (T12, T26): el menú con Nueva variante, Aparcadas y «Aplicadas y descartadas (N)», con teclado | ✅ |
| 2, 2b | `nombres.test.ts` (fecha, « (2)», control y bidi a espacios, 120 caracteres, vacío). Navegador (T12): renombrar pinchando el nombre; vacío vuelve al de antes | ✅ |
| 3 | `estado-variante.test.ts` › «Otra versión de «título»», con la pieza elegida | ✅ |
| 4 | `versiones.test.ts`. Navegador (T14, T25): «Versiones (N)» con Abrir, Lado a lado y Aplicar | ✅ |
| 5, 6 | `estado-variante.test.ts` › abrir otra aparca la abierta y lo dice | ✅ |
| 7 | Navegador (T12): barra con nombre, frase, Ver ahora, Aparcar variante, Descartar variante, Aplicar; tono de la barra superior. `contraste.test.ts` › barra de la variante a 4,5:1 | ✅ |
| 8 | `sesion-variante.test.ts` › nada escribe en la serie, la wiki ni el Log; escribir y borrar no deja nada | ✅ |
| 8b | `edicion-bloqueada.test.ts` y `estado-variante.test.ts` › Ctrl I va a la serie | ✅ |
| 9 | `formato.test.ts` (ida y vuelta exacta), `almacen-variantes.test.ts` (ruta, cola, cambio de fuera) | ✅ |
| 10 | `sesion-variante.test.ts` › el deshacer de la variante es suyo y devuelve base y orden | ✅ |
| 11 | `sesion-variante.test.ts` › tocar canon no escribe; `aplicar.test.ts` › canon pide desbloquear al aplicar. Navegador (T13): nota de canon en la variante | ✅ |
| 12 | `sesion-variante.test.ts` › «Sal de la variante para…». Navegador (T13): instantáneas, guía, papelera y otra serie | ✅ |
| 13-16 | `estado-variante.test.ts` › «Ver ahora» bloquea la edición y elige la que la contiene; `edicion-bloqueada.test.ts`. Navegador (T13): ida y vuelta en cada vista | ✅ |
| 17, 18 | `visor-variante.test.ts` › «ahora» y «quedaría». Navegador (T17): «ahora 4» y «quedaría 5»; con «Si lo dejas así…», el gris | ✅ |
| 19-22 | `diferencias.test.ts` (grupos, orden, sin cambios). Navegador (T16): pestaña entre «Si lo dejas así…» y Guía, cifra, foco | ✅ |
| 23 | `lado-a-lado.test.ts` (campos en orden, columna vacía, avisos, «cambió en la serie», estructura legible). Navegador (T16): Esc cierra | ✅ |
| 24, 24b | `quitar.test.ts` | ✅ |
| 25-27 | `estado-variante.test.ts` › aparcar guarda y vuelve; vacía a la papelera; al abrir la serie, también; cerrar aparca | ✅ |
| 28 | `choques.test.ts` (pieza, por dentro, formato, `wiki_mtime`, sitio, referencia, en disco) | ✅ |
| 29 | Navegador (T19, T25): icono de choque en la barra, el menú y «Versiones» | ✅ |
| 30-31 | `traer.test.ts` (tres bandas, `extra`, crudos, sitio con y sin vecina, sin traer si no existe). Navegador (T25): «Traer lo de ahora» quita el choque | ✅ |
| 32 | Navegador (T25): resumen «cambia 1 pieza y saltarían 0 avisos» y «Pisa lo de ahora en 1 campo», desde la barra, el menú y «Versiones» | ✅ |
| 33 | `aplicar.test.ts` › con choques no aplica. Navegador (T25): desde «Versiones», en la confirmación sin «Aplicar»; desde la barra, abre la pestaña | ✅ |
| 34 | `aplicar.test.ts` › canon. Navegador (T25): «Desbloquear y aplicar» con el aviso de retcon | ✅ |
| 34b | `escribir-todo.test.ts` › comprobar si se puede pasar a la wiki | ✅ |
| 35 | Navegador (T25): «Aplicar» desactivado sin cambios; «No cambia nada.» | ✅ |
| 36 | `aplicar.test.ts` › sin instantánea no se aplica | ✅ |
| 37 | `escribir-todo.test.ts` (todo o nada, texto del disco, cambio de fuera, ruta fuera, vuelta atrás que falla) | ✅ |
| 37b | `aplicar-wiki.test.ts` | ✅ |
| 38 | `aplicar-deshacer.test.ts`. Navegador (T25): Ctrl Z | ✅ |
| 39 | `aplicar-deshacer.test.ts` › aplicada con su fecha. Navegador (T25): «Aplicada «…»: 1 pieza.» | ✅ |
| 40 | `aplicar.test.ts` › las otras variantes pasan a tener choques | ✅ |
| 41-43 | `descartar.test.ts`. Navegador (T26): descartar con porqué de dos líneas, lista con estado, fecha, piezas y porqué, Recuperar | ✅ |
| 44 | `descartar.test.ts` › «Antes de aplicar» y «Lo que aplicó». Navegador (T26): «Ver» y «Lado a lado» | ✅ |
| 45 | Los tests de las specs 001 a 005 siguen sin tocar y en verde | ✅ |

| RNF | Prueba | Resultado |
|---|---|---|
| Rendimiento | Con la serie grande en el disco en memoria: editar en la variante < 10 ms, abrir 50 piezas < 300 ms, seguir a la serie < 20 ms, «Ver ahora» < 100 ms, diferencias < 50 ms, choques de 50 variantes < 300 ms, aplicar 200 piezas < 2 s. En un Mac Intel antiguo, a mano | ✅ / a mano |
| Compatibilidad v1.0 | `compat-variantes.test.ts` (abre igual, instantáneas y papelera no las tocan); `aplicar.test.ts` › la v1.0 lee lo aplicado | ✅ |
| Integridad | `escribir-todo.test.ts`, `aplicar.test.ts`, `almacen-variantes.test.ts` (nunca se borra: papelera) | ✅ |
| Seguridad | `validacion.test.ts` (ids, tipos, bloques, tamaño, nombre y porqué limpios); sin `{@html}` (`sin-html.test.ts`) | ✅ |
| Accesibilidad | `contraste.test.ts`. Navegador: barra, menú, confirmaciones y porqué con teclado; Esc cancela; lo discontinuo con texto | ✅ |

## Probado en el navegador durante la implementación
- Nueva variante y «Probar otra versión»; el nombre se cambia en la barra; «Ver ahora» y volver; aparcar y abrir otra vez.
- Marcas de acento en el visor con su texto, y el gris de «Si lo dejas así…» cuando esa pestaña está abierta.
- Pestaña «¿Y si…?»: lo que cambia, avisos que saltarían, choques con «Lado a lado» y «Traer lo de ahora», «Pisa lo de ahora», «Quitar de la variante».
- Aplicar desde la barra, el menú y «Versiones»: resumen, «Pisa lo de ahora en 1 campo», choques (en la confirmación o en la pestaña), canon con «Desbloquear y aplicar», «Aplicada «…»: 1 pieza.» y Ctrl Z.
- Descartar con un porqué de dos líneas (se guarda en una), «Aplicadas y descartadas», Recuperar, y «Ver» de una aplicada con «Lado a lado» («Antes de aplicar» / «Lo que aplicó»).

## Arreglos encontrados al probar
- «Lado a lado» enseñaba la estructura de una temporada con su separador interno (un carácter nulo): ahora se lee «Detonante: texto · E01».

## Revisión independiente (T28)
Una revisión independiente revisó el código de la rama con la spec y el plan. Arreglado, con tests:

| Hallazgo | Arreglo | Commit |
|---|---|---|
| Quitar una pieza nueva quitaba también el contenedor que la lista (la serie o la temporada) con sus otros cambios | Solo sale su entrada de la lista; los demás cambios del contenedor se quedan (`quitar.test.ts`) | ece2591 |
| Aparcar, cerrar o descartar con la nota sin escribir cerraba la variante igual y podía perder lo último | El escritor dice cómo quedó; con un fallo la variante sigue abierta y lo dice (`operar-variante.test.ts`) | f3943e3 |
| Se podía editar la variante, «Ver ahora» o aparcar mientras se aplicaba | Una operación cada vez: la variante no se edita y la barra espera (`operar-variante.test.ts`) | f3943e3 |
| Un cambio de fuera durante una operación reabría la variante a la vez que se aplicaba | Al aplicar no se aplica nada y se reabre con lo de fuera al acabar; al aparcar, queda aparcada con lo de fuera | f3943e3 |
| Un reintento suelto tras cerrar podía devolver a aparcada una variante descartada | Cerrar para los reintentos | f3943e3 |
| El canon se desbloqueaba antes de escribir | Solo con las notas escritas; si la wiki falla, vuelve a bloquearse (`aplicar.test.ts`) | f3943e3 |
| Se podía aplicar una variante ya aplicada o descartada | Solo se aplican las aparcadas (`aplicar.test.ts`) | f3943e3 |
| Ctrl Y tras deshacer devolvía a aplicada una variante descartada entre medias | Se queda descartada (`aplicar-deshacer.test.ts`) | f3943e3 |
| La variante abierta usaba un `AlmacenVariantes` propio, no el de su serie; la confirmación usaba el texto como clave | El de su serie; claves por índice | f3943e3 |

No arreglado, con su motivo:
- Si falla la tercera escritura de `wiki_mtime` al aplicar, se ignora: es lo decidido en el plan (la wiki ya está escrita y el choque lo marca la próxima vez).
- Posibles huecos en `escribirTodo` con fallos en mitad de la vuelta atrás: sospecha sin caso que falle; los tests de la 37 cubren los conocidos.
- Ids con mayúsculas, el límite de 5 MB comprobado después de leer y `piezas` sin cotejar con los bloques: no abren ningún riesgo (el archivo es del autor y se valida al leerlo); se dejan.
- Fuera de esta spec (anteriores a la 006): `sacarDePapelera` usa `fs.borrar` al sacar de la papelera, y `.solo-lector` hace que la página se desborde a lo ancho en ventanas de 800 px. Se consultan con el autor.

Comprobado en el navegador tras los arreglos: con la premisa cambiada y una temporada nueva, «Quitar de la variante» en la temporada la quita y la serie sigue con sus cambios; aplicar la variante («Aplicada «…»: 1 pieza.») y Ctrl Z deja la serie como estaba.

## A mano (pendiente del autor)
En `_prueba` y sin manual (criterios de la spec):
1. «¿Y si…?», cambiar un episodio y mover una escena, «Ver ahora» y volver, aparcar, cerrar la app y abrirla otra vez: la variante sigue en Aparcadas, con sus cambios.
2. «Probar otra versión» dos veces en la misma pieza y elegir una con «Aplicar»; luego Ctrl Z, y aplicarla otra vez.
3. Cambiar en Obsidian una pieza que toca una variante aparcada, ver el choque y «Traer lo de ahora».
4. Descartar con un porqué y recuperar.
5. Aplicar una variante que pasa una pieza a borrador o a canon: la ficha sale en la wiki y en `Log.md` solo al aplicar.
6. Abrir en la v1.0 la carpeta `_prueba` con variantes guardadas y tras «Aplicar»: abre igual y lee lo aplicado.
7. Serie grande en un Mac Intel antiguo (Tauri): abrir, aparcar y cambiar de variante en menos de 1 s; «Ver ahora» y volver, sin espera; escribir en un campo dentro de la variante no se nota más lento.
8. Mac (WebKit) y Tauri en Windows: la barra, el menú, la confirmación junto a la variante y el porqué de descartar con teclado (Esc cancela).
