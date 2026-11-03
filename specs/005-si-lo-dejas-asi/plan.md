# Plan técnico — Spec 005 «Si lo dejas así…»

> Cómo se construye. Respeta docs/constitucion.md y cubre los RF-1 a RF-33 (y RF-18b) de spec.md.
> Versiones: las de la 004 (Tauri 2, Svelte 5, `yaml` 2.9, Vitest, `@lucide/svelte`). Sin dependencias nuevas. Sin tocar `src-tauri/`, el formato de las notas ni el de `guia.md`.
> Revisado por un revisor independiente (2026-10-21): 3 🔴, 10 🟡 y 8 ⚪, recogidos aquí y en tasks.md. Cuatro decisiones del autor, en spec.md (Dudas resueltas, 9).

## Idea general
- **Punto de partida = copia del modelo.**
  - Las piezas son valores: para editar una se copia, se cambia y se pone con `Modelo.poner`; nadie la cambia en su sitio. Lo comprobó la revisión: `editar`, `conEstado`, `olvidarCrudos` y `pasarAWiki` copian, y `crearPieza` no toca el modelo.
  - La excepción es `Modelo.insertarEpisodio`, que hace `poner` directo y no usa nadie: lleva un comentario de aviso.
  - Por eso la copia es barata: un `Modelo` nuevo con las mismas piezas (las mismas referencias), sin clonarlas.
  - Un test congela a fondo (`Object.freeze`) las piezas de la base y pasa por mover escena, «Lo sé», `cambiarEstado`, `revisarFichas`, deshacer y crear. Si algo cambia una pieza en su sitio, falla.
- **Comparar = dos fotos de lo visible.**
  - De cada modelo se saca:
    - sus avisos (`comprobar`);
    - una «huella» por pieza con lo que el visor enseña;
    - los campos con etiqueta, tal como se ven.
  - La lista sale de comparar las dos fotos, no de los pasos de deshacer: escribir y borrar no deja nada.
  - La foto de la base se toma al empezar. Sus avisos son los de `sesion.resultado()` de ese momento, ya calculados.
  - Comparar es incremental:
    - primero por referencia (las piezas no se cambian en su sitio);
    - a fondo, solo las piezas distintas y lo que depende de ellas.
  - La huella guarda ids, no códigos. Los códigos se ponen al escribir la frase: los de antes con la base, los de ahora con el modelo.
    - Así, renumerar episodios no hace que un arco «pase» por otros.
    - El código propio de un episodio o una temporada sí es parte de su huella (decisión del autor).
- **Quién cambió qué.** La `Sesion` lleva una `Comparacion` con tres cosas:
  - la copia del punto de partida;
  - las piezas que cambiaron con la pieza abierta: en sus mismos pasos y, en cadena, en los pasos posteriores que tocaron alguna de ellas (decisión del autor);
  - las piezas que cambiaron de fuera desde el punto de partida, y por qué: fuera de Atelier, o canon desde la wiki.
- **Volver = un cambio normal, exacto y entero.**
  - Se construye con las piezas del punto de partida y pasa por `Sesion.aplicar`: guardado, bloqueo de canon, papelera.
  - Va sin `olvidarCrudos`, para que las piezas queden idénticas.
  - Antes de tocar nada, mira en disco lo cambiado fuera, como al mover escenas: no basta con lo que ya releyó la vigilancia.
  - Su paso de deshacer lleva la marca «entero»: Ctrl Z y Ctrl Y también son todo o nada.
- **Lógica en `src/lib/consecuencias/`** (nuevo), en TypeScript puro y con tests. Las vistas solo pintan lo que devuelve.

## Módulos y archivos
| Archivo | Qué hace | RF |
|---|---|---|
| `src/lib/consecuencias/copia.ts` (nuevo) | `copiaModelo(m)`: un `Modelo` con las mismas piezas. `antesDelPaso(m, piezas)`: la copia con las piezas de un paso devueltas a su `antes` (para el punto de partida al crear) | 23, def. |
| `src/lib/consecuencias/comparacion.ts` (nuevo) | Clase `Comparacion`: `piezaId`, `base: Modelo`, `avisosBase`, `conLaAbierta`, `deFuera`. `anotar(ids, origen)` (ver Contratos) | 18, 22 |
| `src/lib/consecuencias/avisos.ts` (nuevo) | `claveAviso(a)` = `pieza\|id\|sobre`. `compararAvisos(antes, ahora, mAntes, mAhora)`: `{ saltan, dejan, silenciados, sinComprobar }`, contando los repetidos uno a uno | 5, 6, 8, 9, def. |
| `src/lib/comprobaciones/*.ts` | `aviso(...)` acepta un `sobre?` opcional: de qué habla un aviso cuando la misma comprobación puede salir varias veces en la misma pieza. Solo en memoria: no cambia ningún texto ni la pestaña Comprobar. Dónde va, en «`sobre`, en detalle» | def. |
| `src/lib/consecuencias/huellas.ts` (nuevo) | `huellas(m, avisos, ids?)`: `Map<id, Huella>` con lo visible de cada pieza, de todas o solo de las pedidas. `afectadas(base, ahora, comparacion)`: piezas con algo distinto, en orden de la serie, con sus frases (RF-7). La abierta no sale | 7, 27, 28 |
| `src/lib/consecuencias/campos-vistos.ts` (nuevo) | `CAMPOS_VISTOS`: por tipo de pieza (también el punto clave, de `EditarPunto`), los campos con etiqueta del panel y de las tarjetas de Tramas, en su orden, con cómo se ve su valor (texto, lista o rejilla). `camposCambiados(antes, ahora, mAntes, mAhora)`: frases de RF-8 | 8 |
| `src/lib/consecuencias/efectos.ts` (nuevo) | `efectos(comparacion, modelo, resultado, guia, bloqueada)`: los cuatro grupos de RF-5 ya ordenados, con `total` (grupos 1-3), `conAviso`, `puedeVolver` y `abiertaDeFuera`. Cada aviso que salta lleva sus reglas (con la tabla de la 004) y el campo de «Ir al campo» | 2, 4-9, 13, 17, 22 |
| `src/lib/consecuencias/volver.ts` (nuevo) | `cambioVolver(comparacion, modelo, bloqueada)`: `Cambio` con las piezas de `conLaAbierta ∪ {abierta}` distintas de la base. Las que existían, a `guardar` con su versión de la base; las que no, a `borrar`. Devuelve `{ error }`, sin cambio, si alguna está en `deFuera` o si alguna que hay que cambiar es canon bloqueado («Título» es canon: desbloquéala para volver.) | 18, 18b, 20, 22 |
| `src/lib/consecuencias/nueva.ts` (nuevo) | `simularNueva(m, nivel, que, datos, bloqueada, avisosAhora)`: mira el bloqueo con `opcionesNuevo` (`AVISO_CANON`); crea la pieza con `crearPieza` (con su acto) sobre una copia y captura sus errores (`exige`). Devuelve `{ donde, afectadas, avisos }` o `{ error }`. Nada toca disco ni el modelo de verdad | 30-32 |
| `src/lib/consecuencias/visor.ts` (nuevo) | `marcasVisor(base, ahora, nivel, afectadas)`: `{ resaltadas: Set<id>, antes: Map<id, AntesColumna>, estabaAqui: Marca[], yaNoEsta: string[] }` para el nivel que se ve | 27, 28 |
| `src/lib/modelo/deshacer.ts` | `Paso.entero?`, que `hacer(..., opciones)` acepta. `ultimoPaso()`: piezas del último paso, para crear. `enteroUltimo`: si el paso que se acaba de deshacer o rehacer es entero | 19, 20, 23 |
| `src/lib/modelo/modelo.ts` | Comentario en `insertarEpisodio`: pone en el modelo sin pasar por `Sesion.aplicar`, y eso rompería la copia del punto de partida | riesgo |
| `src/lib/app/sesion.ts` | Ver «Sesión» | 16-26 |
| `src/lib/app/estado.svelte.ts` | Ver «Estado de la app» | 3, 13, 14, 18b, 24, 25 |
| `src/vistas/panel/Panel.svelte` | Pestaña nueva entre Editar y Guía, con su cifra (99+), el icono si hay avisos y un `aria-label` con la cifra. `borrar()`: aplica primero y elige la serie después (RF-26) | 1, 2, 26 |
| `src/vistas/panel/SiLoDejas.svelte` (nuevo) | La pestaña: «Volver a como estaba», grupos con título (`h3` con `tabindex=-1`), «y N más», acciones, foco (RF-12) y Ctrl Z en la lista (RF-16). Todo como texto | 4-17 |
| `src/vistas/panel/campos/ConGuia.svelte` | Si `estado.enfocarCampo` es suyo: despliega su sección si está plegada, enfoca su primer control (en una tarjeta de Tramas, la abre) y lo consume | 13 |
| `src/vistas/visor/Visor.svelte`, `Columna.svelte`, `ColumnaActo.svelte`, `ColumnaBandeja.svelte` | Con la pestaña abierta: clases `.afectada` y `.dim`, «antes …» en discontinuo dentro de la columna, marca fina «Estaba aquí» y línea «Ya no está» bajo el nivel. Textos para el lector | 27-29 |
| `src/vistas/visor/NuevaPieza.svelte` | «Si la creas así…» bajo las reglas, con `simularNueva`, 300 ms después del último cambio; RF-32 con el texto que impide Crear | 30-32 |
| `src/estilo/componentes.css` | `.afectada`, `.dim` (con color, sin opacidad), `.antes` (borde discontinuo `--ink-3`), `.estaba-aqui`, `.ya-no-esta` | 27, 28 |
| `docs/diseno.md` | Resaltado con la pestaña abierta; discontinuo gris = antes, de acento = cómo quedaría | criterios |

### `sobre`, en detalle
| Comprobación | `sobre` |
|---|---|
| C01b | el episodio o la temporada anterior |
| C01c | la temporada + «abre» o «cierra» (con un solo episodio salen las dos en el mismo) |
| C05 | la temporada |
| C06 | la temporada + «arranca» o «resuelve» (pueden salir las dos) |
| C07 | la temporada (sale una vez por temporada en una subtrama de serie) |
| C13 | «inicio» o «fin» |
| C17 | la temporada, o «necesita» |

Con `sobre`, que C07 de T01 desaparezca y C07 de T02 aparezca en el mismo paso son dos entradas, no se anulan.

## Contratos
```ts
// consecuencias/comparacion.ts
type Origen = "autor" | "fuera" | "canon-wiki";
class Comparacion {
  readonly piezaId: string;
  readonly base: Modelo;
  readonly avisosBase: Aviso[];
  readonly conLaAbierta: Set<string>;
  readonly deFuera: Map<string, "fuera" | "canon-wiki">;
  // autor: si el cambio toca la abierta o alguna de conLaAbierta, todas sus
  //   piezas pasan a conLaAbierta (en cadena: decisión del autor).
  // fuera / canon-wiki: sus piezas pasan a deFuera (solo las que de verdad
  //   cambiaron: la sesión compara antes de anotar).
  anotar(ids: string[], origen: Origen): void;
}

// consecuencias/huellas.ts
interface Huella {
  tipo: TipoPieza; codigo: string; titulo: string;
  escena?: { numero: number; episodio: string; acto: string; bandeja: boolean };  // ids
  escenas?: number; episodios?: number;   // episodio / temporada
  carga?: string; dominante?: string;     // dominante: id del arco
  avisos: number;                         // como contarAvisos del visor: solo clase «aviso»
  arco?: { empieza: string; acaba: string; pasa: string[] };   // ids de episodio
  secreto?: { pistas: string[]; revela: string };              // ids de episodio
  // «cambió en disco»: la pieza no es la misma referencia y su JSON difiere
}
interface Afectada { id: string; codigo: string; titulo: string; frases: string[]; nueva?: true; borrada?: true; deFuera?: "fuera" | "canon-wiki" }

// consecuencias/efectos.ts
interface Efectos {
  avisosNuevos: { aviso: Aviso; reglas: Regla[]; campo?: ClaveCampo; deOtra: boolean }[];
  afectadas: Afectada[];
  cambios: string[];        // RF-8, ya en frases
  abiertaDeFuera?: "fuera" | "canon-wiki";   // el grupo 3 lo dice
  yaNoAvisan: { aviso: Aviso; deOtra: boolean }[];
  total: number; conAviso: boolean; puedeVolver: boolean;
}
```

## Sesión
- `comparacion: Comparacion | null` y `empezarComparacion(piezaId | null)`:
  - con `null`, la quita.
  - Si la pieza se acaba de crear, la base es `antesDelPaso` de ese paso y sus piezas entran en `conLaAbierta` (RF-23). Cuenta como recién creada si `ultimaCreacion` apunta a ella y el modelo no ha cambiado desde entonces (misma `version`). `ultimaCreacion` la pone `aplicar` cuando crea, y se borra al empezar cualquier comparación.
  - Si no, la base es `copiaModelo(modelo)` y sus avisos, los de `resultado()`.
- `aplicar(cambio, registrar, clave, opciones?)`, con `opciones = { origen?, exacto?, entero? }`:
  - `origen` explícito: `"autor"` por defecto; `revisarFichas` pasa `"canon-wiki"`. Deshacer y rehacer son del autor.
  - Al final, si se aplicó: `comparacion?.anotar(ids, origen)`.
  - Si la pieza abierta ya no existe, `comparacion = null` (RF-26). `volverAComoEstaba` lo trata antes (RF-18b).
- `aplicarCambios` (lo que relee la vigilancia): antes de anotar, compara en JSON cada pieza releída con la que había. Solo las distintas van a `anotar(ids, "fuera")`: así un `touch`, u Obsidian pasando listas a bloque, no bloquean «Volver».
- **Entero** (Volver y su Ctrl Z / Ctrl Y), antes de tocar el modelo:
  1. `await guardado.vaciar()`;
  2. `cambiadasFuera` de todo lo que se guarda o se borra, como al mover, y comprobar que el modelo sigue como cuando se calculó el cambio;
  3. si `sincronizarFichas` quita alguna pieza, no se aplica nada;
  4. se escribe ya (`vaciar`), como al mover.

  Si algo falla, no cambia nada y lo dice.
- `volverAComoEstaba()`:
  1. `cambioVolver`; si hay `error`, va a `avisosCambio` y no se hace nada más;
  2. `aplicar(cambio, true, undefined, { exacto: true, entero: true })`, sin `olvidarCrudos`;
  3. saca de la papelera lo que vuelve, como `aplicarPaso`, y añade `avisosAlVolver` (RF-21);
  4. dice «Devueltas N piezas». Si la abierta era nueva, el estado elige la serie y lo dice (RF-18b).
- `volver()` (Ctrl Z / Ctrl Y): si el paso es `entero`, pasa por lo de «Entero». Si hay piezas saltadas, devuelve `false` (el paso vuelve a su pila) y avisa (RF-20).

## Estado de la app
- `Pestana` lleva `"efectos"`.
- `elegir(id, pestana = this.pestana)`: deja la pestaña que estaba y renueva la comparación si la pieza cambia. `abrir` y `restaurar` también la empiezan.
- `bajar`, `subirNivel` y las migas llaman a `irANivel` sin elegir mientras `pestana === "efectos"`. Pinchar una escena sí elige. El menú izquierdo no cambia (RF-25).
- `irAPieza(id)`: elige en Editar (RF-14).
- `irAlCampo(pieza, clave)` (RF-13):
  - si el campo es de una tarjeta de Tramas: `cambiarVista("tramas")` y `arcoActual`;
  - si no: pestaña Editar;
  - después, `enfocarCampo = { pieza, clave }`.
- `volverAComoEstaba()`: llama a la sesión. Si la abierta era nueva (RF-18b), elige la serie y deja el aviso «Título» ha vuelto a la papelera; Ctrl Z la recupera.

## Pieza afectada, en detalle (RF-7)
| Tipo | Huella | Frase |
|---|---|---|
| Escena | número, episodio, acto, bandeja | «Escena 4 → 5», «De T01E02 a T01E03», «Pasa al acto Desarrollo», «A la bandeja» |
| Episodio | código, escenas, carga, dominante, avisos | «T01E04 → T01E05», «5 → 6 escenas», «Carga + − → + +», «Trama dominante: A → B», «Avisos 1 → 2» |
| Temporada | código, episodios, carga, avisos | «T02 → T03», «8 → 9 episodios», carga, avisos |
| Arco | empieza, acaba, episodios por los que pasa | «Empieza en T01E03 → T01E02», «Pasa también por …», «Deja de pasar por …» |
| Secreto | episodios de las pistas y de la revelación | «La revelación pasa de T01E06 a T01E04», «Una pista pasa de … a …» |
| Punto clave | como cualquiera | va justo después de la serie |
| Cualquiera | la pieza no es la misma y su JSON difiere | si nada más cambió: «Cambió su nota» |
| — | existe en una foto y no en la otra | «Nueva» / «A la papelera» |

Si hay más de 20 escenas renumeradas, cada una es una entrada; la lista corta a 20 (RF-10).

## Campos vistos (RF-8)
- La tabla `CAMPOS_VISTOS` copia las etiquetas de `Editar*.svelte` y `tramas/Campos.svelte`.
- Un test recorre esos archivos y comprueba que están en la tabla:
  - cada `etiqueta="…"`;
  - cada etiqueta calculada (`etiqueta={… ? "A" : "B"}`).
- Los campos hechos a mano, sin `etiqueta`, van en una lista `MANUALES` del test, que también se compara con la tabla: pistas y pistas falsas, tramas y relleno de la escena, `estados` de Tramas, Siembras, `CampoEstado` y `FichaWiki`.
- Cómo se ve cada valor:
  - texto: tal cual, recortado a 80 caracteres en la frase;
  - selector de pieza: su código y título;
  - lista (pistas, protagonistas, personajes): «3 → 4 · añadida «…»»;
  - rejilla (estado por temporada, momentos): «cambió T02».
- `avisos_silenciados`: «G42: silenciado con «Lo sé»», con el código de la primera regla de esa comprobación, o el de la comprobación si no tiene regla.
- `madurez` y `madurez_mesa`: «Ya no se comprueba: aparcada», etc.

## Visor (RF-27 a RF-29)
- `Visor.svelte` calcula `marcasVisor` solo si `estado.pestana === "efectos"` y hay cambios. Si no, el visor no cambia y no cuesta nada.
- `.afectada`: borde `--accent` y `<span class="solo-lector">afectada</span>`.
- `.dim`: el fondo pasa a `--bg` y el texto a `--ink-3`, que tiene 4,5:1 sobre `--bg`.
- «antes …»: un `<span class="antes">` con borde discontinuo `--ink-3`, dentro de la columna y al lado del dato que cambió («antes 4», «antes + −»). El lector lee «antes: 4».
  - Solo de lo que la columna ya enseña. En el nivel temporada, la columna de episodio no enseña su número de escenas: ese cambio va solo en la lista.
- «Estaba aquí»: una marca fina entre las tarjetas donde estaba la escena, como `.marca` del arrastre, sin el ancho de una tarjeta. Texto en `title` y en `solo-lector`.
- «Ya no está: «título»»: una línea bajo las columnas del nivel.

## Accesibilidad y foco
- La pestaña es un `role="tab"` con `aria-label` «Si lo dejas así…, N cambios[, con avisos]». No hay región `aria-live` para la cifra (RF-2).
- Al desaparecer la entrada con el foco (RF-12):
  1. antes de pintar, se guardan la clave de la entrada siguiente y la del grupo;
  2. después de pintar, se enfoca la primera que exista, o el título de la pestaña.
- Ctrl Z / Ctrl Y en la lista: el atajo global ya deshace fuera de los campos (spec 004, RF-18). Se comprueba que la lista no lo captura.

## Rendimiento
- La foto de la base se toma al empezar, sin un `comprobar` nuevo (los avisos son los de `resultado()`). Las huellas se calculan solo cuando hacen falta.
- Comparación incremental:
  - por referencia primero;
  - huellas a fondo solo de las piezas distintas y de lo que depende de ellas (sus episodios, temporadas, arcos y secretos);
  - el recuento de avisos por pieza, con dos mapas.
- Se calcula una vez por `version` del modelo, como `resultado()`.
- La cifra de la pestaña se calcula con `setTimeout` de 150 ms tras el último cambio: escribir no la espera.
- Tests sobre la serie grande, con margen para la máquina de CI, como los de la 002:
  - copia en menos de 50 ms;
  - `efectos` tras editar un título, en menos de 30 ms;
  - `efectos` tras mover una escena, en menos de 200 ms.

## Tests (ligeros: lógica, disco, canon y v1.0)
| Archivo | Qué prueba |
|---|---|
| `tests/consecuencias/copia.test.ts` | Ver «Tests de copia» |
| `tests/consecuencias/avisos.test.ts` | Mismo aviso aunque cambie el título; repetidos uno a uno; `sobre` separa C13, C06, C01c y C07 de T01 y T02; silenciado y aparcado no son «Ya no avisan» |
| `tests/consecuencias/huellas.test.ts` | Ver «Tests de huellas» |
| `tests/consecuencias/campos.test.ts` | Texto, vacío, lista, rejilla, silenciado; escribir y borrar no deja nada; los valores escritos a mano no cuentan; etiquetas de los `.svelte` y `MANUALES` en la tabla |
| `tests/consecuencias/efectos.test.ts` | Grupos y orden; total y `conAviso`; reglas de un aviso compartido; campo de «Ir al campo»; sin guía; abierta cambiada fuera; rendimiento en la serie grande |
| `tests/consecuencias/volver.test.ts` | Ver «Tests de volver» |
| `tests/consecuencias/nueva.test.ts` | Dónde por tipo; renumeración; avisos; nada escrito (disco en memoria intacto); bloqueo |
| `tests/consecuencias/visor.test.ts` | Resaltadas por nivel (la temporada que contiene; un arco y un secreto en sus episodios de antes y de ahora); «antes»; «Estaba aquí» solo si cambió de sitio; «Ya no está» |
| `tests/contraste.test.ts` | `.dim` usa `--ink-3` sobre `--bg`; `.antes` usa `--ink-3` |

**Tests de copia:**
- la base, congelada a fondo, sigue igual tras mover, «Lo sé», cambiar de estado, revisar fichas, deshacer y crear;
- base al crear = antes de crear, solo justo después de crear;
- la abierta que desaparece acaba la comparación;
- la cadena de `conLaAbierta`;
- lo releído sin cambios no va a `deFuera`;
- `origen`.

**Tests de huellas:**
- mover escena: renumeradas, episodio, acto;
- carga y dominante;
- el arco pasa también por otro episodio;
- la revelación del secreto cambia de episodio;
- nueva y papelera;
- orden de la serie;
- insertar un episodio: los códigos cuentan, los arcos no.

**Tests de volver** (disco en memoria):
- exacto, con crudos y campos desconocidos: se compara la pieza leída, no el texto;
- devuelve la abierta, sus pasos y la cadena: dos escenas movidas en el mismo episodio no dejan números repetidos;
- lo de otros pasos se queda;
- lo creado va a la papelera; lo borrado sale de ella;
- canon bloqueado: nada, con su texto;
- cambiado fuera, también sin que lo vea la vigilancia: nada;
- es un paso; Ctrl Z y Ctrl Y son enteros;
- aviso de la wiki (RF-21);
- la v1.0 lee lo devuelto (`leidoPorV1`).

La interfaz (pestaña, foco, visor, «Nueva pieza») se prueba en el navegador.

## Riesgos
- **Piezas cambiadas en su sitio.** Si algún código cambia una pieza sin copiarla, la base se estropea en silencio. Mitigación: la base congelada en los tests (T1) y el comentario en `insertarEpisodio`.
- **Coste al escribir.** Comparar en cada tecla la serie grande. Mitigación: comparación incremental, cálculo diferido y por `version`; medirlo en el navegador con la serie grande.
- **«Ir al campo» en Tramas** depende de abrir la tarjeta desde fuera. Mitigación: `irAlCampo` cambia antes a Tramas con ese arco, y `enfocarCampo` lo consume `ConGuia`, que ya conoce su tarjeta.
- **RF-25 cambia una conducta de la 002** (bajar elige). Solo pasa con la pestaña abierta y solo en el visor. Se comprueba en el navegador que, con la pestaña cerrada, todo sigue igual.
