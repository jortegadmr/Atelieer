# Tareas — Spec 012 «Pizarra libre y llevar a la sala»

> Tareas de 20-30 min, en orden. Una cada vez: tests primero (solo disco, papelera, v1.0 y lo que decide lo que se copia), `npm run verificar`, marcar, commit.
> Rama `012-pizarra-y-sala`; al acabar se junta en `main`. Sin cambios en `src-tauri/` ni dependencias nuevas.
> La interfaz se comprueba en el navegador (`npm run dev`, serie de prueba en memoria). Los tests usan solo `FsMemoria`.
> Partidas de nuevo tras la revisión independiente del plan.

## Bloque 1 · Datos de la pizarra
- [x] T1. `pizarra/tipos.ts` y `pizarra/formato.ts`: `leerPizarra`, `escribirPizarra` (RF-15, RNF-4, RNF-6).
      Hecho cuando están en verde: «ida y vuelta idéntica»; «dos escrituras iguales dan el mismo texto»; «lo de fuera del bloque se conserva»; «posición NaN, infinita o fuera del lienzo se normaliza con aviso»; «ids repetidos, flechas a elementos que no existen, color fuera de la paleta y textos pasados del tope se descartan o se recortan con aviso y se sigue»; «el tope no parte un emoji ni una letra combinada»; «campos desconocidos se conservan»; «`origen` de la tarjeta se lee y se escribe»; «`__proto__` no cambia nada»; «versión 2 → solo lectura»; «bloque roto o sin bloque → ilegible con motivo»; «nota con `\0`, saltos y bidi vuelve igual»; «200 elementos y 400 flechas se leen y escriben en < 100 ms».
- [x] T2. `pizarra/operaciones.ts` (RF-2, RF-3, RF-6, RF-7, RF-8, RF-15, RNF-10).
      Hecho cuando están en verde: crear, editar, colorear y mover; «nota vacía se quita sola»; «unir rechaza consigo mismo y repetida con su motivo; A→B y B→A valen»; «quitar un elemento quita sus flechas y dice cuántas»; «tope de 200 y 400 con el mensaje de que no caben más»; «tocar, crear y mover suben al final»; «una tarjeta por pieza»; «`unir` y `quitarElemento` con 200/400 en < 100 ms».
- [x] T3. `pizarra/historial.ts` y `pizarra/encuadre.ts` (RF-10, RF-11).
      Hecho cuando están en verde: «un paso por movimiento; editar texto junto se junta»; «deshacer y rehacer devuelven la pizarra exacta»; «tope de 200»; «hacer algo tras deshacer vacía lo rehacible»; «vaciar»; «zoom entre 25 y 200 %»; «encajar con 0, 1 y varios elementos, y con dos a ±20 000 px al zoom mínimo».
- [x] T4a. `almacen/almacen-pizarra.ts`: cargar, guardar, cola, `CambioFuera` (RF-1, RNF-3, RNF-4).
      Hecho cuando están en verde, con el disco en memoria: «cargar sin fichero no crea nada»; «pizarra vacía no se guarda»; «guardar entero o nada (falla el renombrado y queda la anterior)»; «cambió fuera: no escribe, lanza CambioFuera»; «borrado por fuera: avisa una vez y el siguiente guardado escribe»; «no había fichero al cargar y aparece uno: CambioFuera»; «dos guardados seguidos van en orden»; «roto: se aparta a `pizarra rota <fecha>.md`, no se borra y empieza vacía»; «Proton: un `pizarra (conflicto).md` no se lee como la pizarra».
- [x] T4b. `copiaAPapelera` y `comprobarFuera`/`releer` (RNF-2, RNF-3).
      Hecho cuando están en verde: «copia a `_papelera/_pizarra/` con sello y `(2)` si se repite, sin pisar»; «`esFicheroDePieza` no reconoce `_pizarra` y los tests actuales de papelera y deshacer siguen en verde»; «`comprobarFuera` dice si el disco ya no es lo conocido»; «`releer` pone lo conocido al día».
- [x] T5a. Vigilancia: `_pizarra` en `relevante`/`escanear`/`repartir` y oyente `alCambiarPizarra` (RNF-3).
      Hecho cuando están en verde: «avisa de un `pizarra.md` cambiado fuera y no de lo que escribe la app»; «los tests actuales de vigilancia no cambian».
- [x] T5b. Instantáneas: `ficherosDeCopia()` (RNF-9).
      Hecho cuando están en verde: «la instantánea lleva la pizarra y restaurar la devuelve»; «restaurar una copia sin pizarra no toca la actual ni la manda a la papelera»; «las instantáneas actuales siguen igual».
- [x] T5c. Compatibilidad con la v1.0, con el patrón de `tests/compat-variantes.test.ts` (RNF-1).
      Hecho cuando están en verde: «la v1.0 abre la serie con pizarra y `_papelera/_pizarra/` presentes sin avisos»; «guardar, borrar y papelera de la v1.0 no las tocan»; «la v1.0 restaura un zip de la v2 con la pizarra dentro sin romper ni mover nada»; «sin pizarra, la serie es idéntica».
- [x] T6. `pizarra/guardado.ts` y `sesion.pizarra` (RF-13, RNF-3).
      Hecho cuando están en verde, con el reloj inyectado: «varios cambios seguidos, un guardado»; «vaciar guarda ya»; «un fallo se enseña, conserva lo pendiente y reintenta con el siguiente cambio»; «CambioFuera relee, descarta lo pendiente y avisa»; «dos guardados no se cruzan»; «`Sesion.abrir` crea el almacén y enchufa `alCambiarPizarra`»; «restaurar una instantánea con un cambio pendiente no da CambioFuera».

## Bloque 2 · Estado y vistas de la pizarra
- [x] T7. `pizarra/resolver.ts` (RF-4, RF-5, RF-9, RF-14).
      Hecho cuando están en verde: «tarjeta sigue a la pieza por id aunque cambie el título o la temporada»; «descartada marcada»; «ausente se ve como tal y, si la pieza vuelve, se resuelve sola»; «buscador: sin tildes ni mayúsculas, sin piezas con tarjeta, descartadas marcadas, solo los cuatro tipos»; «orden de lectura».
- [x] T8a. `EstadoPizarra`: operaciones con historial y guardado, solo lectura con variante, relectura (RF-8, RF-10, RF-14, RNF-3).
      Hecho cuando están en verde: «con una variante abierta no se escribe nada y las tarjetas se resuelven contra la serie principal»; «cambiar de serie renueva la pizarra y el encuadre; cambiar de vista lo recuerda»; «tras un cambio por fuera, Ctrl Z no resucita lo anterior y lo pendiente se descarta»; «el evento de volver a la ventana llama a `comprobarFuera`»; «`abrir`, `cerrar`, `restaurar` y `alCerrarVentana` vacían el guardado»; «con la vista Pizarra, Ctrl Z / Ctrl Y deshacen la pizarra y no las piezas, salvo dentro de un campo de texto».
- [x] T8b. Papelera al quitar (RNF-2, RF-8).
      Hecho cuando están en verde: «quitar una nota con texto deja copia y se puede deshacer»; «quitar una tarjeta y quitar una flecha dejan copia»; «quitar una nota con flechas deja una sola copia»; «quitar una nota vacía no deja copia».
- [x] T9. `pasarAIdea(notaId, titulo)` (RF-16 a RF-20).
      Hecho cuando están en verde, con la sesión y el reloj inyectado: «crea un evento en idea en la bandeja de la temporada en marcha, o de la última»; «sin temporada, `Crea primero una temporada` y no cambia nada»; «título limpio, de una línea y como mucho 300»; «destino bloqueado por canon: dice el porqué»; «nota con tarjeta de origen existente: ofrece abrirla; si la pieza ya no existe, crea otra»; «dos pulsaciones, una pieza»; «falla el guardado de la pizarra: la pieza queda»; «`deshacerIdea` quita la pieza»; «no duplica la lógica de `guardarIdea`».
- [x] T10a. Vista «Pizarra»: menú, `Vista` en `visor.ts`, lienzo y notas (RF-1 a RF-3, RF-6, RF-11).
       Hecho cuando en el navegador se crea una nota, se escribe, se mueve con el ratón, se colorea y se encuadra con rueda, Ctrl + rueda y botones; abrir la vista sin tocar nada no escribe; `nivelAlCambiarVista` y `vistaDeNivel` con la vista nueva tienen test.
- [x] T10b. Tarjetas y buscador (RF-4, RF-5, RF-9).
       Hecho cuando en el navegador se añade una tarjeta desde el buscador, se abre la pieza con doble clic y con Enter (panel al lado) y la pieza ausente y la descartada se ven.
- [x] T10c. Flechas, etiquetas y quitar (RF-7, RF-8, RF-15).
       Hecho cuando en el navegador se une arrastrando de un asa, se pone etiqueta, se quita todo con el recuento de flechas, el rechazo dice por qué y al llegar al tope sale «no caben más».
- [x] T10d. Teclado de elementos y unión (RF-6, RF-12).
       Hecho cuando en el navegador se hace sin ratón: Tab en orden de lectura, flechas (10 px, Mayús 50), Enter, Esc, Supr y Alt + L con Tab y Enter; dentro de una nota las flechas son del campo.
- [x] T10e. «Ver como lista» y anuncios (RF-12, RNF-5 de accesibilidad).
       Hecho cuando están en verde las cadenas de `lista.ts` y los anuncios («Nota movida», «Flecha creada de … a …», «Se quitaron 3 flechas»), y en el navegador la lista permite recorrer, editar etiquetas y quitar.
- [x] T10f. Aviso de guardado, cambio por fuera y solo lectura en la interfaz; «Pasar a idea» con su mini diálogo (RF-13, RF-14, RF-16 a RF-20).
       Hecho cuando en el navegador se ve el fallo de guardado con su botón, el aviso de cambio por fuera, la pizarra en lectura con variante, «Pasar a idea» pidiendo el título y creando idea, tarjeta y flecha, y «Deshacer idea».
- [x] T10g. Colores y contraste (RF-3, RNF-7).
       Hecho cuando está en verde el test de contraste de los seis fondos en claro y oscuro (texto `ink` sobre cada fondo y borde de foco contra el fondo) y, en el navegador, los colores llevan su nombre en texto.

## Bloque 3 · Llevar a la sala
- [x] T11. `sala/texto.ts`: `entrecomillar`, `limpiar`, `recortarPlanteamiento` (RF-26, RF-27).
       Hecho cuando están en verde: «una valla dentro de la nota no cierra la cita»; «`---`, `#` y ``` quedan como texto»; «`limpiar` quita control y bidi y conserva los saltos»; «100 000 caracteres: recorta en el orden fijo y deja título, estado, avisos y última línea»; «no parte un grafema ni una fila de tabla»; «contar en unidades de texto (≠ grafemas con emoji)».
- [x] T12. `sala/planteamiento.ts` (RF-19, RF-23, RF-25).
       Hecho cuando están en verde: «orden fijo y omite lo vacío»; «solo título, estado y última línea si no hay nada»; «sección no legible → línea `(no se pudo leer: motivo)` y sigue»; «pizarra ilegible → línea de aviso y sigue»; «notas con flecha directa en cualquier sentido, con su etiqueta y por posición»; «con variante abierta dice que lleva la serie».
- [x] T13a. `sala/reunir.ts`: episodio y escena (RF-23, RF-25, RF-28).
       Hecho cuando están en verde con el modelo de prueba: campos que la app entiende, avisos con su regla, viene de y provoca, «Si lo dejas así…» solo con la pieza abierta con comparación, origen inexistente, siempre sobre la serie principal.
- [x] T13b. `leerAlternativas` y `sala/reunir.ts`: arco (RF-23, RF-25).
       Hecho cuando están en verde: `leerAlternativas` lee las filas que `anadirAlternativa` escribe y no se rompe con una tabla a mano; ficha cruda, alternativas, wiki ausente o ficha en conflicto.
- [x] T13c. `sala/reunir.ts`: secreto (RF-23, RF-25).
       Hecho cuando están en verde: ficha, «Lo conocen» con «lo sabe desde» de todas las temporadas con filas, ficha ausente.
- [x] T13d. `sala/reunir.ts`: personaje de la lente (RF-24, RF-28).
       Hecho cuando están en verde: nombre, ficha leída con `Wiki.de("personaje")` si existe, relación, escenas en las que aparece y qué sabe; sin ficha solo el nombre y la relación; lente que desaparece.
- [x] T14a. `CopiarTexto.svelte` extraído de `Esquema.svelte` (RF-22, RF-29).
       Hecho cuando el Esquema se comporta igual (sus tests siguen en verde) y en el navegador sale «… (N caracteres)» en región de estado y, con el portapapeles fallando, la caja seleccionada.
- [x] T14b. `LlevarSala.svelte` en el panel y en la lente (RF-21, RF-30).
       Hecho cuando en el navegador se copia desde episodio, escena, arco, secreto y la lente, y no se escribe nada en disco.
- [x] T14c. «Llevar a la sala» en la tarjeta de la pizarra (RF-21).
       Hecho cuando en el navegador se copia desde la tarjeta, con sus notas unidas dentro, y una tarjeta «pieza no encontrada» lo dice.

## Bloque 4 · Cierre
- [x] T15a. Rendimiento final de 200 elementos y 400 flechas con guardado, lectura y `unir` (RNF-5).
       Hecho cuando está en verde con el umbral de 100 ms.
- [x] T15b. `docs/decisiones/0003-pizarra.md`, `docs/inventario-v1.md` y `docs/prd.md` al día.
       Hecho cuando los documentos dicen lo que hay y por qué la pizarra vive en `_pizarra/pizarra.md`.
- [x] T16. Validación RF a RF en `validacion.md`, con «A mano» para Windows y Mac (pointer events, rueda con Ctrl, pellizco del trackpad, doble clic) y la comprobación de que `package.json` no cambió (RNF-8).
- [x] T17. Revisiones independientes de código y de seguridad, y arreglos con test. La revisión comprueba que ninguna prueba toca la vault real.
- [ ] T18. Juntar en `main`, parar.
