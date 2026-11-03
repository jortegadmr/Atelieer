# Tareas — Spec 006 «¿Y si…?»

> Tareas de 20-30 min, en orden. Una cada vez: tests primero (solo la lógica, el disco, el canon y la v1.0), `npm run verificar`, marcar, commit.
> Rama `006-y-si`; al acabar se junta en `main`. Sin cambios en `src-tauri/`, en el formato de las notas de las piezas ni en el de `guia.md`.
> Tests en `tests/variantes/` (espejo de `src/lib/variantes/`).

## Bloque 1 · Núcleo y guardado (TypeScript puro, con tests)
- [x] T1. Partir `Sesion.aplicar` en `ponerCambio` y `persistir`; constructor `protected`; `GuardadoVisible` y `guardadoVisible`. Sin cambiar nada más.
      Hecho cuando: los 633 tests siguen en verde y `svelte-check` sin errores.
- [x] T2. `variantes/tipos.ts`, `nombres.ts` (`nuevoIdVariante`, nombre por defecto, limpiar nombre y porqué) (RF-2, RF-2b, RF-41).
      Hecho cuando están en verde: «nombre por defecto con fecha y « (2)» si ya existe»; «recorta a 120 y a 500 y lo dice»; «saltos y caracteres de control pasan a espacios»; «nuevoIdVariante no repite».
- [x] T3. `formato.ts`: leer y escribir la nota de la variante, con la valla variable (RF-9).
      Hecho cuando están en verde: «ida y vuelta exacta con campos desconocidos, crudos y texto con ~~~»; «pieza nueva sin base y a la papelera»; «solo la cabecera sin leer los bloques».
- [x] T4. `formato.ts`, validación (Seguridad).
      Hecho cuando están en verde: «ev-../../x se rechaza»; «tipo falso, id distinto del de la nota, id repetido, va- que no casa con el fichero, estado raro y fechas raras: apartada con su motivo»; «más de 5 MB: apartada sin analizar».
- [x] T5. `AlmacenVariantes` (listar cabeceras, leer, un solo camino de escritura en cola, `CambioFuera`, `aPapelera`, conflictos) y vigilancia de `_variantes/` (RF-1, RF-9, RF-26, casos límite).
      Hecho cuando están en verde: «lista solo cabeceras»; «dos guardados seguidos no se pisan»; «si cambió fuera, no escribe y lo dice»; «vacía a la papelera, nunca borrada»; «el conflicto de Proton se asocia a su variante»; «la vigilancia manda _variantes/ al segundo oyente, ignora lo propio y el repaso de 10 s lo ve».
- [x] T6. Congelar `almacen.ts`, `instantaneas.ts`, `fs.ts` y `conflictos.ts` de la v1.0 en `tests/compat/v1/`; compatibilidad con `_variantes/` (RNF v1.0).
      Hecho cuando están en verde: «la v1.0 abre igual la serie con _variantes/»; «la instantánea de la v1.0 no la incluye y restaurar no la toca»; «las instantáneas de la v2, tampoco».

## Bloque 2 · La sesión de la variante (con tests)
- [x] T7. `quedaria.ts` (`modeloQuedaria`, `seguirSerie`, `sacarDeVariante`) y `referencias.ts` (def.).
      Hecho cuando están en verde: «cómo quedaría = serie + variante»; «lo que la variante no toca sigue a la serie»; «la pieza que sale queda con lo de la serie de ahora»; «referenciasDe cubre todos los campos de referencia de tipos.ts»; rendimiento de abrir (300 ms) y seguir (20 ms) con la serie grande.
- [x] T8. `SesionVariante`: abrir, `aplicar` + `persistir` (base normalizada, sale si vuelve a su base, `sitios`), escritor, `cerrada` (RF-5, RF-8, RF-9, RF-11).
      Hecho cuando están en verde: «editar, crear, mover, papelera, Lo sé, estados y canon no escriben en la serie, la wiki ni el Log»; «escribir y borrar no deja nada»; «una base de una nota con formato de Obsidian no da choque»; «una variante cerrada no aplica nada»; «una edición en menos de 10 ms».
- [x] T9. `SesionVariante`: métodos sobrescritos (`cambiarEstado`, `pasar` con nombre, `leerWiki`, `revisarFichas`, `crearFicha`, `desbloquear`, `avisosAlVolver`) y deshacer propio con `meta` en el historial (RF-10, RF-12).
      Hecho cuando están en verde: «el deshacer de la variante no toca el de la serie»; «leerWiki desde la variante no crea piezas en ella»; «crear ficha dice Sal de la variante»; «deshacer y rehacer devuelven base, pisa y sitios».
- [x] T10. `Sesion.edicionBloqueada` y Ctrl I a la serie (RF-8b, RF-15).
      Hecho cuando están en verde: «con la edición bloqueada no se edita, ni Lo sé, ni Ctrl Z; la revisión de fichas sí sigue»; «Ctrl I en nivel episodio va a ese episodio de la serie, no a la bandeja, y su Deshacer también»; «si el episodio solo existe en la variante, la idea sube a su temporada».

## Bloque 3 · Abrir, ver y aparcar (interfaz, en el navegador)
- [x] T11. Estado de la app: `sesionSerie`, `variante`, `viendoAhora`, abrir, nueva, probar otra versión, aparcar (con RF-26 y RF-27), renombrar; operaciones asíncronas que guardan la sesión (RF-2 a RF-6, RF-16, RF-25 a RF-27).
      Hecho cuando: test de estado «aparcar una vacía la manda a la papelera; al abrir la serie, también»; «abrir otra aparca la abierta»; y en el navegador, abrir, cambiar algo y aparcar con la serie de prueba.
- [x] T12. Botón «¿Y si…?», `MenuVariantes` (nueva y aparcadas), `BarraVariante` (nombre, frase, Aparcar variante), tono `ysi-on` (RF-1, RF-2b, RF-7).
      Hecho cuando: en el navegador, la barra y el menú se ven y se usan con el teclado, contraste ≥ 4,5:1 en los dos temas (`tests/contraste.test.ts` con `.ysibar`).
- [x] T13. «Ver ahora / Ver cómo quedaría», aviso de solo lectura en el panel, nota de canon en la variante, «Sal de la variante para…» en instantáneas, guía, papelera, otra serie y crear ficha (RF-11 a RF-16).
      Hecho cuando: test «cambiar entre Ahora y Cómo quedaría en menos de 100 ms»; en el navegador, ida y vuelta en cada vista (serie, temporada, episodio, Tramas, Comprobar, Guía) sin restos de la otra sesión.
- [x] T14. «Probar otra versión» y «Versiones (N)» en el panel (RF-3, RF-4).
      Hecho cuando: test «Versiones = aparcadas creadas desde la pieza o que la cambian, por la cabecera»; en el navegador, dos versiones de una pieza y abrir cada una.

## Bloque 4 · Comparar
- [x] T15. `diferencias.ts` y las etiquetas «ahora / quedaría» en las frases de la 005 (RF-17, RF-20, RF-21).
      Hecho cuando están en verde: grupos y orden; piezas de la variante y afectadas; avisos que saltarían y que dejarían de avisar; cifra; «las frases de la 005 no cambian»; rendimiento (50 ms).
- [x] T16. Pestaña «¿Y si…?» (`PestanaYSi`) con sus grupos, cifra, foco y «Lado a lado» (`LadoALado`) (RF-19 a RF-23).
      Hecho cuando: en el navegador, la pestaña con una variante real, «y N más», foco al quitar una entrada y lado a lado con Esc.
- [x] T17. Marcas de acento en el visor, con «ahora» y «quedaría», y las de la 005 si «Si lo dejas así…» está abierta (RF-17, RF-18).
      Hecho cuando: test de `marcasVisor` con las dos etiquetas; en el navegador, mover una escena en la variante y ver «ahora 4» y, en «Ver ahora», «quedaría 5».
- [x] T18. `quitar.ts` y «Quitar de la variante» con su confirmación (RF-24, RF-24b).
      Hecho cuando están en verde: pieza sola; temporada nueva con lo que contiene; escena movida entre dos episodios con sus renumeradas; «Lo sé»; serie; lista del contenedor; «no peor que ahora» con huecos previos; deshacer devuelve base y sitios.

## Bloque 5 · Choques, aplicar y descartar
- [x] T19. `choques.ts` (en el modelo y en disco) e icono de choque en la barra, el menú y «Versiones» (RF-28, RF-29).
      Hecho cuando están en verde: los tres tipos; «por dentro»; formato de Obsidian no es choque; `wiki_mtime` no cuenta; renumerar en la serie es choque de sitio; id que ya existe; choques de 50 variantes en menos de 300 ms.
- [x] T20. `traer.ts`, «Traer lo de ahora» y «Pisa lo de ahora» (RF-30, RF-30b, RF-30c, RF-31).
      Hecho cuando están en verde: a tres bandas por campo, con `crudos` y en `extra`; `pisa` y su salida; sitio con vecina y sin ella, sin repetidos; deshacer «Traer» vuelve a dar choque.
- [x] T21. `almacen.escribirTodo` y `comprobarPasar` (RF-34b, RF-37).
      Hecho cuando están en verde: «todo o nada con un fallo a medias: lo escrito vuelve, lo de la papelera vuelve, lo creado a la papelera»; «el texto de antes es el del disco»; «una ruta fuera de la serie no se escribe»; «comprobarPasar dice nombre repetido sin escribir».
- [x] T22. `planAplicar` y `Sesion.aplicarVariante`, pasos 1 a 6 y 8: choques en disco, canon, wiki, instantánea, notas, paso de deshacer con `enPapelera`, cerrojo (RF-32 a RF-37, RF-39, RF-40).
      Hecho cuando están en verde: «queda en disco Cómo quedaría exacto»; «un cambio de fuera entre comprobar y escribir no aplica nada»; «canon sin desbloquear no aplica; con Desbloquear y aplicar, sí»; «sin instantánea no se aplica»; «una edición del autor durante el aplicar se rechaza»; «las otras variantes pasan a tener choques»; «la v1.0 lee lo escrito»; 200 piezas en menos de 2 s.
- [x] T23. `aplicarVariante`, paso 7: wiki después de las notas (estados de fichas, fichas nuevas con su nombre y su Log, enlace en el mismo paso) y su vuelta atrás (RF-37b).
      Hecho cuando están en verde: «pasar a borrador en la variante crea la ficha, su Log y el enlace al aplicar»; «si la wiki falla, las notas y las fichas vuelven y se dice lo que queda».
- [x] T24. Deshacer y rehacer «Aplicar»: `alVolverVariante` con `cambiada` (RF-38).
      Hecho cuando están en verde: «Ctrl Z deja la variante aparcada y saca lo de la papelera»; «Ctrl Y la deja aplicada»; «Ctrl Y tras editar la variante deshecha la deja aparcada y lo dice»; «si no se puede escribir la nota de la variante, se dice y se reintenta».
- [x] T25. Aplicar en la interfaz: confirmación con resumen en la barra, en el menú y en «Versiones»; choques sin aparcar; «Desbloquear y aplicar»; aviso al acabar (RF-32 a RF-35, RF-39).
      Hecho cuando: en el navegador, aplicar con y sin choques, desde la barra y desde el menú, con canon, y Ctrl Z.
- [x] T26. Descartar con su porqué, «Aplicadas y descartadas», Recuperar y Ver (RF-41 a RF-44).
      Hecho cuando: test «descartar y recuperar conservan los cambios y sus choques»; en el navegador, descartar, recuperar y ver una aplicada en lado a lado.

## Bloque 6 · Cierre
- [x] T27. `docs/diseno.md` (barra, fantasma, pestaña), `docs/inventario-v1.md` y `validacion.md` con «A mano» (criterios).
      Hecho cuando: documentos al día y `verificar` en verde.
- [x] T28. Revisión independiente (código y seguridad), arreglos con test, validación RF a RF y juntar en `main`.
      Hecho cuando: sin críticos abiertos, `verificar` en verde en `main`.
