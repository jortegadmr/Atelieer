# Plan técnico — Spec 006 «¿Y si…?»

> Cómo se construye. Respeta docs/constitucion.md y cubre RF-1 a RF-45 (con los «b» y «c») de spec.md.
> Versiones: las de la 005 (Tauri 2, Svelte 5, `yaml` 2.9, Vitest, `@lucide/svelte`). Sin dependencias nuevas. Sin tocar `src-tauri/`, el formato de las notas de las piezas ni el de `guia.md`.
> Revisado por un revisor independiente (2026-10-21): 4 🔴, 16 🟡 y 14 ⚪, recogidos aquí. Una aclaración de la spec (RF-12: crear fichas), en spec.md.

## Idea general
- **Una variante = una segunda sesión.** Al abrir una variante se crea una `SesionVariante`, subclase de `Sesion`.
  - Tiene su propio modelo, «Cómo quedaría»: la copia del de la serie con las piezas de la variante encima. Su deshacer y su comparación de «Si lo dejas así…» también son propios.
  - `estado.sesion` apunta a ella, así que las vistas (panel, visor, Tramas, Comprobar, Guía, «Si lo dejas así…») no cambian. Son más de 100 usos de `estado.sesion!`, todos dentro de `$derived` con `version`, comprobado en la revisión.
  - «Ver ahora» hace que `estado.sesion` apunte a la sesión de la serie, con la edición del autor bloqueada.
- **Lo que la variante cambia no va al disco de la serie.**
  - `SesionVariante.aplicar` reutiliza la parte de `Sesion.aplicar` que pone el cambio en el modelo, el historial y la comparación.
  - Después apunta la pieza en la variante, que se guarda con retraso, como el guardado.
  - No pasa por el bloqueo de canon (RF-11), ni por el disco de la serie, ni por las fichas (RF-8).
- **Sigue a la serie.** Cuando cambia el modelo de la serie (vigilancia, Ctrl I, revisión de fichas), la variante copia al suyo las piezas que no toca. Compara por referencia: las piezas son valores (spec 005). Lo que sí toca se queda y, si cambió en la serie, es choque.
- **Base = la nota normalizada.**
  - La base de una pieza es `escribirPieza` de la pieza de la serie, sin `wiki_mtime`, en el momento en que la variante la toca por primera vez. Antes se vacía el guardado de la serie.
  - Hay choque de pieza cuando la pieza de la serie, normalizada igual, da otro texto.
  - En disco se compara `escribirPieza(leerPieza(texto del disco))`. Así, un cambio solo de formato de Obsidian o de la v1.0 no es choque, y un campo desconocido cambiado sí lo es: va en `extra` y se escribe.
- **Aplicar = un cambio entero de la serie, con cerrojo.** `Sesion.aplicarVariante` hace, en este orden:
  1. comprueba todo sin escribir;
  2. hace la instantánea;
  3. escribe las notas todo o nada;
  4. pone la wiki al día (como pide RF-37b);
  5. deja un solo paso de deshacer con la marca de la variante.

  Deshacer ese paso devuelve la variante a aparcada (RF-38).
- **Lógica en `src/lib/variantes/`** (nuevo), en TypeScript puro y con tests. Las vistas solo pintan.

## Dónde se guarda (constitución 1 y 9)
- `appDatos/<serie>/_variantes/<id>.md`: una nota Markdown por variante. Un solo fichero, para escribirla de forma atómica (`escribirSeguro`).
- **La v1.0 no la ve.**
  - Comprobado en `git show v1.0:…`: `listarSeries` solo mira `serie.md`; `abrirSerie`, las instantáneas y la vigilancia solo recorren `CARPETA`; la papelera solo mueve notas de pieza.
  - Para probarlo con su código se congelan también `almacen.ts`, `instantaneas.ts`, `fs.ts` y `conflictos.ts` de la v1.0 en `tests/compat/v1/`. Se copian tal cual desde la etiqueta y no se tocan.
- **Las instantáneas de la v2** no guardan ni tocan las variantes al restaurar: solo recorren `CARPETA`. Un test lo fija.
- **Ids de variante:** `va-` + cuatro letras, con un generador propio (`nuevoIdVariante`); no es un tipo de pieza.
  - Las piezas que crea una variante sacan id del modelo de la variante, que contiene la serie.
  - Si la serie llega a crear el mismo id (1 entre 1,7 millones), es choque de pieza: «Ya existe en la serie».

### Formato de la nota
````md
---
atelier: variante
id: va-k2m9
nombre: Nando se va en E05
estado: aparcada          # aparcada | aplicada | descartada
creada: 2026-10-21 18:20
cambiada: 2026-10-21 18:45:12
aplicada: ""
descartada: ""
porque: ""
origen: ep-a1b2            # «Probar otra versión» desde esta pieza (o "")
elegida: ep-a1b2           # pieza elegida al aparcar (RF-5)
piezas: [ep-a1b2, ev-zz99, ep-c3d4]   # índice: para «Versiones» y el recuento sin leer los bloques
sitios:                    # orden de las escenas de un episodio (o de la bandeja de una temporada) la primera vez que la variante lo tocó
  ep-a1b2: [ev-1111, ev-2222, ev-3333]
pisa:                      # campo pisado → valor de la serie al traer lo de ahora (RF-30c)
  ep-a1b2: { sinopsis: "Nando se va…" }
fichas:                    # nombre de ficha elegido al pasar a borrador en la variante
  ev-zz99: "La marcha de Nando"
---
# Nando se va en E05
Prueba de Atelier. Nada de esto está en la serie hasta aplicarla.

## T01E05 · La traición
~~~~atelier base episodio ep-a1b2
---
id: ep-a1b2
…la nota normalizada tal como estaba en la serie…
~~~~
~~~~atelier pieza episodio ep-a1b2
---
id: ep-a1b2
…la nota como quedaría…
~~~~

## T01E07 · Fiesta
~~~~atelier base episodio ep-c3d4
…
~~~~
~~~~atelier papelera episodio ep-c3d4
~~~~
````
- **Qué se lee.** La cabecera y los bloques `atelier`. Los títulos y el texto son para leerla a mano. Al abrir la serie se lee cada nota entera, pero solo se analiza la cabecera; los bloques se analizan al abrirla, al pedir sus choques o al aplicarla.
- **Formato de los bloques.** La valla es de `~` y más larga que cualquier racha de `~` del contenido (como CommonMark). Sin bloque `base`, la pieza es nueva. Con `papelera`, la variante la manda a la papelera.
- **Al aplicar** se conservan las bases (son «Antes de aplicar», RF-44) y las piezas (son «Lo que aplicó»).
- **Coste de guardar.** El escritor guarda el texto de cada bloque y solo vuelve a escribir con `escribirPieza` las piezas cambiadas.

## Módulos y archivos
| Archivo | Qué hace | RF |
|---|---|---|
| `src/lib/variantes/tipos.ts` (nuevo) | `DatosVariante`, `PiezaVariante`, `EstadoVariante`, `Choque`, `MetaPaso` | def. |
| `src/lib/variantes/formato.ts` (nuevo) | `leerCabecera(texto)`, `leerVariante(texto, nombreFichero)`, `escribirVariante(v, bloques, codigos)`; valla variable; validación (ver «Seguridad») | 9, seg. |
| `src/lib/variantes/nombres.ts` (nuevo) | `nuevoIdVariante(usados)`, `nombrePorDefecto(fecha, usados)` («¿Y si…? 21 oct, 18:20», « (2)»), `limpiarNombre` (120) y `limpiarPorque` (500): sin saltos ni caracteres de control | 2, 2b, 3, 41 |
| `src/lib/variantes/almacen-variantes.ts` (nuevo) | `AlmacenVariantes`, colgado del `almacen` de la sesión: lista `_variantes/` (cabeceras), aparta las rotas y las de conflicto (`esConflicto`, y el nombre original antes del paréntesis para saber de qué variante es), `leer(id)`. **Único camino de escritura:** `guardar(id, texto)` en cola por variante, comparando con lo último leído o escrito (si no coincide, `CambioFuera`), con `alEscribir` para la vigilancia. `aPapelera(id)` (RF-26) | 1, 9, 26, 27, seg. |
| `src/lib/variantes/escritor.ts` (nuevo) | `EscritorVariante`: pide guardar con retraso (500 ms) a través de `AlmacenVariantes`. Implementa `GuardadoVisible`, la cara que lee el pie del panel. Si salta `CambioFuera`, lo dice y avisa a la sesión | 9, casos límite |
| `src/lib/variantes/quedaria.ts` (nuevo) | `modeloQuedaria(serie, v)` y `seguirSerie(quedaria, serie, antes, v)`, que copia lo que la variante no toca y devuelve los ids. `sacarDeVariante(quedaria, serie, ids)`: pone la pieza **actual** de la serie (o la quita si no existe) | def., 13 |
| `src/lib/variantes/referencias.ts` (nuevo) | `referenciasDe(p)`: lista explícita de campos de referencia por tipo (episodio, temporada, arcos, pistas, revelación, `tramo_de`, posición…). Un test recorre `tipos.ts` para que no falte ninguno | def., 28 |
| `src/lib/variantes/choques.ts` (nuevo) | `choques(v, serie, quedaria)`: de pieza (campos solo en la serie, en los dos lados o «por dentro»; «ya no está»; «ya existe en la serie»), de sitio (orden de escenas distinto del de `sitios`) y de referencia (rotas en «Cómo quedaría» que no lo estaban en la base). `choquesEnDisco(v, fs, rutas)`: lo mismo, leyendo y normalizando el disco | 28, 29, 31, 33 |
| `src/lib/variantes/traer.ts` (nuevo) | `traerPieza(v, id, serie)`: junta a tres bandas por campo (con sus `crudos`) y en `extra` por subclave; apunta `pisa`; base nueva. `traerSitio(v, contenedor, serie)`: orden de ahora con lo de la variante junto a su vecina de antes (si no está, al final), renumerado. `limpiarPisa`: una entrada sale cuando el campo de la variante iguala al de la serie o deja de estar cambiado | 30, 30b, 30c |
| `src/lib/variantes/quitar.ts` (nuevo) | `quitar(v, id, quedaria, serie)`: lo que hay que quitar con ella. Ver «Quitar» | 24, 24b, 31 |
| `src/lib/variantes/diferencias.ts` (nuevo) | Los cuatro grupos de RF-20, con `compararAvisos`, `afectadas` y `camposCambiados` de la 005 y etiquetas «ahora» y «quedaría» | 19-21 |
| `src/lib/variantes/aplicar.ts` (nuevo) | `planAplicar(v, quedaria, serie, bloqueada)`: el `Cambio`; las piezas canon que hay que desbloquear; las fichas que hay que crear (con su nombre) y las que hay que cambiar de estado; el resumen de RF-32 con «Pisa lo de ahora en K campos» | 32-35 |
| `src/lib/consecuencias/visor.ts`, `huellas.ts`, `campos-vistos.ts` | Las frases admiten etiquetas («antes/ahora», «ahora/quedaría»). Por defecto, las de la 005 | 17, 20 |
| `src/lib/modelo/deshacer.ts` | `Paso.meta?: MetaPaso` (lo que la variante tenía y tiene de esas piezas: base, `pisa`, `sitios`, `fichas`); `deshacer` y `rehacer` lo devuelven en `ultimoMeta`. `Paso.variante?: { id, cambiada }` | 10, 38 |
| `src/lib/almacen/almacen.ts` | `escribirTodo(carpeta, guardar, borrar)`. Ver «Escribir todo o nada» | 37 |
| `src/lib/almacen/vigilancia.ts` | `_variantes/*.md` y sus conflictos son relevantes, también en el repaso de 10 s. No se recargan como pieza: van a un segundo oyente. Lo escrito por `AlmacenVariantes` cuenta como propio | casos límite |
| `src/lib/wiki/pasar.ts` | `comprobarPasar(fs, vault, m, id, op)`: lo que hoy decide «nombre repetido» y el enlace válido, sin escribir. `pasarAWiki` lo usa | 34b |
| `src/lib/app/sesion.ts` | Ver «Sesión» | 8-13, 32-40 |
| `src/lib/app/sesion-variante.ts` (nuevo) | Ver «SesionVariante» | 5, 8-13, 24, 30 |
| `src/lib/app/estado.svelte.ts` | Ver «Estado de la app» | 1-7, 14-16, 25-27, 32-44 |
| `src/vistas/comunes/BarraSuperior.svelte` | Botón «¿Y si…?» (`flask-conical`) y el menú | 1 |
| `src/vistas/variantes/MenuVariantes.svelte` (nuevo) | Nueva variante; aparcadas (20 y «y N más») con Abrir, Aplicar y el icono de choque; «Aplicadas y descartadas (N)» con Recuperar y Ver; confirmación de aplicar junto a la variante, con los choques si los hay | 1, 4, 32, 33, 42-44 |
| `src/vistas/variantes/BarraVariante.svelte` (nuevo) | `.ysibar`: nombre editable, frase, «Ver ahora / Ver cómo quedaría», «Aparcar variante», «Descartar variante» (porqué en el pie de la barra), «Aplicar» (confirmación en el pie, que pasa a «Desbloquear y aplicar» si hace falta), icono de choque | 2b, 7, 14, 29, 32, 34, 41 |
| `src/vistas/variantes/PestanaYSi.svelte` (nuevo) | La pestaña: grupos, «Lado a lado», «Quitar de la variante» (con su confirmación), «Traer lo de ahora», «Pisa lo de ahora», foco como en `SiLoDejas.svelte` | 19-24, 28-31 |
| `src/vistas/variantes/LadoALado.svelte` (nuevo) | Ventana (`.velo` + `.vent`) con dos columnas, «cambia» y «cambió en la serie»; Esc, «Cerrar» y vuelta del foco (`Capas`) | 23, 44 |
| `src/vistas/panel/Panel.svelte` | Pestaña «¿Y si…?» entre «Si lo dejas así…» y Guía, también sin pieza elegida (con la serie); vuelve a Editar al salir de la variante. «Probar otra versión» y «Versiones (N)». Aviso de RF-15 y `fieldset disabled` con `estado.viendoAhora`. Nota de canon en la variante (RF-11). El retcon (`inicial`) sigue el cambio de sesión | 3, 4, 11, 15, 19 |
| `src/vistas/visor/*.svelte` | Marcas de acento con «ahora» o «quedaría»; con «Si lo dejas así…» abierta, las de la 005 (RF-18) | 17, 18 |
| `src/vistas/Carcasa.svelte` | Clase `ysi-on` y la barra de la variante | 7 |
| `src/vistas/Instantaneas.svelte`, `panel/Guia.svelte` (crear `guia.md`), `comunes/MenuIzquierdo.svelte` (otra serie, papelera), `CampoWiki.svelte` y Wiki (crear ficha) | «Sal de la variante para…» | 12 |
| `src/estilo/componentes.css` | `.ysibar`, `.ysi-on .top`, `.fantasma` (discontinuo `--accent` con texto), `.choque` | 7, 17 |
| `tests/compat/v1/almacen.ts`, `instantaneas.ts`, `fs.ts`, `conflictos.ts` (nuevos, congelados) | Copia tal cual de la etiqueta `v1.0` | 9 (RNF) |
| `docs/diseno.md`, `docs/inventario-v1.md` | Al día | criterios |

## Contratos
```ts
// variantes/tipos.ts
type EstadoVariante = "aparcada" | "aplicada" | "descartada";
interface PiezaVariante {
  tipo: TipoPieza;
  /** escribirPieza de la pieza de la serie (sin wiki_mtime) cuando la variante la tocó; null = nueva */
  base: string | null;
  /** Cómo quedaría; null = a la papelera */
  pieza: Pieza | null;
}
interface DatosVariante {
  id: string; nombre: string; estado: EstadoVariante;
  creada: string; cambiada: string; aplicada: string; descartada: string; porque: string;
  origen: string; elegida: string;
  piezas: Map<string, PiezaVariante>;
  sitios: Map<string, string[]>;               // solo escenas: episodio o bandeja de temporada
  pisa: Map<string, Record<string, unknown>>;
  fichas: Map<string, string>;                 // nombre de ficha elegido al pasar
}
/** Lo que un paso de la variante cambia de sus datos, para deshacerlo (🔴 de la revisión) */
interface MetaPaso { antes: Partial<Pick<DatosVariante, "piezas" | "sitios" | "pisa" | "fichas">>; despues: …mismo… }   // solo las entradas tocadas
type Choque =
  | { clase: "pieza"; id: string; soloSerie: string[]; dosLados: string[]; porDentro: boolean; yaNoEsta: boolean; yaExiste: boolean }
  | { clase: "sitio"; contenedor: string; yaNoEsta: boolean }
  | { clase: "referencia"; id: string; apunta: string };

// app/sesion.ts
interface GuardadoVisible { pendiente: boolean; ultimo: number | null; error: string | null; aviso: string | null; quitarAviso(): void; vaciar(): Promise<void> }
class Sesion {
  protected constructor(...);                     // era private
  readonly guardado: Guardado;                    // la serie; las vistas leen `guardadoVisible`
  get guardadoVisible(): GuardadoVisible;
  /** Edición del autor bloqueada: «Ver ahora» (RF-15) o aplicando una variante; el texto que se enseña */
  edicionBloqueada: string | null;
  readonly variantes: AlmacenVariantes;
  aplicarVariante(v: DatosVariante, quedaria: Modelo, opciones: { desbloquear?: boolean }):
    Promise<{ hecho: true; piezas: number } | { hecho: false; motivo: "choques" | "canon" | "wiki" | "disco" | "instantanea"; avisos: string[]; choques?: Choque[]; canon?: string[] }>;
  alVolverVariante?: (paso: { id: string; cambiada: string }, deshecho: boolean) => Promise<void>;
  protected ponerCambio(cambio, registrar, clave, opciones & { meta?: MetaPaso; variante?: {...} }): void;
  protected persistir(cambio): void;              // serie: guardado.pedir; variante: la variante
}

// app/sesion-variante.ts
class SesionVariante extends Sesion {
  static abrir(serie: Sesion, v: DatosVariante): SesionVariante;
  readonly datos: DatosVariante;
  cerrada: boolean;                               // tras aparcar o aplicar: `aplicar` no hace nada
  choques(): Choque[];  diferencias(): Diferencias; // memo por versión de los dos modelos
  quitar(id: string): { ids: string[]; otras: string[] };  // solo calcula, para confirmar
  quitarYa(ids: string[]): void;                  // un paso de deshacer
  traer(choque: Choque): void;                    // un paso de deshacer
  renombrar(nombre: string): string | null;       // el aviso si recortó
  cerrar(): Promise<void>;                        // vacía el escritor, deja de seguir a la serie
}
```

## Sesión
- **`ponerCambio` y `persistir`.** Son la cola de `aplicar` de hoy, partida en dos para que la subclase la reutilice. La serie hace exactamente lo mismo que antes; los 633 tests lo vigilan (T1).
- **`edicionBloqueada`.** No es `estaBloqueada`: así Ctrl I no manda las ideas a la bandeja (`crear.ts:119`) y el canon sigue igual. Con texto:
  - `editar`, `loSe`, `cambiarEstado`, `pasar`, `desbloquear`, `deshacer`, `rehacer` y `volverAComoEstaba` no hacen nada y dejan el texto en `avisosCambio`;
  - `aplicar` hace lo mismo con lo del autor (`origen` "autor" y sin `enLectura`).

  Los procesos internos siguen: la revisión de fichas (`origen: "canon-wiki"`), la vigilancia, Ctrl I y el «Deshacer» de su tostada (`enLectura: true`).
- **`aplicarVariante`**, con el cerrojo `enteroEnMarcha`. Mientras dura:
  - `edicionBloqueada = "Aplicando «X»…"`;
  - `revisarFichas` y la copia de 30 min esperan (miran el cerrojo);
  - no se deshace ni se rehace.

  Los pasos:
  1. **Vaciar** el guardado de la serie.
  2. **Choques en disco:** `choquesEnDisco` lee y normaliza las notas de la serie de las piezas de la variante, y suma los choques de sitio y de referencia. Si hay alguno, no sigue (RF-33).
  3. **Canon:** `planAplicar` + `bloqueadaQueToca`. Sin `desbloquear`, no sigue y devuelve cuáles (RF-34). Con `desbloquear`, las desbloquea (hasta cerrar la serie, como hoy).
  4. **Wiki:** `comprobarPasar` de cada pieza que hay que pasar (con el nombre de `fichas`) y que exista la ficha de cada pieza enlazada que cambia de estado, con los textos de la 001. Si algo falla, no sigue (RF-34b).
  5. **Instantánea automática** (`instantaneas.crear()`), aunque la versión no haya cambiado (RF-36). Si falla, no sigue: no se aplica sin copia.
  6. **Notas** con `almacen.escribirTodo` (RF-37). Si falla, no sigue y lo dice.
  7. **Wiki** (RF-37b):
     - `sincronizarFichas` en modo entero para los estados de las fichas enlazadas;
     - después, `pasarAWiki` de las que hay que crear;
     - y `escribirTodo` otra vez, solo con el enlace a la ficha de esas piezas.

     Si algo falla:
     - las fichas ya cambiadas vuelven;
     - las notas vuelven a su texto de antes con `escribirTodo`, con lo de la papelera fuera y lo creado dentro;
     - se dice lo que queda en la wiki con el texto de la 005 (RF-21);
     - no se aplica nada.
  8. **Modelo, historial y papelera** con `ponerCambio`:
     - un paso `entero`, exacto (sin `olvidarCrudos`) y con `variante: { id, cambiada }`;
     - con las piezas finales, también el enlace a la ficha;
     - `enPapelera` con las rutas de la papelera, para que Ctrl Z las saque.
  9. Tras cada espera de los pasos 2 a 7, «sigue igual» (como el modo entero de la 005). Si algo cambió en la serie, se vuelve atrás como en el paso 7 y se dice «Algo cambió mientras tanto».
- **Escribir todo o nada (`escribirTodo`).**
  - **Texto de antes:** el que se lee del disco al empezar, nunca la base de la variante (puede estar manipulada).
  - **Cada nota** se escribe con la comprobación de base (`guardar(…, { base })`). Antes, se comprueba que la ruta resuelta está dentro de la carpeta de la serie.
  - **Si algo falla** (`CambioFuera` o error):
    - lo escrito vuelve a su texto de antes;
    - lo mandado a la papelera vuelve a su sitio;
    - lo creado va a la papelera;
    - después lanza el error.
  - **Si falla la propia vuelta atrás,** lo dice y nombra la instantánea del paso 5.
- **Deshacer y rehacer un paso con variante.** Van por el camino entero de la 005. Si salen bien, `alVolverVariante`:
  - al deshacer, la variante queda aparcada;
  - al rehacer, solo se marca aplicada si su `cambiada` es la del paso. Si no, se queda aparcada y lo dice: «La variante «X» ha cambiado desde que se aplicó: queda aparcada».
  - Si no se puede escribir la nota de la variante, el escritor reintenta y lo dice en el pie, como el guardado.
- **Vigilancia.** Lo de `_variantes/` va a `variantes.releer(rutas)`. Pone al día la lista y, si es la abierta y no es lo propio, avisa a la `SesionVariante` (casos límite).

## SesionVariante
- **Al abrir:**
  1. se vacía el guardado de la serie;
  2. `modeloQuedaria` y una `Sesion` con ese modelo.

  Comparte con la serie, copiándolos cada vez que esta avisa: `almacen`, `wiki`, `fichas`, `guia`, `problemas` y `conflictos`. No tiene vigilancia, aviso de uso, temporizadores ni instantáneas. `guardadoVisible` es su `EscritorVariante`.
- **Métodos que sobrescribe:**
  | Método | En la variante |
  |---|---|
  | `aplicar` | Ver abajo |
  | `estaBloqueada` | false (RF-11); `canonEnSerie(id)` para la nota del panel |
  | `cambiarEstado` | `conEstado` sin `pasarAWiki`: un borrador sin ficha espera a aplicar |
  | `pasar(id, nombre)` | Lo mismo, y apunta el nombre en `fichas` |
  | `leerWiki`, `revisarFichas`, `leerGuia` | Delegan en la serie (así no meten «canon desde la wiki» como piezas de la variante) |
  | `crearFicha`, `crearGuia`, `desbloquear`, `copiaAutomatica` | No hacen nada; dicen «Sal de la variante para…» (RF-12) |
  | `avisosAlVolver` | Vacío: en la variante no hay fichas |
  | `deshacer`, `rehacer` | Los de siempre, y después devuelven `ultimoMeta` a los datos de la variante |
  | `cerrar` | Vacía el escritor, deja de seguir a la serie y marca `cerrada` |
- **`aplicar(cambio, registrar, clave, opciones)`:**
  1. si `cerrada`, no hace nada;
  2. `avisosCambio = []` y `olvidarCrudos` como hoy;
  3. calcula `meta` con las entradas de la variante que va a tocar, antes y después;
  4. llama a `ponerCambio`, con `meta`;
  5. apunta cada pieza con `persistir`:
     - si no estaba en la variante, su base es `escribirPieza` de la pieza de la serie (null si no existe en la serie);
     - si queda igual que su base (o es nueva y va a la papelera), sale de la variante y `sacarDeVariante` pone en el modelo lo de la serie de ahora (🟡 11);
     - si cambia de episodio, de orden, de acto o de bandeja, o es una escena nueva, se apunta en `sitios` el orden de la serie de su contenedor de antes y del de ahora, si aún no estaba. Un contenedor sin piezas de la variante sale de `sitios`;
  6. llama a `limpiarPisa` y el escritor pide guardar.
- **Seguir a la serie.** Un oyente de la sesión de la serie llama a `seguirSerie`, que pone sin historial lo que la variante no toca, lo anota como `"fuera"` en la comparación y avisa. Choques y diferencias se recalculan por versión.
- **`quitarYa`** y **`traer`** son cambios normales de la variante: un paso de deshacer cada uno, con su `meta`.
- **El deshacer** es el `historial` propio. Se pierde al cerrar la variante (RF-10).

## Quitar (RF-24, RF-24b)
- Se quita la pieza y, en cadena:
  - lo que contiene, si es nueva (una temporada nueva: sus episodios y escenas; un episodio nuevo: sus escenas);
  - de cada episodio o bandeja de `sitios` que la pieza toca, las escenas de la variante cuyo único cambio es el número (las renumeró un movimiento);
  - de la lista de su contenedor (`temporada.episodios`, `serie.temporadas`), la entrada, si la pieza es nueva. Si la lista era el único cambio de esa pieza, sale entera.
- Se repite hasta que en cada contenedor tocado no hay **más** números repetidos que en la serie de ahora, ni hijos sin padre. Es la regla «no peor que ahora»: mover una escena no renumera su episodio de origen (`actos.ts:65`), así que la serie ya puede tener huecos y no se exige quitarlos.
- `otras` son las que se quitan además de la elegida. Si hay alguna, la pestaña pide confirmar antes.

## Estado de la app
- `sesionSerie` (la de siempre), `variante: SesionVariante | null` y `viendoAhora: boolean`. `sesion` (lo que leen las vistas) es `viendoAhora || !variante ? sesionSerie : variante`. Al cambiar, sube `version`.
- **`abrirVariante(id)`, `nuevaVariante()` y `probarOtraVersion(piezaId)`:**
  1. aparcan la abierta si hay una (RF-6);
  2. abren la nueva;
  3. eligen la pieza: `elegida`, el origen o la de antes; si no existe, la que la contiene, y lo dicen (RF-16);
  4. empiezan la comparación.

  Una variante aplicada o descartada no se abre.
- **`verAhora(si)`:**
  - cambia `viendoAhora`, y con él `sesionSerie.edicionBloqueada` (texto de RF-15);
  - elige la misma pieza o la que la contiene, y lo dice;
  - empieza la comparación de cero (RF-13, RF-16).
- **`aparcar()`:**
  1. vacía el escritor y apunta `elegida`;
  2. si la variante no tiene piezas, la manda a la papelera de la serie (RF-26);
  3. `variante = null`, `viendoAhora = false`;
  4. la serie sale de la edición bloqueada;
  5. la pestaña «¿Y si…?» pasa a Editar;
  6. elige la pieza (RF-25).

  Cerrar la app o la serie también aparca (RF-27). Cambiar de serie con una variante abierta no se puede: «Sal de la variante para…» (RF-12).
- **Al abrir la serie,** las variantes sin piezas pasan a la papelera (RF-26, tras un cierre a medias).
- **`descartar(porque)`, `recuperar(id)` y `renombrar(nombre)`:** escriben la nota por `AlmacenVariantes`.
- **`aplicarVariante(id, { desbloquear })`:**
  1. Si es la abierta, vacía su escritor sin aparcarla.
  2. Llama a `sesionSerie.aplicarVariante`: comprueba todo antes de escribir nada.
  3. Si no sale (choques, canon, wiki, disco):
     - la variante sigue como estaba, con su deshacer;
     - si estaba abierta, la pestaña «¿Y si…?» se abre en «Choques» (RF-33);
     - si se aplicó desde el menú o «Versiones», los choques se dicen en la confirmación, sin abrir nada;
     - con canon, la confirmación pasa a «Desbloquear y aplicar».
  4. Si sale:
     - se cierra la variante si estaba abierta (sin RF-26);
     - estado «aplicada» con su fecha;
     - se vuelve a la serie;
     - aviso «Aplicada «X»: N piezas.» (RF-39).
- **`guardarIdea`** (Ctrl I) siempre usa `sesionSerie` con `enLectura`, y el nivel validado en el modelo de la serie (`nivelValido`). Si el episodio del nivel solo existe en la variante, `nivelValido` lo sube a su temporada o a la serie (RF-8b). `deshacerIdea` también usa `sesionSerie`.
- **Las operaciones asíncronas** (`moverEscena`, `crearNueva`, `volverAComoEstaba`) guardan la sesión al empezar. Si al acabar `estado.sesion` es otra, no eligen nada. Las de una variante cerrada no hacen nada (`cerrada`).
- `Pestana` lleva `"ysi"`. `ladoALado: { pieza: string; variante: string; de: "abierta" | "aparcada" | "aplicada" } | null`.

## Diferencias, en detalle (RF-17, RF-20)
- Es la comparación de la 005 con la serie como base y «Cómo quedaría» como «ahora», sin pieza abierta.
  - Grupo 3: primero las piezas de la variante (con `camposCambiados` y las frases de `afectadas`), después las demás de `afectadas`, con «afectada».
  - Las frases dicen «ahora …» y «quedaría …».
- La cifra (RF-19) suma las entradas de los grupos 1 a 3. «N piezas» (RF-32, RF-39) son las de la variante.
- En el visor:
  - `marcasVisor(serie, quedaria, nivel, afectadas)`, o al revés con «Ver ahora»;
  - clase `.fantasma` (acento), etiqueta «ahora» o «quedaría»;
  - con «Si lo dejas así…» abierta, las marcas de la 005 y no estas (RF-18).

## Seguridad
- **La nota de la variante es una entrada que no es de fiar:** llega sincronizada o editada a mano.
  - **Ids:** con una expresión estricta, `^[a-z]{2}-[a-z0-9]{4,12}$`, y el prefijo de su tipo, en la cabecera (`id`, `origen`, `elegida`, `piezas`, claves de `sitios`, `pisa` y `fichas`) y en cada bloque. El `id` de la nota de dentro tiene que ser igual al del bloque. Así, `ev-../../x` no pasa (🔴 de la revisión).
  - **El resto de la cabecera:** `id` de variante con `va-` e igual al nombre del fichero; ids repetidos, no; estado entre los tres; fechas con su forma; nombre, porqué y nombres de ficha, limpiados y recortados.
  - **Si algo no vale,** la variante se aparta como fichero roto, con su motivo, y no se abre ni se aplica.
- **Rutas:**
  - siempre con `rutaPieza(carpeta, { tipo, id })` y el id ya validado;
  - `escribirTodo` comprueba además que la ruta resuelta queda dentro de la carpeta de la serie;
  - el nombre de la variante nunca es una ruta;
  - los enlaces a fichas pasan por la comprobación de la 001 (RF-33).
- **Tamaño:** `Fs` no sabe el tamaño sin leer. Se lee la nota y, si pasa de 5 MB, se aparta sin analizarla, para que una nota manipulada no cuelgue la app. Sin tocar `src-tauri/`.
- **Texto plano:** nombre, porqué y textos de la serie se pintan como texto, sin `{@html}`.
- Nada sale del equipo y no se registra nada nuevo.

## Rendimiento
- `modeloQuedaria` copia mapas sin clonar piezas, como `copiaModelo`. `seguirSerie` compara por referencia.
- El escritor guarda el texto de cada bloque; una tecla solo serializa la pieza cambiada.
- Los choques de las aparcadas se calculan al enseñar el menú o «Versiones», con las notas ya leídas, y se recuerdan por versión del modelo de la serie.
- Diferencias y choques de la abierta: una vez por versión de los dos modelos, en diferido (150 ms), como la cifra de la 005.
- Tests con la serie grande y con margen, como los de la 002 y la 005:
  - abrir la serie con 50 variantes: menos de 200 ms más que sin ellas;
  - abrir una variante de 50 piezas: menos de 300 ms;
  - cambiar entre «Ahora» y «Cómo quedaría» (cambiar de sesión y empezar la comparación): menos de 100 ms;
  - `seguirSerie` tras releer una nota: menos de 20 ms;
  - una edición en la variante (aplicar más `persistir`): menos de 10 ms;
  - diferencias tras editar un título: menos de 50 ms;
  - choques de 50 variantes: menos de 300 ms;
  - aplicar 200 piezas en el disco en memoria: menos de 2 s.

## Tests (ligeros: lógica, disco, canon y v1.0)
| Archivo | Qué prueba |
|---|---|
| `tests/variantes/formato.test.ts` | Ida y vuelta exacta (campos desconocidos, `crudos`, texto con `~~~`); valla más larga; papelera y nueva; manipuladas apartadas: `ev-../../x`, tipo falso, id distinto, id repetido, `va-` que no casa, estado raro, más de 5 MB |
| `tests/variantes/nombres.test.ts` | Nombre por defecto y « (2)»; recorte a 120 y 500; saltos y caracteres de control; `nuevoIdVariante` |
| `tests/variantes/sesion-variante.test.ts` | Ver «Tests de la sesión de la variante» |
| `tests/variantes/choques.test.ts` | Los tres tipos; «por dentro» con un campo desconocido; formato de Obsidian (listas en bloque) no es choque, ni en el modelo ni en disco; `wiki_mtime` no cuenta; renumerar en la serie, choque de sitio; id nuevo que ya existe |
| `tests/variantes/traer.test.ts` | A tres bandas por campo, con `crudos` y en `extra`; `pisa` y su salida; sitio con vecina y sin ella; sin repetidos |
| `tests/variantes/quitar.test.ts` | Pieza sola; temporada nueva con lo que contiene; escena movida entre dos episodios con sus renumeradas; «Lo sé»; serie; lista del contenedor; «no peor que ahora» con huecos previos |
| `tests/variantes/diferencias.test.ts` | Grupos y orden; afectadas; avisos que saltarían y que dejarían de avisar; cifra; rendimiento |
| `tests/variantes/aplicar.test.ts` | Ver «Tests de aplicar» |
| `tests/variantes/almacen-variantes.test.ts` | Cabeceras; un solo camino de escritura en cola; cambio de fuera; vacía a la papelera (al aparcar y al abrir la serie); conflicto asociado a su variante y apartado; rendimiento con 50 |
| `tests/almacen/vigilancia.test.ts` | Un cambio en `_variantes/` va al segundo oyente, no se recarga como pieza, lo propio se ignora y el repaso de 10 s lo ve |
| `tests/compat.test.ts` | Con el `almacen` y las `instantaneas` congelados de la v1.0: la serie con `_variantes/` se abre igual, una instantánea no la incluye y restaurar no la toca; la v1.0 lee lo que escribe «Aplicar» |

**Tests de la sesión de la variante:**
- editar, crear, mover, mandar a la papelera, «Lo sé», cambiar de estado, pasar y tocar canon no escriben en la serie, la wiki ni el Log: el disco en memoria queda intacto salvo `_variantes/`;
- el deshacer es propio y el de la serie queda intacto;
- escribir y borrar no deja nada, y la pieza que sale queda con lo actual de la serie;
- deshacer y rehacer «Traer lo de ahora» y «Quitar» devuelven la base, `pisa` y `sitios`;
- una base tomada de una nota con formato de Obsidian no da choque;
- sigue a la serie;
- Ctrl I en nivel episodio va a la serie, no a la bandeja, y su «Deshacer» también;
- «Ver ahora» bloquea lo del autor pero no la revisión de fichas;
- `leerWiki` desde la variante no crea piezas en ella;
- una variante cerrada no aplica nada.

**Tests de aplicar:**
- lo que queda en disco es «Cómo quedaría» exacto;
- choques, también un cambio de fuera entre la comprobación y la escritura;
- canon y «Desbloquear y aplicar»;
- wiki: nombre repetido, ficha que falta, pasar a borrador con su ficha, su Log y el nombre elegido;
- la instantánea, y que sin ella no se aplica;
- fallo a medias en el disco en memoria:
  - nada cambia: lo escrito vuelve y lo creado va a la papelera;
  - lo mandado a la papelera vuelve;
  - con la wiki ya tocada, se dice lo que queda;
- una edición del autor durante el aplicar se rechaza;
- es un paso: Ctrl Z deja la variante aparcada y saca lo de la papelera; Ctrl Y la deja aplicada; Ctrl Y tras editar la variante deshecha la deja aparcada y lo dice;
- un fallo al escribir el estado de la variante se dice y se reintenta;
- las otras variantes pasan a tener choques;
- la v1.0 lee lo escrito (`leidoPorV1`).

La interfaz (barra, menú, pestaña, lado a lado, visor, edición bloqueada) se prueba en el navegador con la serie de prueba.

## Decisiones técnicas
| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Una `SesionVariante` (subclase) en `estado.sesion` | Un «modo» dentro de `Sesion` con `if` en cada método | Las vistas no cambian; el deshacer y la comparación propios salen solos; la serie solo cambia en la parte común de `aplicar` |
| Base = `escribirPieza` normalizado | Texto crudo de `conocidoDe` / bytes del disco | Lo crudo daría choques por formato nada más tocar la pieza (🔴 de la revisión) |
| `meta` en los pasos de la variante | Conservar la primera base aunque la pieza salga | Deshacer «Traer» o «Quitar» tiene que devolver también la base y `pisa`, si no la variante pisaría sin avisar (RF-30c) |
| `edicionBloqueada` aparte de `estaBloqueada` | Reutilizar el bloqueo de canon | No cambia Ctrl I, el canon ni los procesos internos |
| Notas, y después la wiki | La wiki antes | Es lo que dice la spec (RF-37b); el enlace a la ficha se escribe en una segunda pasada dentro del mismo paso |
| Una sola nota por variante, con un solo camino de escritura en cola | Una carpeta por variante, o dos escritores | Escribir es atómico, un conflicto de Proton afecta a un fichero y nada se pisa a sí mismo |
| `sitios` solo para escenas | También episodios y temporadas | Su orden vive en la nota de la temporada y en `serie.md`: ya da choque de pieza |
| Sin `Modelo.reservados` | Reservar ids de las variantes en la serie | La colisión es casi imposible y ya es choque; así no hay que leer los bloques al abrir |
| Congelar `almacen` e `instantaneas` de la v1.0 | Probar solo que `_variantes` no está en `CARPETA` | La spec pide probarlo con el código de la v1.0 |

## Riesgos y vuelta atrás
- **Partir `aplicar` en `ponerCambio` y `persistir`** toca el corazón de la serie. Va en la primera tarea, sin cambiar nada más, con los 633 tests en verde antes de seguir.
- **Vistas que guardan cosas de la sesión anterior** al cambiar `estado.sesion`. Se sube `version`, se revisan `Panel.svelte` (`inicial`) y las operaciones asíncronas del estado, y se comprueba en el navegador cada vista con «Ver ahora», ida y vuelta.
- **Seguir a la serie:** solo la abierta sigue a la serie; las aparcadas no tienen modelo.
- **Un fallo a medias al aplicar** deja en la wiki las fichas nuevas, que no se borran (constitución 2). Se dice, y la instantánea de antes permite volver.
- **Vuelta atrás:** la rama no toca el formato de las notas de las piezas. Si algo sale mal, se borra la rama y `_variantes/` se queda como notas sueltas que nadie lee.
- **Tamaño:** son unas 3.000 líneas, el cambio más grande hasta ahora. Va en tareas pequeñas, con commit y `verificar` en cada una, en cuatro bloques que se pueden probar solos: núcleo y guardado → abrir, ver y aparcar → comparar → choques, aplicar y descartar.
