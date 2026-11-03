# Plan técnico — Spec 003 Hasta la escena

> Cómo se construye. Respeta docs/constitucion.md y cubre los RF-1 a RF-41 de spec.md.
> Versiones: las de la 002 (Tauri 2, Svelte 5, `yaml` 2.9, Vitest, `@lucide/svelte`). Sin dependencias nuevas. Sin tocar `src-tauri/`. Arrastre con el de HTML, como la rejilla de la v1 (la ventana ya lleva `dragDropEnabled: false`).
> Revisado por un revisor independiente (2026-10-20): 1 🔴, 8 🟡 y 13 ⚪, todos recogidos aquí y en tasks.md.

## Idea general
- La lógica nueva va en TypeScript puro y probado: `src/lib/vistas/actos.ts` (actos, orden, mover, curva) y `src/lib/wiki/escaleta.ts` (escaleta de la ficha). Los componentes solo presentan y llaman.
- Una escena es un `Evento` de la v1. **Formato de notas sin cambios**: mover y crear solo cambian `acto`, `orden`, `episodio` y `temporada`, campos de la v1.
- Todo se aplica con `Sesion.aplicar`: mismo guardado, mismo deshacer (un paso por movimiento), mismo bloqueo de canon, ampliado a la estructura del episodio (RF-24).
- La revisión QA de la spec vio que el lector pierde un `acto` o un `cambio` que no conoce. Se arregla primero (T0), con el mismo mecanismo `crudos` de la spec 001.

## Módulos y archivos
| Archivo | Qué hace | RF |
|---|---|---|
| `src/lib/modelo/ficheros.ts` | `crudos` se amplía a `acto` y `cambio` del evento: lo que no se entiende se guarda tal cual y se vuelve a escribir mientras el valor no cambie. Regla general de escritura: se escribe el crudo si `normalizar(campo, crudo)` es igual (a fondo) a lo que hay ahora en la pieza; para `madurez` y `madurez_mesa` equivale a la de hoy. «No se entiende» en `cambio`: no es una lista de 2, o algún elemento no es un valor de carga ni vacío | RNF integridad |
| `src/lib/modelo/estados.ts` (junto a `conEstado`) | `olvidarCrudos(antes, despues)`: si un campo con crudo cambia, el crudo se borra (así poner acto 2 y quitarlo no resucita el valor a mano). Se llama en `Sesion.aplicar` para cada pieza guardada; deshacer devuelve la pieza entera con su crudo | RNF integridad |
| `src/lib/modelo/tipos.ts` | `crudos?: Record<string, unknown>` (el de `cambio` es una lista) | RNF integridad |
| `src/lib/vistas/actos.ts` (nuevo) | `ORDEN_ACTOS`; `actosDe(m, ep)`; `colocarEscena(m, id, episodio, acto, puesto?)`; `crearEscena(m, ep, acto, datos)`; `pasoTeclado(m, id, tecla)`; `porQueNoSeMueve(m, id, destino, bloqueada)`; `curva(escenas)`; `anuncio(m, id)` | 4-6, 7-11, 16-23, 25, 31, 33, 37 |
| `src/lib/vistas/visor.ts` | `Columna.tipo` `"evento"` → `"escena"`; `columnas` en el nivel episodio deja paso a `columnasActos(m, ep, avisos)`; `bandejaVisor(m, t, avisos)`; textos | 7, 10, 29, 30, 41 |
| `src/lib/vistas/crear.ts` | «Escena» en «Nuevo…» del episodio; `DatosNueva.acto`; `crearPieza("evento")` usa `crearEscena`; textos | 2, 35-37 |
| `src/lib/app/sesion.ts` | `bloqueadaQueToca`: un evento que entra, sale (también a la papelera) o cambia de orden o de acto en un episodio canon bloqueado bloquea el cambio, con su mensaje (RF-23, RF-24). Precomprobación de «cambió fuera» también para los movimientos de escenas (`cambio.mueve` con 2 o más piezas existentes), con su mensaje («no se ha movido nada»); el resto de cambios de la v1 sigue como hoy (RF-40). Antes de comprobar, `await guardado.vaciar()` si hay algo pendiente (si no, lo propio a medio escribir parecería de fuera); después de mover, `guardado.vaciar()` sin esperar al medio segundo | 23, 24, 33, RNF integridad |
| `src/lib/almacen/almacen.ts` | `cambiadasFuera` lee las notas en paralelo (`conocido` se toma antes de leer: si la vigilancia relee mientras tanto, sigue contando; T2) | RNF integridad, rendimiento |
| `src/lib/wiki/pasar.ts`, `desfase.ts`, `escaleta.ts` (nuevo) | `escaletaDe(m, ep)` (lo que pasar escribe hoy en las tablas «Escena» y «Acto», sacado a una función común); `leerEscaleta(texto)` lee esas dos tablas de la ficha; `revisarFichas` guarda la escaleta leída en `EstadoFicha`; `escaletaAlDia(m, ep, leida)` | 39 |
| `src/lib/app/estado.svelte.ts` | `abrirNueva(que, {acto})`; `moverEscena(id, ...)` y `llevarAEpisodio(id, ep)` (aplican sin `clave`, así cada movimiento es un paso de deshacer, y devuelven el anuncio o el porqué); **en serie**: mientras un movimiento está pendiente, el siguiente se ignora (como `guardandoIdea`); `avisoVisor`; `arrastrando` (booleano) | 13, 17-23, 28, 31, 33 |
| `src/vistas/visor/Visor.svelte` | En el nivel episodio pinta `Actos.svelte`; en el nivel temporada añade `ColumnaBandeja.svelte` después de los episodios; zona `aria-live` para los anuncios y aviso visible para los bloqueos | 7, 22, 23, 29 |
| `src/vistas/visor/Actos.svelte`, `ColumnaActo.svelte`, `Curva.svelte`, `ColumnaBandeja.svelte` (nuevos) | Columnas de acto con cabecera (nombre, nº, resumen), tarjetas (`Columna.svelte` reutilizada), «+ Escena»; teclado 2D y Alt + flechas; arrastrar y soltar con marca de destino; curva SVG `aria-hidden`; bandeja con sus escenas arrastrables | 7-23, 26, 27, 29-33 |
| `src/vistas/visor/arrastre-visor.ts` (nuevo) | Tipo de dato propio `application/x-atelier-escena-visor`, **sin** `text/plain` (los campos del panel aceptarían el id); testigo en memoria con el id y la serie: solo se acepta lo que empezó en el visor de esta serie; `puestoAlSoltar(rects sin la tarjeta arrastrada, y)`; limpieza en `dragend`/`drop` de `window` y al cambiar de nivel | 17, 26, 27, 31 |
| `src/vistas/visor/Columna.svelte` | `draggable` en escenas y en la bandeja; «Empieza y acaba igual»; columnas de episodio aceptan escenas de la bandeja de esa temporada. `Columna.tipo` sigue siendo `"evento"` (es un identificador, no un texto) | 10, 11, 31 |
| `src/vistas/visor/NuevaPieza.svelte` | Selector de acto (botones `aria-pressed`, como el tipo de trama) | 36 |
| `src/vistas/Temporada.svelte` | Sin `<Bandeja>` (la sustituye la del visor) | 34 |
| `src/vistas/panel/EditarEpisodio.svelte` | Aviso «La escaleta de la wiki no está al día» con el enlace a la ficha de `Wiki.enlace` (el de la v1) | 39 |
| `src/vistas/Carcasa.svelte` | Alt + flechas: `preventDefault` en toda la app fuera de los campos (WebView2: Alt + ← es «atrás»); Esc no sube mientras `arrastrando` | RNF atajos, 26 |
| Textos (lista en T8) | «evento» → «escena» en lo que escribe la v2: visor, crear, panel (`EditarEvento`, `Panel`, `EditarSecreto`, `EditarEpisodio`, `Siembras`), rejilla, bandeja, buscar y mensajes de `comprobaciones/`. No se tocan: `guia-md.ts`/`marcas.ts` (categoría «evento» de la guía del autor, RF-3), nombres de carpeta y de campos, `demo.ts` | 2, 3 |

## Modelo de datos
Sin campos nuevos en disco. Ejemplo de escena (evento de la v1) antes y después de moverla a Desarrollo, 2.ª:

```yaml
# antes                         # después
id: ev-e004                     id: ev-e004
tipo: evento                    tipo: evento
temporada: te-t001              temporada: te-t001
episodio: ep-a103               episodio: ep-a103
orden: 7                        orden: 4        # el episodio se renumera por actos
acto: "1"                       acto: "2"
cambio: [+, "-"]                cambio: [+, "-"]
```

En memoria:
```ts
type ActoVisor = Acto | "";            // "" = Sin acto
interface ColumnaActo { acto: ActoVisor; nombre: string; resumen: string; escenas: Columna[] }
interface TramoCurva { id: string; numero: number; desde: "+" | "-" | null; hasta: "+" | "-" | null; igual: boolean }
interface EscaletaLeida { titulos: string[]; actos: [string, string, string, string] }  // títulos de la tabla Escena por orden; «ESC01, ESC03» por acto
```
`EstadoFicha` gana `escaleta?: EscaletaLeida` (solo en memoria).

## Contratos (lógica → interfaz)
- `actosDe(m, ep): Record<ActoVisor, Evento[]>`: cada escena en su acto, en el orden del episodio (`eventosDeEpisodio`). Un acto desconocido ya llega como `""` (y su crudo se conserva).
- `colocarEscena(m, id, episodio, acto, puesto?): Cambio`: quita la escena de su sitio, le pone `episodio`, `temporada` del episodio y `acto`, la mete en `puesto` de su acto (por defecto al final), concatena los actos en `ORDEN_ACTOS` y numera 1..n. Guarda solo las escenas cuyo `orden`, `acto`, `episodio` o `temporada` cambian; `mueve: id`. Si no cambia nada, `guardar: []`.
- `crearEscena(m, ep, acto, datos): { pieza, cambio }`: `crearEvento` + la misma normalización (RF-37). Las ideas de Ctrl I siguen con `crearEvento` sin normalizar (RF-38).
- `pasoTeclado(m, id, "arriba" | "abajo" | "izquierda" | "derecha"): { episodio, acto, puesto } | null`: null en los bordes (RF-20); derecha desde Desenlace, null; izquierda desde Sin acto, final de Desenlace (RF-19).
- `porQueNoSeMueve(m, id, episodioDestino, bloqueada): string | null`: «La escena es canon: desbloquéala para moverla» o «El episodio es canon: desbloquéalo para cambiar sus escenas» (origen o destino).
- `curva(escenas): TramoCurva[]`; `anuncio(m, id): string` → «Escena 4 · Desarrollo, 2.ª».
- `escaletaDe(m, ep): EscaletaLeida`; `leerEscaleta(texto): EscaletaLeida | null` (null si la ficha no tiene las tablas; las filas de plantilla sin título, como `| ESC01 | | | A | | idea |`, no cuentan); `escaletaAlDia(m, ep, leida): boolean` compara los títulos en orden y los códigos de cada acto (un cambio de orden dentro de un acto también cuenta).

## Lógica clave
```
colocarEscena(m, id, episodio, acto, puesto):
  ev = m.eventos[id]; si no: vacío
  grupos = actosDe(m, episodio) sin id          // si viene de otro episodio o de la bandeja, no estaba
  fila = grupos[acto]; insertar ev en min(puesto ?? fila.length, fila.length)
  nuevo orden = concat(grupos en ORDEN_ACTOS)
  para cada (e, i) en nuevo orden:
    cambia = e.orden != i+1 || (e es ev && (acto, episodio o temporada cambian))
    si cambia: guardar copia con orden i+1 (y, si es ev, acto/episodio/temporada nuevos)
  // sacarla de otro episodio no renumera el de origen: sus números pueden quedar con un hueco, como en la v1
  return { guardar, borrar: [], mueve: id }

bloqueadaQueToca (añadido):
  para cada p en guardar con p.tipo == evento:
    antes = m.eventos[p.id]
    estructura = !antes || antes.episodio != p.episodio || antes.orden != p.orden || antes.acto != p.acto
    si estructura y p.episodio y bloqueada(p.episodio): bloquea p.episodio
    si estructura y antes?.episodio y antes.episodio != p.episodio y bloqueada(antes.episodio): bloquea antes.episodio
  // el resto como hoy: una escena canon movida (mueve) bloquea; renumerar vecinas canon en episodio libre vale (RF-25)

aplicar (precomprobación):
  hoy: si hay piezas nuevas → cambiadasFuera(existentes)
  ahora: también si cambio.mueve y hay 2 o más piezas existentes:
    si guardado tiene algo pendiente o en vuelo: await guardado.vaciar()
    cambiadasFuera(existentes) en paralelo; si alguna: «… cambió fuera de Atelier: no se ha movido nada; se queda lo de fuera.»
    // T2: también si alguna de esas piezas cambió en el modelo durante la espera (la vigilancia la releyó):
    // el movimiento se calculó sobre la versión vieja y la pisaría
  tras poner el cambio de un movimiento: guardado.vaciar() (sin el medio segundo)
  // ventana que queda: una nota que cambia fuera entre la comprobación y su escritura la suelta Guardado
  // (aviso y relectura, T15 de la 002); las demás se escriben. Lo dice el RNF y lo prueba un test.

EstadoApp.moverEscena (en serie):
  si moviendo: return null            // la segunda pulsación o el segundo arrastre no se calcula sobre un modelo viejo
  moviendo = true
  try: cambio = colocarEscena(modelo de ahora, ...); ok = await sesion.aplicar(cambio)   // sin clave
  finally: moviendo = false
```

Teclado del nivel episodio (en `Actos.svelte`, antes de que el `keydown` llegue al visor):
- ↑ ↓: tarjeta anterior o siguiente del acto; ← →: misma posición (o la última, o «+ Escena» si está vacío) del acto de al lado.
- Alt + flecha: `pasoTeclado` → `estado.moverEscena`; `preventDefault` y `stopPropagation` (si no, `flechas` del visor, que no mira `altKey`, movería también el foco); `e.repeat` se ignora (RF-21). El foco vuelve a la tarjeta tras el `tick` (busca por `data-id`) y el anuncio va a la zona `aria-live`.

Arrastre:
- `dragstart` en una tarjeta pone el tipo propio y el id; `dragover` en una columna de acto o de episodio solo hace `preventDefault` si el tipo es el propio (así la rejilla y la bandeja de la v1 no lo aceptan y el visor no acepta los suyos ni texto de fuera: RF-27).
- La marca de destino es una línea entre tarjetas (`puestoAlSoltar` con los `getBoundingClientRect` de las tarjetas **sin la arrastrada**, igual que `colocarEscena` cuenta el puesto). `drop` valida con el testigo en memoria (no con el id del `dataTransfer`: los ids se repiten entre series) y, en el nivel temporada, que la escena está en la bandeja de esa temporada. Soltar en su sitio no guarda nada (`guardar: []`).
- «Sin acto» se queda visible mientras dura el arrastre que salió de ella (RF-8).
- Esc durante el arrastre lo cancela el navegador; por si el `keydown` llega, `escape()` de la carcasa no sube mientras `estado.arrastrando`. El testigo y `arrastrando` se limpian en `dragend` y `drop` de `window` y al cambiar de nivel (si la tarjeta de origen sale del DOM, `dragend` no llega).

## Decisiones técnicas
| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Normalizar el episodio entero por actos al mover o crear | Insertar solo la escena movida | Decidido por el autor (spec RF-5): número, curva y v1 coinciden con lo que se ve |
| Sacar una escena de un episodio no renumera el de origen | Renumerar los dos | Menos notas tocadas; la v1 (`moverEvento`) ya deja huecos y ordena bien con ellos |
| Bloqueo de canon por la estructura del episodio en `bloqueadaQueToca` | Comprobarlo solo en el visor | Una sola puerta para visor, panel y rejilla (RF-24) |
| Precomprobación de «cambió fuera» en paralelo, solo para mover escenas (y crear, como en la 002) | Para todo cambio de 2 o más piezas | Todo o nada (RNF) sin cambiar lo que hacen el resto de funciones de la v1 (RF-40) |
| Movimientos en serie: se ignora el que llega con otro pendiente | Cola de movimientos | Sin carreras con el modelo viejo (hallazgo 🔴 de la revisión); con el teclado, la siguiente pulsación ya llega con el primero hecho |
| Mover sin `clave` de historial | Clave por escena | Con clave, dos Alt + ↓ en 1,5 s se juntarían en un paso (RF-28) |
| Borrar una escena de un episodio canon bloqueado también se bloquea | Dejarlo como hoy | «No se saca» de RF-24: igual que crear dentro de algo canon en la 002 |
| `crudos` general (se escribe si leerlo da el valor actual) | Un caso especial para `acto` y otro para `cambio` | Misma regla para todo; para `madurez` da lo mismo que hoy |
| Escaleta leída en `revisarFichas` | Leer la ficha al elegir el episodio | Ya se lee la ficha ahí; mover no cambia la ficha, así que el aviso se recalcula en memoria |
| Tipo de dato propio para el arrastre del visor | Reutilizar el de la rejilla | La rejilla aceptaría las tarjetas del visor (RF-27, fuera de alcance) |
| Reutilizar `Columna.svelte` para las tarjetas | Componente nuevo | Mismos datos y estilos (RF-10) |

## Seguridad de la funcionalidad
- Un solo usuario, sin red: no hay autorización que comprobar. Lo que se escribe pasa por `Almacen` (rutas por id, dentro de `appDatos/<serie>/`).
- Entradas: el id que llega en un arrastre se valida contra `m.eventos` y la serie abierta; el acto, contra `ORDEN_ACTOS`; el puesto se acota. Texto o ficheros de fuera se ignoran (RF-27).
- Integridad: canon (RF-23, RF-24) y «cambió fuera» (precomprobación) antes de escribir; `Guardado` sigue comparando con la base de cada nota (T15 de la 002); deshacer no restaura lo cambiado fuera.
- Escrituras repetidas: Alt + flecha mantenida no repite (RF-21); soltar en su sitio no escribe.
- La ficha de la wiki solo se lee (RF-39); nada se escribe en la wiki.
- Sin `{@html}` (test `sin-html`), sin logs con contenido, sin dependencias.

## Tests
| Qué | Dónde |
|---|---|
| Acto y cambio desconocidos se conservan al guardar y al renumerar; la v1.0 los lee como antes; `madurez` igual que en la 001 | `ficheros.test.ts`, `compat.test.ts` |
| `actosDe`, `colocarEscena` (mismo acto, otro acto, Sin acto, orden cruzado, números repetidos o 0, en su sitio = nada, solo lo que cambia), `crearEscena`, `pasoTeclado` (bordes), `curva`, `anuncio` | `actos.test.ts` (nuevo) |
| Canon: no entra, no sale, no se reordena en un episodio bloqueado (visor, `moverEvento` de la rejilla y panel); escena canon no se mueve; vecinas canon sí se renumeran | `bloqueo-canon.test.ts` |
| Mover con una de las notas cambiada fuera: no se mueve nada y avisa; deshacer de un movimiento en un paso | `integridad-mesa.test.ts`, `deshacer.test.ts` |
| La v1.0 lee las escenas movidas, llevadas desde la bandeja y creadas en un acto | `compat.test.ts` |
| `columnasActos` y `bandejaVisor`; «Escena» en «Nuevo…»; acto por defecto | `visor.test.ts`, `crear.test.ts`, `estado-app.test.ts` |
| Escaleta: al día, desfasada tras mover, ficha sin tablas, ficha editada a mano | `escaleta.test.ts` (nuevo) |
| Rendimiento: actos y mover con 40 escenas en menos de 100 ms (lógica); en Tauri, a mano (la precomprobación lee del disco) | `rendimiento.test.ts`, validacion «A mano» |
| Movimientos en serie: dos seguidos sin esperar dejan el orden bien y dos pasos de deshacer; un movimiento mientras se escribe el anterior no da «cambió fuera»; nota cambiada fuera entre la comprobación y la escritura: aviso, relectura y el resto escrito | `estado-app.test.ts`, `integridad-mesa.test.ts` |
| Poner acto 2 y quitarlo no resucita el valor a mano; deshacer sí lo devuelve | `ficheros.test.ts`, `deshacer.test.ts` |
| Deshacer a medias (una nota cambiada fuera): orden estable, sin errores | `integridad-mesa.test.ts` |
| Escaleta: plantilla con fila vacía no avisa; cambio de orden dentro de un acto sí | `escaleta.test.ts` |
| Textos «escena»: los tests que comprueban mensajes con «evento» cambian su texto esperado en la misma tarea (T8), por RF-2; ninguno cambia lo que comprueba | varios |
| Interfaz: navegador (`npm run dev`), con teclado y ratón, claro y oscuro | validacion.md |

## Riesgos y vuelta atrás
- Arrastre en WebKit (Mac) y WebView2: el de la rejilla de la v1 está aún «pendiente de probar a mano» y el del visor va sin `text/plain`. Prueba a mano del autor en los dos sistemas (validacion «A mano»); si falla en WebKit, se añade `text/plain` con un valor que no sea el id.
- Normalizar puede reescribir muchas notas en un episodio cruzado: solo las que cambian, con la precomprobación; un Ctrl Z lo deshace.
- Alt + flechas: en el Mac, Opción + flechas en un campo mueve por palabras; solo se atiende con el foco en una tarjeta.
- Vuelta atrás: la rama `003-hasta-la-escena` se junta en `main` al final; cada tarea es un commit que se puede revertir.

## Documentos que se alinean
- `docs/inventario-v1.md`: G1 «Nivel de actos» y «Eventos / escenas…» → hechos en la 003; G5 evento ◐ → ✔ (ya estaba en el panel de la v1).
- `docs/diseno.md`: fila `.visor` (acto en la entrega 3 → hecho) y nombre «escena».
- `docs/prd.md`: la duda «¿escena = evento?» queda resuelta (spec 003, RF-1).
