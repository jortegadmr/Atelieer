# Validación — Spec 010 «Análisis: lente, presencia, quién sabe qué y esquema»

> 2026-10-22 · rama `010-analisis` · `npm run verificar`: 107 archivos, 984 tests en verde, 0 errores ni avisos de tipos, compilación correcta. La interfaz se comprueba en el navegador (decisión del autor en la 003), con la serie de prueba en memoria: cada tarea en su momento (T12-T20) y todo junto en la T21.

## A. Lente

| RF | Prueba | Resultado |
|---|---|---|
| 1 | Navegador: botón «Lente» en la barra; el buscador lista personajes, arcos y secretos con su tipo; flechas, Intro y Esc (T12). Test «descartados no salen» | ✅ |
| 2 | Navegador: «Enfocar» con clic derecho, tecla de menú y Mayús F10 en arcos de Tramas y de la rejilla, secretos (lista y panel), personajes de «Lo conocen» y nombres de Presencia; Esc cierra el menú y el foco vuelve (T15, T16, T18) | ✅ |
| 3 | Navegador: elegir otro objetivo cambia la lente (Nando → Telmo → El eco) | ✅ |
| 4 | Navegador: atenuado con color (`--bg` y `--ink-3`) y «fuera de la lente» para el lector en visor (temporadas, episodios, actos), rejilla, línea de la historia y las tres pestañas (T13, T14, T18-T20). Tests «fueraDeLente…», «arco: sus escenas, las de sus tramos y la fila entera», «secreto: escenas de pistas y episodios marcados sin escena», «Telmo, [[Telmo]] y telmo son uno», «una escena escrita con el alias…», «solo en Lo conocen cuenta», «con variante existe si existe en uno de los dos» | ✅ |
| 5, 7 | Navegador: «Lente: Nando · personaje» con «Quitar lente» (T12) | ✅ |
| 6 | Test «la lente no escribe nada en disco» | ✅ |
| 8 | Test «queHaceEsc: capa, campo, arrastre, lente y subir, en ese orden»; navegador: Esc con el menú abierto lo cierra y deja la lente (T15) | ✅ |
| 9 | Test «se mantiene al cambiar de vista y de nivel…» | ✅ |
| 10 | Tests «borrar el arco enfocado quita la lente con su nombre», «leer la wiki a medias no quita la lente; leída, sí y dice por qué» | ✅ |
| 11 | Test «sin nada que ver: lo dice si nada visible está relacionado»; navegador: aviso junto a la lente; en Análisis, con la temporada elegida (T18) | ✅ |
| 11b | Test «…cerrar la serie la quita»; la lente vive solo en memoria (`estado.lente`) | ✅ |

## B. Vista Análisis

| RF | Prueba | Resultado |
|---|---|---|
| 12 | Navegador: «Análisis» debajo de «Línea de la historia», con tres pestañas y flechas entre ellas (T17) | ✅ |
| 13 | Test «recuerda la pestaña en la sesión; abrir otra vez la serie vuelve a Presencia» | ✅ |
| 14 | Test «arranca en la temporada del visor; en la serie, la primera; después no la sigue»; navegador: el selector cambia las tres pestañas (T3 vacía) | ✅ |
| 15 | Las pestañas leen `sesion.modelo` (lo que se ve) y dependen de `estado.version`; navegador: cambiar «Lo sabe desde» y el estado del secreto en el panel pone la tabla al día al momento | ✅ |
| 16 | Componente `Analisis.svelte`: «Aún no hay temporadas» si no hay temporada | ✅ |

## C. Presencia

| RF | Prueba | Resultado |
|---|---|---|
| 17-20 | Tests «cuenta escenas vivas, no bandeja ni aparcadas», «alias en la misma fila», «orden por total y nombre»; navegador: 5 filas, T01E01-T01E08, totales de escenas y episodios (T18) | ✅ |
| 21 | Tests «primer y último de 6: ausencia de 4», «episodios sin escenas no cuentan ni cortan», «un solo episodio, sin ausencias»; casilla con raya de aviso, `title` y texto para el lector | ✅ |
| 22 | Navegador: clic en una casilla lleva el visor a T01E02 | ✅ |
| 23 | Navegador: clic en «Nando» pone la lente; «Enfocar» en «Telmo» también | ✅ |
| 24 | Navegador: con Nando, 4 filas atenuadas; con El eco, 3 columnas (15 casillas) | ✅ |
| 25 | Componente: «Ninguna escena de esta temporada tiene personajes» | ✅ |

## D. Lo sabe desde

| RF | Prueba | Resultado |
|---|---|---|
| 26 | Navegador: selector «Lo sabe desde (Nando)» con «Sin fecha» y los episodios con código y título (T5) | ✅ |
| 27 | Tests «poner y quitar una fecha deja las demás entradas igual», «sin fechas se borra la propiedad», «la propiedad viaja en la nota y vuelve igual», «canon bloqueado no cambia la fecha», «en la variante no escribe en la serie», «una fecha cambiada en la app no pisa otro campo desconocido cambiado fuera»; «Si lo dejas así…»: tests de `lo-sabe-desde` | ✅ |
| 28 | Tests «quitar a un personaje quita su fecha; renombrar la pierde», «un paso de Ctrl Z al quitar personaje y fecha» | ✅ |
| 29 | Tests «un número, una lista o un id roto cuentan como Sin fecha y se conservan», «`conocen_desde` que no es lista no se toca nunca», «huérfana de la v1.0 se conserva y vuelve con el personaje» | ✅ |
| 29b | Test «`__proto__` y `constructor` funcionan como cualquier nombre» | ✅ |
| 30 | Tests «la fecha va en la columna de su cabecera aunque cambie el orden», «sin esa columna no se escribe en otra», «`[[X\|alias]]` y saltos de línea escapados», «Sin fecha deja la celda vacía» | ✅ |

## E. Quién sabe qué

| RF | Prueba | Resultado |
|---|---|---|
| 31 | Test «orden de filas: por revelación y título; sin revelar al final; descartados fuera»; navegador: tabla secreto × episodio (T19) | ✅ |
| 32 | Tests «revelado en temporada anterior…», «pistas acumuladas por toda la serie», «solo falsas», «pista en escena aparcada o en la bandeja no cuenta…», «marcada solo con episodio cuenta», «episodio marcado manda…», «revelación sin episodio nunca Revelado»; navegador: «Pistas: 2 · Falsas: 1» y «●» de nuevo con texto para el lector | ✅ |
| 33 | Test «fecha más temprana si se repite; los que se enteran, marcados»; navegador: Nando desde T01E04, en negrita en E04 y «se entera aquí» para el lector | ✅ |
| 34 | Test «sin fecha y con fecha en episodio sin temporada van aparte»; navegador: «Lo conocen sin fecha: El Alcalde» | ✅ |
| 35 | Navegador: con Nando, el otro secreto atenuado; con arco, las casillas como en Presencia | ✅ |
| 36 | Navegador: casilla lleva a T01E04; título abre el secreto en el panel | ✅ |
| 37 | Componente: «Aún no hay secretos» | ✅ |
| Caso límite | Secreto aparcado marcado «(aparcado)»: faltaba, arreglado en la T21 y comprobado en el navegador | ✅ |

## F. Esquema

| RF | Prueba | Resultado |
|---|---|---|
| 38 | Tests «actos en orden y Sin acto al final», «nunca lleva La verdad», «textoCarga: como la tarjeta…»; navegador: episodio → acto → «1. Telmo llega al pueblo — Seguridad · + → −» (T20) | ✅ |
| 39, 40 | Test «descartadas fuera, aparcadas marcadas, bandeja al final» | ✅ |
| 41 | Test «#, ![[, \|, <b>, %%, &, - inicial, \r, U+2028 y bidi quedan neutralizados en una línea»; navegador: con el portapapeles disponible, «Esquema copiado al portapapeles» y el Markdown con títulos y lista | ✅ |
| 41b | Navegador: el panel del navegador niega el portapapeles → caja con el texto entero seleccionado y con el foco, y el aviso «cópialo con Ctrl C». Sin dependencias ni permisos nuevos | ✅ |
| 42 | Navegador: clic en «Primera confidencia» la abre en el panel, pestaña «Editar» | ✅ |
| 43 | Navegador: con Nando, 12 de 15 escenas atenuadas | ✅ |
| 44 | Test «temporada vacía»; navegador: T03 dice «Esta temporada está vacía» | ✅ |

## No funcionales

| Requisito | Prueba | Resultado |
|---|---|---|
| Rendimiento | Tests «presencia, quién sabe qué y esquema con 300 escenas, 50 personajes y 30 secretos < 200 ms», «poner la lente con 300 escenas < 100 ms» | ✅ |
| Integridad | Tests de `conocen-desde` y `sesion-conocen-desde`; la lente y la vista no escriben | ✅ |
| Compatibilidad v1.0 | Tests «la v1.0 ve Lo conocen igual», «tras editar en la v1.0 las fechas siguen por nombre», «sin fechas, la nota es idéntica a la de antes» | ✅ |
| Accesibilidad | Tablas con `th scope=row/col`; casillas y nombres son botones; ausencias, «nuevo», «se entera» y lente con texto para el lector; pestañas con flechas | ✅ |
| Sin desplazamiento a lo ancho | Navegador a 900 px: con la tabla forzada a 2000 px, la página sigue en 900 (`.caja-tabla` con `position:relative`, arreglado en la T21). Aparte, la barra superior ya desbordaba con el panel abierto a 1024 px (de antes de esta spec; ver «Pendiente») | ✅ |

## Revisiones

Dos revisores independientes (sin la conversación), sobre `git diff main...HEAD`.

**Seguridad y privacidad:** nada crítico, alto ni medio. Sin red ni telemetría, sin permisos nuevos de Tauri, sin `{@html}`, la lente no escribe, `__proto__` bien tratado, escape del esquema completo.

| Bajo | Qué se hizo |
|---|---|
| La celda de la tabla de personajes al pasar a la wiki dejaba pasar `\r`, U+2028 y bidi | Arreglado: `celda` usa `enUnaLinea`. Test «retorno suelto, U+2028 y bidi en una celda quedan en una línea» |
| Pasar a la wiki vacía las demás columnas de la tabla de personajes | Así desde la v1 y lo pide RF-30; cambiarlo es decisión de spec. Pendiente para el autor |
| `__proto__` en `extra` al juntar cambios | Sin efecto práctico (la app solo toca `conocen_desde`). Sin cambio |

**Código:**

| Hallazgo | Qué se hizo |
|---|---|
| 1. Los textos para el lector ensanchaban la página con tablas anchas | Arreglado (`position:relative` en `.caja-tabla`); navegador a 900 px |
| 2. Ausencia larga solo con color | Arreglado: «—» en la casilla y leyenda bajo la tabla |
| 3. Foco perdido al cerrar el menú en «Lo conocen» | Arreglado: vuelve al botón que lo tenía; navegador con Mayús F10 y Esc |
| 4. «Enfocar» con teclado en piezas bloqueadas (botones desactivados) | Pendiente: con ratón sí funciona; con teclado pide rehacer el campo. Anotado abajo |
| 5. Aviso de RF-11 solo con el nivel del visor | Arreglado: cuenta el visor y, en Análisis o la línea, su temporada o la serie |
| 6. Con lente no se podía cambiar a otra sin quitarla | Arreglado: la pastilla abre el buscador; navegador Nando → Telmo |
| 7. Aviso de RF-10 cortado sin `title` | Arreglado: `title` con el texto entero |
| 8. Fecha rota: «Sin fecha» no lanzaba el cambio | Arreglado: opción «Fecha no válida» desactivada mientras lo está |
| 9. Lente desde un alias: nombre y clave | Arreglado: la pastilla dice el nombre del personaje y, si la wiki cambia los alias, la clave se rehace antes de quitar la lente |
| 10. «Nuevo» tras la revelación | Arreglado. Test «pista después de la revelación no se marca como nueva» |
| 11. Pista de escena borrada distinta en la lente y en Quién sabe qué | Arreglado. Test «secreto: pista de una escena borrada cuenta por su episodio marcado…» |
| 12. «Se entera aquí» solo en negrita | Arreglado: «●» tras el nombre y leyenda |
| 13. El buscador de la lente no anunciaba la opción activa | Arreglado: `combobox` con `aria-activedescendant` |

## Pendiente fuera de esta spec

- «Enfocar» con el teclado en una pieza bloqueada o en «ver ahora» (los nombres de «Lo conocen» están desactivados). Con ratón funciona.
- Pasar a la wiki vacía las columnas de la tabla de personajes que la app no rellena (como en la v1). ¿Conservar lo escrito a mano? Decisión del autor.

- La barra superior no cabe con el panel abierto en ventanas de 1024 px (los textos «Lente», «¿Y si…?» y «+ Idea» solo se esconden por el ancho de la ventana, no por el del contenido). Viene de antes de la 010; el botón «Lente» lo agrava un poco.
