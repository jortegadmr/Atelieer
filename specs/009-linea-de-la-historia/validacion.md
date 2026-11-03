# Validación — Spec 009 «Línea de la historia, fichas y lo pendiente»

> 2026-10-22 · rama `009-linea-de-la-historia` · `npm run verificar`: 97 archivos, 907 tests en verde, 0 errores ni avisos de tipos, compilación correcta. La interfaz se comprueba en el navegador (decisión del autor en la 003), con la serie de prueba en memoria: cada tarea en su momento (T4-T11, T16, T22) y todo junto en la T24.

## A. Línea de la historia

| RF | Prueba | Resultado |
|---|---|---|
| 1, 2 | Navegador: «Línea de la historia» en Estructura, debajo de las temporadas; la abre en el contenido | ✅ |
| 3, 3b | Test «abrir la línea no cambia el nivel…»; navegador: abrir la línea y «Volver a leer la wiki» traen la ficha cambiada fuera | ✅ |
| 4, 5 | Tests «orden de las filas y Presente en su fila», «fichas sin fila detrás, por nombre», «alias y subcarpetas se juntan», «Presente sin fila no es época», «épocas en orden, Presente en su fila y No está en la wiki detrás», «sin fila Presente, va al final…» | ✅ |
| 6, 7 | Tests «[[La Inundación]], negritas y \| dan el nombre limpio», «épocas en orden… No está en la wiki detrás»; navegador: C1 y Presente con sus escenas por emisión | ✅ |
| 8 | Test «dónde se emite: código y número, bandeja o sin temporada»; navegador: título, «T01E01 · 2», modo («En escena», «Leyenda contada») y estado en texto | ✅ |
| 9, 10 | Navegador: nombre y número en cada columna (también 0); la línea se desplaza en su caja y la página no a 900 px (T4) | ✅ |
| 11, 12 | Navegador (T4): sin épocas, la frase y «Abrir la Timeline»; sin escenas, «Aún no hay escenas.» / «Esta temporada aún no tiene escenas.» | ✅ |
| 13-15 | Test «…el filtro vuelve a toda la serie al abrir otra vez»; test «sin fila Presente… el filtro deja solo su temporada con la bandeja»; navegador: selector con «Toda la serie» y T01-T03 | ✅ |
| 16 | Navegador: clic en «Se conocen en la lonja» la abre en el panel sin salir de la línea; Intro igual (T5) | ✅ |
| 17 | Navegador: el panel, Ctrl Z y la ficha cambiada fuera ponen la línea al día sin reabrirla | ✅ |
| 18, 21 | Tests «el cambio solo toca mundo», «a Presente deja vacío»; navegador: arrastrar a otra columna (T6) | ✅ |
| 19, 20 | Tests «Alt + flechas salta No está en la wiki y avisa en los bordes», «Alt + flechas: uno por pulsación…»; navegador: Alt + ← pasa a C1 y el foco sigue en la tarjeta | ✅ |
| 22, 23 | Test «en su misma columna, nada; en No está en la wiki, no se suelta», «en su misma columna no hace nada ni crea paso»; navegador: Esc no cambia nada (T6) | ✅ |
| 24 | Navegador (T6): textos de fuera no se sueltan; la tarjeta no entra en el visor ni en la rejilla | ✅ |
| 25 | Tests «nombre con \| no se suelta, y canon bloqueado tampoco», «canon bloqueado no se mueve y lo dice; en la variante sí…» | ✅ |
| 26 | Test «nombre con \| no se suelta…»; navegador: el porqué en la columna (T6) | ✅ |
| 27 | Tests «un paso de Ctrl Z por movimiento…», «Ctrl Z desde No está en la wiki devuelve el texto exacto» | ✅ |
| 27b | Navegador: tras mover, «Si lo dejas así…» cuenta la escena como cambiada | ✅ |
| 28 | Tests «…en la variante sí, y no escribe en la serie», «con Ver ahora no se mueve»; navegador: con «Ahora», Alt + ← no mueve y lo dice | ✅ |
| 29 | Test «un paso de Ctrl Z por movimiento, y anuncia a dónde pasa»; navegador: «Pasa a «C1»» en un `role=status`; tras Ctrl Z, o al cambiar de lado en la variante, el aviso se calla (arreglado en esta tarea) | ✅ |

Además: «la wiki releída a medio arrastre no mueve», «dos movimientos a la vez: el segundo se ignora y lo dice».

## B y C. Marcas

| RF | Prueba | Resultado |
|---|---|---|
| 30 | Tests «Estaba aquí en la columna de donde salió y Nueva…», «el papel de antes, Estaba aquí donde estaba la escena y Nueva», «cómo estaba cada campo cambiado del arco que se ve…», «Nueva y Ya no está en la lista…»; navegador: «Estaba aquí: «Se conocen en la lonja»» en gris discontinuo en Presente | ✅ |
| 31 | Test «con una variante con diferencias, acento; con Ver ahora, al revés»; navegador: «Ahora aquí» en acento con «Cómo quedaría» y «Quedaría aquí» con «Ahora» | ✅ |
| 32 | Test «con «Si lo dejas así…» abierta y cambios, gris, también dentro de una variante» | ✅ |
| 33 | Navegador: las marcas van detrás de las tarjetas, sin mover el orden, con texto y `title` | ✅ |
| 33b | Test «con «Si lo dejas así…» abierta, pulsar una escena no cambia la pieza que se compara» | ✅ |
| 34 | Test «un arco cuya escena cambia de temporada en la variante: cada lado lleva su texto»; navegador (T11) | ✅ |

## D. Pestaña «Ficha»

| RF | Prueba | Resultado |
|---|---|---|
| 35 | Navegador: al pasar T02 a borrador se crea su ficha y sale «Ficha» después de Guía | ✅ |
| 36 | Tests de «partir una ficha en apartados» (6) y «con su ruta, su texto, sus apartados y su estado en la wiki» | ✅ |
| 37 | Tests «cambiar un apartado deja el resto igual byte a byte, con `\r\n` y BOM», «sin salto final…», «los títulos repetidos y el código con `##` no se tocan», «un apartado vacío…», «Inicio se escribe después de las propiedades»; navegador: guarda al salir y a los 2 s (T16) | ✅ |
| 37b | Tests «una línea ## no se guarda», «Inicio con `---`… rompería las propiedades», «lo que rompería la ficha no se guarda» | ✅ |
| 37c | Test «lo pendiente se guarda antes de que la app escriba el estado»; navegador: cambiar de pieza, vista o variante y pasar a canon guardan antes (T16) | ✅ |
| 38 | Tests «si cambió fuera, no escribe», «si la ficha ya estaba marcada como cambiada fuera, se queda marcada» | ✅ |
| 39, 39b | Tests «la primera vez copia y apunta; la segunda, no», «dos copias en el mismo segundo no se pisan» | ✅ |
| 39c | Tests «pone al día la fecha de la ficha en la pieza», «Ctrl Z de un paso anterior no da Cambió en la wiki» | ✅ |
| 40 | Test «no entra en el Ctrl Z» | ✅ |
| 41, 42 | Test «canon bloqueado y variante no escriben»; navegador: los dos textos y el campo sin editar (T16) | ✅ |
| 43 | Tests «si no existe o el enlace sale de la narrativa, null», «un enlace con ../ no se lee, no se escribe ni lo revisa revisarFichas» | ✅ |
| 44 | Tests «una línea ## no se guarda», «los títulos repetidos… no se tocan»; navegador: los títulos no se editan | ✅ |

## E. «Alternativas descartadas»

| RF | Prueba | Resultado |
|---|---|---|
| 45 | Tests «con su título y su porqué; sin título, «Sin título»», «\| en el título se escapa…», «descartar una escena de dos arcos escribe en las dos fichas y en el Log», «escena en un tramo va a la ficha del arco de serie; el tramo, también» | ✅ |
| 45b | Test «arco canon bloqueado no se toca» | ✅ |
| 46 | Tests «añade bajo ### Alternativas descartadas…», «con filas, añade debajo de la última», «título sin tabla…», «sin título, la primera tabla… «Idea»», «…antes de Fuentes», «sin título ni Fuentes, al final», «CRLF y BOM se quedan» | ✅ |
| 47 | Test «fila igual, no añade» | ✅ |
| 48 | Tests «quitar solo si sigue igual y nadie más la da», «si era la única, vuelve la fila vacía…», «recuperar la quita», «si otra pieza descartada del arco da la misma fila, recuperar no la quita y lo dice» | ✅ |
| 49 | Tests «Ctrl Z quita la fila y avisa de que el Log no se deshace», «Ctrl Y la vuelve a poner», ««Volver a como estaba» quita la fila» | ✅ |
| 50 | Test «descartar una escena de dos arcos escribe en las dos fichas y en el Log» | ✅ |
| 51 | Tests «en la variante no toca la wiki hasta aplicar», «una fila que no se puede escribir no deshace la variante y se dice» | ✅ |
| 52 | Test «si la ficha cambió fuera, no escribe y la escena sí se descarta» | ✅ |

Además: «releer la wiki no escribe filas».

## F. Estados antiguos

| RF | Prueba | Resultado |
|---|---|---|
| 53 | Tests «vacío no es antiguo; los cuatro estados, con mayúsculas, tampoco», «revisarFichas da el valor tal cual», «Canon con mayúscula es canon»; navegador: con «en revisión» en la ficha de T02, el aviso sale en Editar y en Ficha | ✅ |
| 54 | Tests «la tabla propone sin mayúsculas ni acentos», «una lista avisa sin propuesta», «una lista en bloque se cambia entera…»; navegador: «Se propone borrador» | ✅ |
| 55 | Tests «confirmar canon cambia ficha, Log y pieza», «confirmar descartado pide su porqué», «confirmar que cambia la pieza es un paso propio de Ctrl Z», «confirmar lo que ya corresponde solo cambia la ficha…» | ✅ |
| 55b | Test «canon bloqueado y variante no confirman»; navegador: el porqué junto a «Confirmar» desactivado (T22) | ✅ |
| 55c | Test «el Log dice el valor de antes»; el aviso va en Editar junto al estado (`CampoEstado.svelte`), como pide RF-55c | ✅ |
| 56 | Test «Dejarlo así se guarda en la pieza y vuelve a avisar con otro valor»; navegador: «Dejarlo así», «Dejado así: «…»» y «Quitar» (T22) | ✅ |
| 57 | Test «nada cambia sin confirmar» | ✅ |

## Requisitos no funcionales

| RNF | Prueba | Resultado |
|---|---|---|
| Rendimiento | Test «300 escenas y 30 épocas: abrir y filtrar en menos de 200 ms» | ✅ |
| Integridad | Tests byte a byte de apartados y alternativas (CRLF, BOM); «el cambio solo toca mundo»; «un enlace con ../ no se lee…»; nada se borra: las copias van a `_fichas/` | ✅ |
| Compatibilidad v1.0 | `compat.test.ts` «la v1.0 abre la serie tras lo de la spec 009» (épocas, apartado, descartar y recuperar, equivalencia, «Dejarlo así»); `compat-variantes.test.ts` «la v1.0 no ve ni toca _fichas/» | ✅ |
| Accesibilidad | Navegador: Alt + flechas e Intro en las tarjetas; avisos en `role=status`; las marcas llevan texto, no solo color | ✅ |
| Plataformas | Estética de la v1; la línea no ensancha la página a 900 px (T4). Windows y Mac: pendiente del autor | ✅ |

## Arreglado en esta tarea
- El selector «Temporada» de la línea salía con el aspecto del sistema: ahora como los campos del panel.
- El aviso «Pasa a «…»» seguía tras Ctrl Z, y el de «Estás viendo ahora…» tras cerrar la variante: ahora se callan.

## Revisiones (T25)
Dos revisiones independientes: seguridad y código. Nada de gravedad alta. Arreglado, cada punto con su test:

| Hallazgo | Gravedad | Arreglo |
|---|---|---|
| Obsidian guarda la ficha mientras se hace la copia `.md.bak`: se pisaba | Media | `escribirFicha` vuelve a comparar justo antes de escribir |
| Otra herramienta apunta en el Log a la vez: se pisaba su entrada | Baja | `anotarLog` relee y monta la entrada sobre lo último |
| Retorno suelto, separadores de línea, control y bidi en la fila | Baja | `enUnaLinea` en las celdas |
| Un estado antiguo en bloque metía líneas en el título del Log | Baja | En una línea y como mucho 60 caracteres |
| Un acento grave en la fila rompía el código del Log | Baja | `codigoEnLinea` con delimitador más largo |
| Un comentario o un bloque de código sin cerrar en un apartado escondía los de debajo | Media | No se guarda: «Eso escondería los apartados de debajo: cierra el comentario o el bloque de código.» (amplía RF-37b) |
| La pestaña Ficha se releía tras su propio guardado y quitaba el salto recién escrito | Media | Lo que escribe la pestaña no se relee; la relectura va en su cola. Navegador: el salto se queda y dos guardados seguidos no dan «cambió en Obsidian» |
| Ctrl Z mientras se escribía la fila de una alternativa | Media-baja | Ctrl Z y Ctrl Y esperan al cambio de estado; las filas se escriben en cola |
| Recuperar a la vez dos piezas con la misma fila daba un aviso falso | Baja | La misma fila, una vez por paso |
| La tabla «Alternativas descartadas» dentro de un comentario contaba | Baja | Se saltan comentarios y bloques de código |
| Al devolver fichas tras un fallo, la pestaña Ficha no se releía | Baja | La vuelta cuenta como escrita |

Queda como informativo: el enlace de la línea no filtra C1 ni bidi (solo se usa para abrir Obsidian), nombres reservados de Windows (CON, NUL) y el `.tmp` que puede quedar si se corta la luz (ya pasaba antes). Al devolver una ficha tras un fallo se escribe el valor de la regla 9 de antes, no el texto antiguo literal (como en la spec 006).

## Observación
- En «Si lo dejas así…», una escena que solo cambió de época sale como «Cambió su nota» (la frase genérica de la spec 005). La spec no pide otra; se puede afinar en una spec futura.

## A mano (pendiente del autor)
1. En la app, con una copia de la serie: arrastrar escenas entre épocas y comprobar en Obsidian que solo cambia `mundo`.
2. Editar un apartado en la pestaña Ficha y comprobar en Obsidian el resto de la nota y la línea del Log.
3. Descartar una escena de un arco y ver la fila en «Alternativas descartadas»; recuperarla y ver que se va.
4. Poner a mano un estado antiguo («en revisión») en una ficha y confirmarlo desde la app.
5. Abrir la serie con la v1.0 después de todo lo anterior.
