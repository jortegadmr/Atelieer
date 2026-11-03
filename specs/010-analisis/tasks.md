# Tareas — Spec 010 «Análisis: lente, presencia, quién sabe qué y esquema»

> Tareas de 20-30 min, en orden. Una cada vez: tests primero (solo disco, wiki, canon, variante, v1.0 y los cálculos que deciden lo que se ve), `npm run verificar`, marcar, commit.
> Rama `010-analisis`; al acabar se junta en `main`. Sin cambios en `src-tauri/` ni dependencias nuevas.
> La interfaz se comprueba en el navegador (`npm run dev`, serie de prueba en memoria).
> Partidas de nuevo tras la revisión independiente del plan.

## Bloque 1 · «Lo sabe desde»
- [x] T1. `modelo/conocen-desde.ts`: `fechasDe`, `fechaVista`, `ponerFecha`, `alCambiarConocen` (RF-26 a RF-29b).
      Hecho cuando están en verde: «poner y quitar una fecha deja las demás entradas igual (por valor)»; «sin fechas se borra la propiedad»; «un número, una lista o un id roto cuentan como Sin fecha y se conservan»; «`conocen_desde` que no es lista no se toca nunca»; «quitar a un personaje quita su fecha; renombrar la pierde»; «huérfana de la v1.0 se conserva y vuelve con el personaje»; «`__proto__` y `constructor` funcionan como cualquier nombre»; «personaje repetido: la primera entrada».
- [x] T2. Compatibilidad v1.0 en `tests/compat`: escribir con la v2, leer y reescribir con el lector congelado (reordenando y quitando en `conocen`), releer con la v2.
      Hecho cuando están en verde: «la v1.0 ve Lo conocen igual»; «tras editar en la v1.0 las fechas siguen por nombre»; «sin fechas, la nota es idéntica a la de antes».
- [x] T3. `CampoVisto.partes` y `expandir`; «Lo sabe desde» en `campos-vistos.ts`; usarlo en «Si lo dejas así…», `consecuencias/vistas.ts`, `choqueDePieza` y `lado-a-lado.ts` (RF-27).
      Hecho cuando están en verde: «Si lo dejas así dice Lo sabe desde (Telmo): E3 → E5»; «Telmo cambiado fuera y Ana en la variante: Telmo solo en la serie, no de los dos lados»; «Telmo en los dos lados: de los dos lados»; «lado a lado tiene una fila por personaje».
- [x] T4. Sesión: cambiar `conocen` y fechas por `editar` en un paso; `juntar` junta `extra` subclave a subclave (RF-27, RF-28).
      Hecho cuando están en verde, con la sesión y el disco en memoria: «un paso de Ctrl Z al quitar personaje y fecha»; «canon bloqueado no cambia la fecha»; «en la variante no escribe en la serie»; «una fecha cambiada en la app no pisa otro campo desconocido cambiado fuera».
- [x] T5. Interfaz: `CampoWiki` con snippet `debajo` y `#each` por posición; selector «Lo sabe desde» en `EditarSecreto` agrupado por temporada, con «Sin fecha» primero, aviso de fecha rota y desactivado si está escrito de otra forma (RF-26, RF-29).
      Hecho cuando en el navegador el selector funciona con teclado, un personaje repetido no rompe el campo y el aviso sale.
- [x] T6. `wiki/pasar.ts`: `tablaPorColumnas` y la columna «Lo sabe desde» (RF-30).
      Hecho cuando están en verde: «la fecha va en la columna de su cabecera aunque cambie el orden»; «sin esa columna no se escribe en otra»; «`[[X|alias]]` y saltos de línea escapados»; «Sin fecha deja la celda vacía».

## Bloque 2 · Cálculos
- [x] T7. `vistas/lente.ts`: `alias`, `clavePersonaje`, `personajesDeSerie`, `objetivosLente`, `relacion` (con casillas de la rejilla), `existeLente`, `sinNadaQueVer` (RF-1, RF-4, RF-10, RF-11, definiciones).
      Hecho cuando están en verde: «Telmo, [[Telmo]] y telmo son uno»; «una escena escrita con el alias entra en la lente del personaje»; «solo en Lo conocen cuenta»; «descartados no salen»; «secreto: escenas de pistas y episodios marcados sin escena»; «con variante existe si existe en uno de los dos»; poner la lente con 300 escenas < 100 ms.
- [x] T8. `vistas/presencia.ts` (RF-17 a RF-21).
      Hecho cuando están en verde: «cuenta escenas vivas, no bandeja ni aparcadas»; «alias en la misma fila»; «orden por total y nombre»; «primer y último de 6: ausencia de 4»; «episodios sin escenas no cuentan ni cortan»; «un solo episodio, sin ausencias».
- [x] T9. `vistas/quien-sabe.ts` (RF-31 a RF-34).
      Hecho cuando están en verde: «revelado en temporada anterior: Revelado en todas»; «pistas acumuladas por toda la serie»; «solo falsas: Falsas: M»; «pista en escena aparcada o en la bandeja no cuenta, aunque lleve episodio marcado»; «marcada solo con episodio cuenta»; «episodio marcado manda sobre el de la escena»; «revelación sin episodio nunca Revelado»; «fecha más temprana si se repite»; «sin fecha y con fecha en episodio sin temporada van aparte»; «alias en Lo conocen es el mismo personaje»; orden de filas con empate.
- [x] T10. `textoCarga` en `vistas/textos.ts` (y `Carga.svelte` lo usa); `vistas/esquema.ts` con `actos.ts`; `textoSeguro` en `wiki/md.ts` (RF-38 a RF-41).
      Hecho cuando están en verde: «actos en orden y Sin acto al final»; «descartadas fuera, aparcadas marcadas, bandeja al final»; «`#`, `![[`, `|`, `<b>`, `%%`, `&`, `- ` inicial, `\r`, U+2028 y bidi quedan neutralizados en una línea»; «nunca lleva La verdad»; rendimiento de T8-T10 con 300 escenas, 50 personajes y 30 secretos < 200 ms; y la tarjeta del visor se ve igual (navegador).

## Bloque 3 · Lente en la interfaz
- [x] T11. Estado de la lente: `lente`, `relacionLente`, `ponerLente`, `quitarLente`, quitar sola solo con la wiki cargada, limpiar al cerrar la serie; `queHaceEsc` en `lib/app/` y `Carcasa` lo usa (RF-3, RF-6 a RF-11b).
      Hecho cuando están en verde: «la lente no escribe nada en disco»; «queHaceEsc: capa, campo, arrastre, lente y subir, en ese orden»; «leer la wiki a medias no quita la lente».
- [x] T12. Botón «Lente», `BuscarLente.svelte` e indicador en `BarraSuperior` con avisos (RF-1, RF-5, RF-7, RF-11).
      Hecho cuando en el navegador: se busca y se pone con teclado; la pastilla dice nombre y tipo; «Quitar lente» la quita; a 900 px la barra no ensancha la página.
- [x] T13. Clase `fuera-lente` y atenuar en el visor (RF-4, RF-9).
      Hecho cuando en el navegador, con lente de personaje, de arco y de secreto, el visor atenúa escenas, actos y episodios con texto para el lector, y se mantiene al cambiar de nivel.
- [x] T14. Atenuar en la rejilla y la línea de la historia (RF-4, RF-9).
      Hecho cuando en el navegador la rejilla atenúa casillas y filas, y la línea, escenas, con los tres tipos de lente y al cambiar de vista.
- [x] T15. `MenuContextual.svelte` (clic derecho, tecla de menú, Mayús F10, como capa) y «Enfocar» en Tramas y la rejilla (RF-2).
      Hecho cuando en el navegador «Enfocar» sale en un arco con ratón y con teclado, y Esc cierra el menú sin quitar la lente.
- [x] T16. «Enfocar» en secretos (`temporada/Secretos.svelte`, panel) y en los personajes de `CampoWiki` (RF-2).
      Hecho cuando en el navegador «Enfocar» funciona en un secreto y en un personaje de una escena y de «Lo conocen».

## Bloque 4 · Vista «Análisis»
- [x] T17. `Vista` «analisis», menú, `Analisis.svelte` con pestañas y selector de temporada (RF-12 a RF-16).
      Hecho cuando en el navegador se abre desde el menú, recuerda la pestaña, arranca en la temporada del visor (la primera si el visor está en la serie) y no la sigue después; sin temporadas lo dice.
- [x] T18. Pestaña Presencia, con «Enfocar» en la fila (RF-2, RF-17 a RF-25, RF-11 en Análisis).
      Hecho cuando en el navegador la tabla enseña casillas, totales y ausencias con texto; clic en casilla lleva el visor; clic en nombre y «Enfocar» ponen la lente; la lente atenúa.
- [x] T19. Pestaña Quién sabe qué (RF-31 a RF-37).
      Hecho cuando en el navegador cada casilla dice lo del público y quién lo sabe, con lo nuevo marcado; clic abre episodio o secreto; la lente atenúa.
- [x] T20. Pestaña Esquema y Copiar con la caja de respaldo (RF-38 a RF-44).
      Hecho cuando en el navegador copia el Markdown, clic abre la escena en Editar, la caja sale si el portapapeles falla (forzado) y la lente atenúa.

## Bloque 5 · Cierre
- [x] T21. `validacion.md` RF a RF, revisión independiente de código y de seguridad, arreglos con test; PRD, inventario (lente también de secretos), `docs/diseno.md` al día.
      Hecho cuando `npm run verificar` en verde, revisiones recogidas y la rama lista para juntar en `main`.
