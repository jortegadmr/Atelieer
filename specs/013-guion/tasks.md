# Tareas — Spec 013 «Guion: escribir las escenas»

> Tareas de 20-30 min, en orden. Una cada vez: tests primero (solo disco, papelera, canon, v1.0, pérdida de texto y lo que decide qué se copia), `npm run verificar`, marcar, commit.
> Rama `013-guion`; al acabar se junta en `main`. Sin cambios en `src-tauri/` ni dependencias nuevas.
> La interfaz se comprueba en el navegador (`npm run dev`, serie de prueba en memoria). Los tests usan solo `FsMemoria`; nunca la vault real.
> Revisadas por un revisor independiente (30 puntos recogidos). Pendientes de aprobación del autor.

## Bloque 0 · Spike
- [x] T1. **Spike del editor controlado** (RF-5, RF-13, RNF-10). Una página de prueba en `npm run dev` (Chromium): `contenteditable` con `beforeinput` sobre un array de líneas, selección entre DOM y modelo, teclas muertas y acentos, pegado, Ctrl Z propio, flechas entre dos bloques. Se pide al autor que lo pruebe en el Windows (WebView2, `npm run tauri dev`) y en el Mac Intel (WebKit).
      Hecho cuando el autor ha contestado «sigue» o «alternativa de D9». Si no es fiable se **para**. Resultado (2026-10-29): el autor probó el spike en Windows (Edge) y «cumple todo»; la prueba en Safari del Mac Intel queda pendiente (se repite en T24 «A mano» con el editor real). Resultado en `validacion.md`. El código del spike no se queda.

## Bloque 1 · Datos del guion
- [x] T2. `guion/tipos.ts` (con `MEDIDAS`) y `guion/formato.ts`: `leerGuion`, `escribirGuion` (RF-27, RF-31, RNF-3, RNF-12). `FORMA_ESCENA` se exporta de `modelo/viene-de.ts`.
      Hecho cuando están en verde: «ida y vuelta idéntica»; «cabecera ajena se conserva»; «LF y CRLF se leen igual y se conserva el estilo»; «control, bidi y `\0` vuelven igual»; «versión 2 → solo lectura»; «cabecera rota → ilegible con motivo»; «más de 1 MB → solo lectura»; «con guion = algún carácter no blanco»; «un id con `../` o sin la forma de `FORMA_ESCENA` no construye ruta».
- [x] T3. `guion/referencias.ts`: `partir`, `unir`, `resolver`, `agrupar` y `Wiki.listar` (RF-11, RF-12, RF-15, RF-17, RF-19).
      Hecho cuando están en verde: «`[[Vera]]`, `[[Vera|la Gaviota]]` y con ruta, ida y vuelta»; «`[[` sin cerrar es texto»; «`[[../../x]]` no resuelve a nada»; «dos fichas con el mismo nombre se distinguen por ruta»; «sin ficha → null y no impide guardar»; «una ficha nueva con ese nombre la resuelve»; «`agrupar` quita `(V.O.)`, tildes y caja»; «`Wiki.listar` con consulta vacía da las primeras y con texto filtra por «contiene» sin tildes»; «lo que ofrece `listar` se resuelve luego».
- [x] T4a. `guion/lineas.ts`: `clasificar` (RF-3).
      Hecho cuando están en verde todos los casos de la tabla de reconocimiento del plan, incluidos `INT TALLER`, `INT.TALLER`, `INT/EXT. COCHE`, `UN GOLPE.`, `...y entonces`, `.5 segundos`, y la ida y vuelta de cada prefijo forzado (RF-9: un texto plano pegado se reconoce igual).
- [x] T4b. `guion/lineas.ts`: `siguienteAlEnter`, Tab y `cambiosDeTipo` (RF-4, RF-31).
      Hecho cuando está en verde un test por cada fila de la tabla de Enter (con `tipoPendiente`, selección, principio y medio de línea), el ciclo de Tab, «un personaje pendiente escribe en mayúsculas» y `cambiosDeTipo` ante un cambio de blancos que convierte una línea en acción.
- [x] T5. `guion/paginas.ts`: `medir` (RF-8, RF-23, RF-24, RF-26, RNF-12).
      Hecho cuando están en verde: «60/35/25 car. por tipo»; «blanco entre elementos»; «55 líneas = 1 página = 60 s»; «una referencia mide su nombre»; «una palabra más larga que el ancho se parte»; «solo el encabezado ≈ 0 págs»; «500 págs → solo lectura»; «`medir` de una escena de 3 págs en < 50 ms». Se contrastan las medidas con Trelby y Slugline y se avisa al autor si difieren.
- [x] T6. `guion/codigos.ts` (RF-20 a RF-22).
      Hecho cuando están en verde: «`T01E06-S03` y `S03`»; «orden de la spec 003 con actos»; «descartar y recuperar no renumera»; «reordenar, mover y borrar renumeran el episodio»; «bandeja, escena sin episodio y episodio sin temporada → sin código»; «más de 99 escenas → 3 dígitos»; «con variante abierta, contra la serie principal»; «ningún código se escribe en disco».
- [x] T7a. `almacen/almacen-guion.ts`: cargar, guardar, cola por escena, `CambioFuera` (RF-27, RF-28, RNF-3).
      Hecho cuando están en verde, con el disco en memoria: «cargar sin fichero no crea nada»; «guion vacío sin escribir no deja rastro»; «guardar entero o nada»; «cambió fuera: no escribe y lanza CambioFuera»; «borrado por fuera: avisa una vez»; «dos guardados de la misma escena van en orden»; «ilegible: se aparta con su fecha y no se vuelve a leer».
- [x] T7b. Papelera y movimiento (RF-30, RF-34).
      Hecho cuando están en verde: «`copiaAPapelera` copia el texto que se le pasa, con `(2)` y sin pisar»; «`moverAPapelera` y `devolverDePapelera` conservan el texto»; «`esFicheroDePieza` no reconoce `_guion` y los tests actuales de papelera y deshacer siguen en verde».
- [x] T7c. `listar` (RF-29, RNF-12).
      Hecho cuando están en verde: «separa guiones, huérfanos e ignorados»; «`esConflicto` marca un `(# Edit conflict … #)` como ignorado y no se cuenta»; «un nombre que no es un id, un `.png` y un fichero de 3 MB se ignoran con aviso»; «los huérfanos se conservan». El nombre real de los ficheros «Name clash» de la vault se confirma con el autor (solo lectura) antes de ampliar `esConflicto`.
- [x] T8a. Vigilancia: `_guion` y `alCambiarGuion` (RF-28).
      Hecho cuando están en verde: «avisa de un guion cambiado fuera y no de lo que escribe la app»; «un cambio en `_guion` no llega a `alCambiar`»; «un conflicto o un nombre raro es ignorado»; «los tests actuales de vigilancia no cambian».
- [x] T8b. Instantáneas con guiones (RNF-5, RF-30).
      Hecho cuando están en verde: «la copia lleva los guiones y restaurar los devuelve»; «lo restaurado se puede recuperar de la instantánea automática»; «restaurar una copia sin guiones no toca los actuales»; «las instantáneas actuales siguen igual».
- [x] T8c. Compatibilidad con la v1.0 (RNF-2), patrón de `tests/compat-pizarra.test.ts`.
      Hecho cuando están en verde: «la v1.0 abre la serie con `_guion/` y `_papelera/_guion/` sin avisos»; «guardar, borrar y papelera de la v1.0 no los tocan»; «la v1.0 restaura un zip de la v2 con guiones sin romper ni mover nada»; «sin guiones, la serie es idéntica».
- [x] T9. `guion/guardado.ts` y `sesion.guion` (RF-27).
      Hecho cuando están en verde, con el reloj inyectado: «varios cambios seguidos, un guardado por escena»; «`vaciar` guarda todo lo pendiente»; «`Sesion.cerrar` vacía el guardado de guion»; «un fallo se enseña, conserva el texto y reintenta con el siguiente cambio»; «`Sesion.abrir` crea el almacén y enchufa `alCambiarGuion`»; «restaurar con un cambio pendiente no da CambioFuera».
- [x] T10a. Cambio por fuera sin descartar nada (RF-28).
       Hecho cuando están en verde: «ante CambioFuera la versión local se conserva y el guardado de esa escena queda bloqueado»; «Quedarme con la mía: copia de la del disco a la papelera y escribe la local»; «Usar la de fuera: copia de la local a la papelera y carga la del disco»; «Copiar la mía no cambia nada»; «dos escenas no se afectan».
- [x] T10b. Sesión: borrar, deshacer y rehacer escenas (RF-34), tras leer `sesion.aplicar` y decidir el enganche (si no hay uno limpio, se para y se pregunta).
       Hecho cuando están en verde, un test por fila de la tabla «Qué mueve el guion»: borrar una escena; borrar una temporada o un episodio; deshacer la creación; deshacer y rehacer un borrado; «Volver a como estaba»; aplicar una variante; borrado desde fuera → huérfano avisado; mover, descartar y recuperar no tocan; «si moverlo falla, el borrado se mantiene y se avisa».
- [x] T10c. Sesión: canon y variantes (RF-32, RF-33).
       Hecho cuando están en verde: «escribir el guion de una escena canon no pasa por el bloqueo»; «borrar una escena dentro de una variante no toca `_guion/`»; «con una variante abierta no se escribe nada y `EstadoGuion` lee las escenas de la serie principal».
- [x] T11. `guion/indice.ts`: `IndiceGuion` (RF-23, RF-24, RNF-4).
       Hecho cuando están en verde con el disco en memoria: «suma por episodio, temporada y serie»; «la bandeja cuenta en temporada y serie y no en episodio»; «sin guion no suma y se cuenta como falta»; «`alCambiarGuion`, mover, borrar y restaurar invalidan»; «cambiar de serie cancela»; «máximo 4 lecturas a la vez»; «“calculando” hasta terminar».

## Bloque 2 · El editor
- [x] T12a. `guion/documento.ts`: modelo y ida y vuelta (RF-5, RF-13).
       Hecho cuando están en verde: «`desdeTexto`/`aTexto` ida y vuelta idéntica con referencias y forzados»; «insertar, partir, unir y borrar»; «una referencia cuenta como una unidad y se borra de una vez»; «`tipoPendiente` no se escribe en disco».
- [x] T12b. Copia previa y pegado (RF-30, RNF-12).
       Hecho cuando están en verde, un test por gesto: «suprimir, cortar, reemplazar al pegar y deshacer que borren más de 500 caracteres piden copia con el texto de la memoria»; «borrar menos no»; «pegar algo que pase del tope se rechaza entero con aviso»; «pegar texto plano de otro programa se reconoce (RF-9)».
- [x] T12c. `guion/historial.ts` y reparto de Ctrl Z (RF-5).
       Hecho cuando están en verde: «deshacer y rehacer devuelven el documento exacto»; «escribir seguido se junta por pausa de 1 s»; «tope de 200»; «no se mezcla con el de piezas ni el de la pizarra»; «la función pura de reparto decide quién recibe Ctrl Z según el foco (campo de texto, editor, pizarra, global)».
- [x] T13a. `EditorGuion.svelte`: pintar por tipos y selección (RF-2, RF-3).
       Hecho cuando en el navegador se ven los seis tipos con sus sangrías y anchos (de `MEDIDAS`), la hoja se ve como una página de Slugline (centrada, sin cajas; se enseña una captura al autor), el cursor y la selección entre líneas se comportan, y el texto nunca lo cambia el navegador por su cuenta.
- [x] T13b. Teclado: Enter, Tab y Esc (RF-4).
       Hecho cuando en el navegador se escribe un guion corto siguiendo la tabla de Enter, Tab cambia y conserva el tipo forzado, un personaje pendiente sale en mayúsculas y Esc + Tab sale del editor con aviso.
- [x] T13c. Deshacer, pegar y composición en el editor (RF-5, RF-9).
       Hecho cuando en el navegador Ctrl Z / Ctrl Y (Cmd en Mac) deshacen el texto y no las piezas, se pega un fragmento de otro programa y se reconoce, y acentos y teclas muertas funcionan.
- [x] T14a. `guion/selector.ts` y `SelectorRef.svelte` (RF-11, RF-12).
       Hecho cuando están en verde los tests de la lógica (abre con `@` al principio o tras un espacio, no en medio de una palabra, también en una línea de personaje; Esc deja la `@`; sin resultados lo dice) y en el navegador Enter inserta la referencia.
- [x] T14b. Referencias en el editor (RF-13).
       Hecho cuando en el navegador el nombre sale subrayado con su tipo anunciado, retroceso lo borra de una vez, el cursor se coloca junto a ella con las flechas o pinchando fuera del nombre, y el alias escrito se conserva.
- [x] T15. `FichaLectura.svelte` y apertura (RF-14, RF-15, RF-17).
       Hecho cuando en el navegador un clic en la referencia abre la ficha de lectura con «Abrir en Obsidian», Ctrl/Cmd + clic abre Obsidian, Alt/Opción + Enter y el botón «Abrir ficha» lo hacen con el teclado, y una referencia sin ficha sale «(sin ficha)» sin abrir nada ni impedir guardar; test de que solo se usa `Ficha.ruta` leída.

## Bloque 3 · La vista
- [x] T16a. Menú y `Vista "guion"` (RF-1).
       Hecho cuando está en verde `nivelAlCambiarVista`/`vistaDeNivel` con la vista nueva y en el navegador la entrada «Guion» abre la vista vacía sin escribir nada.
- [x] T16b. Lista de escenas y documento del episodio (RF-1, RF-6, RF-7, RF-21).
       Hecho cuando en el navegador hay lista con código, título, lugar y «sin guion», sección «Bandeja de la temporada», descartadas aparte y atenuadas, encabezado propuesto al abrir una escena sin guion sin guardar nada, y las flechas pasan de una escena a la siguiente.
- [x] T17a. `EstadoGuion`: guardado y fallos (RF-27).
       Hecho cuando en el navegador se ve el fallo de guardado con su botón, el texto se mantiene y se reintenta; `abrir`, `cerrar`, `restaurar` y `alCerrarVentana` vacían el guardado.
- [x] T17b. Cambio por fuera, huérfanos y solo lectura en la interfaz (RF-28, RF-29, RF-31, RF-33).
       Hecho cuando en el navegador salen los tres caminos de T10a, el aviso de huérfanos e ignorados (cuántos y cuáles), el aviso de líneas que cambian de tipo tras un cambio de blancos por fuera, y el solo lectura con variante o formato futuro.
- [x] T18a. Páginas por escena (RF-23, RF-25, RF-26).
       Hecho cuando en el navegador se ve `2,4 págs ≈ 2 min 24 s` bajo cada escena, recalculado al teclear sin pausas, y la estimación marcada con «≈».
- [x] T18b. Totales (RF-23, RF-24, RNF-4).
       Hecho cuando en el navegador salen los totales de episodio, temporada y serie («12 de 31 escenas con guion», «calculando» mientras tanto), con la bandeja solo en temporada y serie.
- [x] T19. Código en el visor y en la lista (RF-20 a RF-22).
       Hecho cuando en el navegador `S03` sale en las tarjetas de escena donde hoy se enseña el orden, al reordenar se renumera y un texto dice que es calculado.
- [x] T20. Accesibilidad, tema y contraste (RF-2, RNF-6, RNF-7).
       Hecho cuando está en verde el test de contraste del texto del guion y de las referencias en claro y oscuro y, en el navegador, todo se hace con teclado, los tipos de línea, las referencias y los cambios importantes se anuncian en la región de estado y el tamaño de letra cambia sin cambiar las páginas.

## Bloque 4 · Cierre
- [x] T21. Rendimiento final (RNF-4): documento de 15 y de 40 escenas con el disco en memoria; carga de una copia de `_prueba` con `_guion/` (< 2 s); tamaño de una instantánea con 300 guiones.
       Hecho cuando está en verde con los umbrales y, en el navegador, 40 escenas no se traban.
- [x] T22. (hecho con un ejemplo propio; los fragmentos reales del autor se añaden como `guion-*.txt` cuando los pase) Texto real: fixtures `tests/fixtures/guion-*.txt` con fragmentos que dicte o pegue el autor, y el clasificador y las páginas probados con ellos.
       Hecho cuando están en verde y el autor ha visto cómo quedan sus fragmentos.
- [x] T23. `docs/decisiones/0004-guion.md`, `docs/inventario-v1.md`, `docs/prd.md` al día.
       Hecho cuando los documentos dicen lo que hay y por qué el guion vive en `_guion/` de la mesa de borradores.
- [x] T24. Validación RF a RF en `validacion.md`, con «A mano» para Windows y Mac (editor controlado, acentos y teclas muertas, pegado, Cmd en Mac, Opción + Enter, Courier New, Ctrl/Cmd + clic) y la comprobación de que `package.json` no cambió (RNF-8).
- [x] T25a. Revisión independiente de código.
- [x] T25b. Revisión independiente de seguridad; comprueba que ninguna prueba toca la vault real.
- [x] T25c. Arreglos de las revisiones, con test.
- [x] T26. Juntar en `main`, parar.
