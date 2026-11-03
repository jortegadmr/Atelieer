# Plan — Spec 012 «Análisis: pizarra libre y llevar a la sala»

> El CÓMO de la spec 012. Rama `012-pizarra-y-sala`. Sin dependencias nuevas, sin cambios en `src-tauri/`.
> Revisado por un revisor independiente (30 puntos, recogidos aquí). Pendiente de aprobación del autor antes de la T1.

## Idea general
- La pizarra es un dato de la serie, **no una pieza**: no entra en `Modelo`, ni en `ESQUEMAS`, ni en la wiki. Vive en un fichero propio y tiene su propio almacén, historial y estado. La lógica es TypeScript puro en `src/lib/pizarra/` (inmutable: cada operación devuelve una pizarra nueva) y se prueba con Vitest y el disco en memoria.
- El almacén sigue el modelo de `variantes/almacen-variantes.ts`: cola de guardado, comparar con lo último leído o escrito (`CambioFuera`), `escribirSeguro`, `almacen.alEscribir` para que la vigilancia no cuente lo propio, y papelera sin borrar.
- `sesion.ts` (1500 líneas) y `estado.svelte.ts` (1380) **crecen unas líneas y no ganan lógica**: la sesión gana un campo `pizarra: AlmacenPizarra` (como `variantes`), su creación en `Sesion.abrir` y el oyente de la vigilancia; el estado crea una `EstadoPizarra` (fichero nuevo, runes) y `abrir`, `cerrar` y `restaurar` la vacían o renuevan. La única pieza que se crea (Pasar a idea) pasa por los caminos que ya hay (`crearIdea` + `sesion.aplicar`).
- «Llevar a la sala» es una función pura que recibe los datos ya reunidos y devuelve texto; reunir los datos reutiliza lo que ya calculan las specs 005, 009, 010 y 011. No escribe nada.

## A. Pizarra en disco

### Formato (`appDatos/<serie>/_pizarra/pizarra.md`)
Una nota Markdown (constitución 1): un título, una línea que dice qué es y un único bloque de código `json` con esto. Lo que haya fuera del bloque (el autor la puede abrir en Obsidian) se conserva al reescribir.
```json
{ "version": 1,
  "elementos": [
    { "tipo": "nota", "id": "pz-a1b2c3", "texto": "…", "color": "ambar", "x": 120, "y": 80 },
    { "tipo": "tarjeta", "id": "pz-d4e5f6", "pieza": "ev-7f3a", "x": 400, "y": 80 } ],
  "flechas": [ { "id": "pz-0a9b8c", "de": "pz-a1b2c3", "a": "pz-d4e5f6", "etiqueta": "provoca" } ] }
```
- El **orden de `elementos` es el apilado** (RNF-10): el último se pinta encima; tocar, crear o mover lo pasa al final.
- La v1.0 solo lee las carpetas de piezas y `serie.md`, y una carpeta con `_` delante no se recorre (`esFicheroDePieza` la rechaza), como `_variantes`. La decisión va a `docs/decisiones/0003-pizarra.md`.
- Una tarjeta lleva además `origen?: string` (id de la nota de la que nació por «Pasar a idea»), campo propio y no `extra`.
- Campos desconocidos de primer nivel y de cada elemento se conservan (`extra`) y se reescriben tal cual (RNF-4). Claves con `Object.hasOwn`; nunca se copia una clave que llegue en un cambio (`__proto__`).

### `src/lib/pizarra/` (puro)
- `tipos.ts`: `Pizarra`, `Nota`, `Tarjeta`, `Flecha`, constantes (`COLORES` con seis ids y su nombre en texto, `MAX_NOTA = 5000`, `MAX_ETIQUETA = 60`, `MAX_ELEMENTOS = 200`, `MAX_FLECHAS = 400`, `LIENZO = 20000`, `ZOOM = [0.25, 2]`).
- `formato.ts`: `leerPizarra(texto): { pizarra; avisos: string[]; soloLectura: boolean } | { ilegible: string }` (RNF-4: descarta o normaliza cada defecto con su aviso y sigue; versión mayor que 1 → `soloLectura`) y `escribirPizarra(p, textoAnterior?): string` (JSON con sangría y orden de claves fijo; conserva lo de fuera del bloque). Los topes se cuentan en grafemas con `Intl.Segmenter`, como `limpiarIdea`.
- `operaciones.ts`: `crearNota`, `editarNota`, `colorearNota`, `moverElemento`, `anadirTarjeta`, `unir` (devuelve `{ pizarra } | { error }` con el porqué de RF-7 y RF-15), `etiquetar`, `quitarElemento` (`{ pizarra; flechasQuitadas }`), `quitarFlecha`, `subir`, `quitarNotaVacia`. Todas recortan a los topes y limpian `NaN` y fuera de lienzo.
- `historial.ts`: `HistorialPizarra` con `hacer(antes, despues, clave?)`, `deshacer`, `rehacer`; un movimiento completo es un paso (la interfaz llama al soltar), editar texto se junta por clave; 200 pasos como mucho; vive en `EstadoPizarra`, no en la serie ni en `Historial` de piezas.
- `resolver.ts`: `estadoTarjeta(m, t): { titulo; tipo; estado: "ok" | "descartada" | "ausente" }`; `ordenLectura(p)`; `piezasParaTarjeta(m, p)` (episodio, escena, arco y secreto sin tarjeta; para `BuscarEscena`/un buscador de piezas con `simple()` de `vistas/buscar.ts`).
- `encuadre.ts`: `acercar`, `mover`, `encajar(p, tamano)` (RF-11).
- `lista.ts`: texto de «Ver como lista» y de los anuncios.

### Almacén (`src/lib/almacen/almacen-pizarra.ts`)
`AlmacenPizarra(almacen, carpeta)`:
- `cargar()`: si no hay fichero, pizarra vacía y **no se crea** (RF-1). Fichero ilegible: se mueve a `_pizarra/pizarra rota <sello>.json` (nunca se borra) y se empieza vacía, con aviso (RNF-4).
- `guardar(pizarra)`: en cola; relee el disco y compara con lo último leído o escrito; si no coincide, lanza `CambioFuera` y no escribe (RNF-3); `crearDir`, `alEscribir`, `escribirSeguro`. Una pizarra vacía que nunca se escribió no se guarda. **Borrado por fuera:** si el fichero ya no está y lo conocido era un texto, `guardar` lanza `CambioFuera` una vez, pone lo conocido a `null` y el siguiente guardado escribe. Si no había fichero al cargar y aparece uno, es `CambioFuera`.
- `copiaAPapelera(texto)`: antes de quitar algo con contenido (RNF-2), escribe el texto anterior en `_papelera/_pizarra/<sello>.json` (subcarpeta propia: la papelera de piezas no la ve), sin sobrescribir (sufijo `(2)`).
- `comprobarFuera()`: relee y dice si el disco ya no es lo conocido. `releer()` pone el estado al día. Se llama desde la vigilancia (`alCambiarPizarra`), desde los eventos `focus` y `visibilitychange` de la ventana (RNF-3) y desde un `CambioFuera`.
- `vigilancia.ts`: `relevante`/`escanear`/`repartir` aprenden la carpeta `_pizarra` (solo `pizarra.md`) y llaman a un oyente nuevo `alCambiarPizarra`, como `alCambiarVariantes`. El constructor gana un parámetro opcional al final; los tests actuales no cambian.
- `instantaneas.ts`: `crear` arma el zip con un método nuevo `ficherosDeCopia()` (= `ficheros()` + `_pizarra/pizarra.md` si existe); `restaurar` escribe la pizarra si está en la copia y **no toca** la actual si la copia no la tiene. El bucle de `restaurar` sigue usando `ficheros()` (solo piezas) para decidir qué va a la papelera, así una copia vieja no manda la pizarra a la papelera.

### Guardado diferido (`src/lib/pizarra/guardado.ts`)
`GuardadoPizarra(almacen, esperar = setTimeout)`: `cambiar(p)` marca pendiente y arma un guardado a los 600 ms del último cambio; `vaciar()` guarda ya (salir de la vista, `alCerrarVentana` de `plataforma.ts` con su tope de 2 s, cambio de serie y `restaurar`; si no da tiempo, se avisa); si falla, `estado = { fallo: mensaje }` y reintenta con el siguiente cambio o `reintentar()`; si es `CambioFuera`, relee, descarta lo pendiente y avisa (RNF-3). El reloj se inyecta para probarlo.

## B. Estado e interfaz de la pizarra

### `src/lib/app/estado-pizarra.svelte.ts` (nuevo, runes)
`EstadoPizarra(estado: EstadoApp)`: pizarra, selección, modo (edición, unión), encuadre, avisos y anuncio. Métodos que envuelven `operaciones` + `historial` + `guardado`. `soloLectura` si hay variante abierta (RF-14) o `soloLectura` del formato. Quitar un elemento o una flecha con contenido llama antes a `copiaAPapelera`. Abrir la vista carga; salir la vacía. Toda relectura (`CambioFuera`, cambio externo, otra serie) vacía el historial y descarta lo pendiente. `EstadoApp` la crea y la renueva; `abrir`, `cerrar`, `restaurar` y `alCerrarVentana` vacían su guardado antes de seguir. Siempre se resuelve contra `estado.sesionSerie.modelo`, nunca el de una variante.
- **Ctrl Z / Ctrl Y:** `Carcasa.teclas` los envía a la pizarra cuando `vista === "pizarra"` (con las guardas actuales de campos de texto y capas abiertas). La pieza creada por «Pasar a idea» se deshace con el botón «Deshacer idea» del aviso (el patrón de `ultimaIdea` y `deshacerIdea`).

### Pasar a idea
`pasarAIdea(notaId, titulo)` (el título lo propone un mini diálogo con la primera línea de la nota, editable): `crearIdea(modelo, NIVEL_SERIE, primeraLinea(nota.texto), bloqueada)` (la regla de `destinoIdea` para `NIVEL_SERIE` ya es «temporada en marcha, o la última»; sin temporada devuelve «Crea primero una temporada»), `sesion.aplicar(cambio, true)` como `guardarIdea`, y después tarjeta + flecha con un solo paso de la pizarra. Cerrojo contra doble pulsación (como `guardandoIdea`). Si la nota ya tiene una tarjeta con `origen` igual a su id y la pieza existe, ofrece abrirla; si la pieza ya no existe, crea otra. Si falla el guardado de la pizarra, la pieza queda (RF-20).

### Vistas (`src/vistas/pizarra/`)
- `Pizarra.svelte` (vista, entrada «Pizarra» en `MenuIzquierdo`, `Vista` está en `vistas/visor.ts` y gana `"pizarra"`, con `nivelAlCambiarVista` y `vistaDeNivel` al día y probados; `Carcasa` la monta). Abrir una tarjeta usa `estado.elegir(id, "editar")`, como `Esquema.svelte`: el panel de piezas se abre al lado: barra (Nota, Tarjeta, Encajar, zoom, Ver como lista, deshacer/rehacer), lienzo y aviso de guardado.
- `Lienzo.svelte`: HTML absoluto dentro de un contenedor con `transform` para el encuadre y SVG debajo para las flechas; movimiento con `pointer` events (un solo paso al soltar), rueda y pellizco (`wheel` con `ctrlKey`).
- `NotaPizarra.svelte`, `TarjetaPizarra.svelte`, `Flechas.svelte`, `ListaPizarra.svelte` (alternativa en texto con todas las acciones) y `BuscarPieza.svelte` (buscador de tarjetas).
- Teclado de RF-12 con un único manejador en el lienzo; los anuncios van a una región `role="status"`.
- Solo pointer events (nada de arrastre HTML5 nativo, por `dragDropEnabled: false`). Estética de `src/estilo/`; los seis colores son tokens hex de 6 cifras en `:root` y en el tema oscuro, y `tests/contraste.test.ts` mide el texto (`ink`) sobre cada fondo de nota y el borde de foco contra el fondo.

## C. Llevar a la sala

### `src/lib/sala/`
- `texto.ts`: `entrecomillar(texto)` (cita con `>` o valla de más acentos graves que cualquiera dentro), `limpiar(texto)` (solo quita controles y bidi y conserva los saltos de línea; `textoSeguro` y `codigoEnLinea` de `wiki/md.ts` se usan únicamente para títulos y etiquetas de una línea), `recortarPlanteamiento(secciones, max)` (RF-27: orden de recorte fijo, sin partir grafemas ni filas).
- `planteamiento.ts`: `planteamiento(entrada: EntradaSala): { texto; caracteres; recortado }`. `EntradaSala = { origen; secciones: Seccion[]; notas: NotaSala[] }` con `Seccion = { clave: "estado" | "ficha" | "avisos" | "causas" | "quien-sabe" | "cambios" | "alternativas"; titulo; lineas: string[] } | { clave; nolee: string }`. Orden y última línea «Quiero decidir:» fijos (RF-23, RF-19).
- `reunir.ts`: `async reunirSala(sesion, origen): Promise<EntradaSala | { error }>` (la ficha se lee del disco). Siempre sobre la serie principal; con una variante abierta lleva la serie y lo dice en una línea. Por tipo:
  - **episodio / escena:** campos de `CAMPOS_VISTOS` que la app entiende (con `expandir`), avisos de `comprobar` filtrados por pieza con `reglasDelAviso`, viene de / provoca de `vistas/causas.ts` (escena), `efectos()` de la sesión solo si es la pieza abierta con comparación.
  - **arco:** ficha de la wiki cruda (`Sesion.leerFichaDe`), alternativas descartadas con un `leerAlternativas(texto)` nuevo en `wiki/alternativas.ts` (sobre `filasDeTabla` de `md.ts`; hoy solo hay añadir y quitar), avisos.
  - **secreto:** ficha y «Lo conocen / lo sabe desde» (`conocen-desde.ts`, `vistas/quien-sabe.ts` sobre todas las temporadas con filas).
  - **personaje (lente):** nombre, ficha leída con `Wiki.de("personaje")` y su `.md` por `fs` (no es una pieza: `leerFichaDe` no vale), `relacion()` (arcos, secretos), escenas en las que aparece (`vistas/presencia.ts`, todas las temporadas).
  - Si algo no se lee, la sección es `{ nolee }` (RF-25). Si el origen no existe, `{ error }` (RF-28).
- Notas de la pizarra: las notas con flecha directa a la tarjeta de la pieza, ya ordenadas, solo si la pizarra carga (RF-23.8, RF-25).
- `src/vistas/comunes/CopiarTexto.svelte` (nuevo, extraído de `analisis/Esquema.svelte`: botón, aviso `role="status"` con texto parametrizable y caja de respaldo; `Esquema.svelte` pasa a usarlo sin cambiar su comportamiento) y `LlevarSala.svelte` encima de él. Se monta en el panel (`Panel.svelte`, episodio, escena, arco, secreto), en la barra de la lente y en la tarjeta de la pizarra.

## Rendimiento
- Leer y guardar 200 elementos + 400 flechas: < 100 ms con el disco en memoria (RNF-5), con un primer test ya en T1 y T2 para que un coste cuadrático salga pronto. `unir` y `quitarElemento` son lineales en flechas.
- El planteamiento de un arco con ficha grande se compone sin recalcular el modelo entero (usa el índice de causas cacheado por versión).

## Compatibilidad con la v1.0 (RNF-1)
- Nueva prueba con el patrón de `tests/compat-variantes.test.ts` (`Almacen` e `Instantaneas` de `tests/compat/v1/` sobre `FsMemoria`): una serie con `_pizarra/pizarra.md` y `_papelera/_pizarra/` se abre con el lector congelado de la v1.0 sin problemas ni avisos; guardar, borrar y papelera de la v1.0 no la tocan; y la v1.0 restaura un zip de la v2 con la pizarra dentro sin romper ni mover nada.
- Una nota de pizarra con 5000 caracteres, saltos de línea, `\0` y caracteres bidi se escribe y vuelve igual.

## Riesgos
- Lienzo con pointer events en WebView2 y en el WebKit del Mac: se comprueba a mano (pendiente del autor, como las pruebas de arrastre de la 003).
- `vigilancia.ts` y `instantaneas.ts` son comunes a todo: los cambios son aditivos y llevan sus tests antes.
