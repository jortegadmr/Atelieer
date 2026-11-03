# Plan técnico — Spec 009 «Línea de la historia, fichas y lo pendiente»

> Cómo se construye. Respeta docs/constitucion.md y cubre RF-1 a RF-57 de spec.md.
> Versiones: las de la 008 (Tauri 2, Svelte 5, `yaml` 2.9, Vitest, `@lucide/svelte`). Sin dependencias nuevas. Sin tocar `src-tauri/` ni el formato de las notas de las piezas.

## Idea general
- **La línea es una vista más**, como Tramas: `Vista` gana `"historia"`. El visor de arriba se queda en su nivel (`nivelAlCambiarVista` devuelve el anterior). Pulsar una columna del visor lleva a su vista (lo que ya hace `irANivel`).
- **Mover de época = editar un campo.** Es `editar(modelo, id, e => e.mundo = valor)` aplicado con `Sesion.aplicar(cambio)` **sin clave**: un paso de Ctrl Z por movimiento (RF-27), como `moverEscena`. Pasa por el bloqueo de canon, por «Si lo dejas así…» y, en una variante, por `SesionVariante.aplicar` (RF-25, RF-27b, RF-28). Nada nuevo en disco: `mundo` ya es campo de la v1.
- **Las épocas salen de `Wiki`.** Se añade una lectura ordenada (`epocas()`) que guarda el orden de las filas de la Timeline y la fila «Presente». `de("era")` y el campo «Cuándo ocurre en el mundo» siguen igual, salvo que los nombres de la Timeline llegan limpios (sin `[[ ]]` ni negritas).
- **Marcas (B, C):** la decisión «gris o acento, y contra qué modelo» que hoy está dentro de `Visor.svelte` pasa a una función común. Cada vista pide sus marcas a una función pura de `src/lib/consecuencias/`.
- **Escribir en la wiki (D, E, F):** tres módulos puros que transforman el texto de la ficha (apartados, tabla de alternativas, `estado_canon`). Un solo camino de escritura: comprobar que no cambió, `escribirSeguro` y apuntar en el Log. Siempre dentro de `narrativa` (`rutaFicha`).
- **Lógica en `src/lib/`, vistas solo pintan.** Tests solo de lo que escribe en disco o en la wiki, del canon, de la variante y de lo que lee la v1.0 (decisión del autor en la 003). La interfaz se comprueba en el navegador.

## A. Línea de la historia

### Épocas (`src/lib/wiki/md.ts`, `src/lib/wiki/fichas.ts`)
- `md.ts`:
  - `nombreLimpio(s)`: quita `[[ ]]` de fuera y la parte `|texto`, `**`, `__`, `*` y `_` de los extremos; junta espacios; recorta.
  - `celdas(linea)`: no parte por `\|` (barra escapada) y la deja como `|` en la celda. Afecta también al Motor y a la escaleta, que solo leen: mejora.
  - `clave(s)` usa `nombreLimpio` antes de quitar acentos y mayúsculas.
- `fichas.ts`:
  - `leerTimeline` guarda cada fila en orden con `nombre = nombreLimpio(f[0])`.
  - `cargar` guarda también `this.ordenTimeline: string[]` (claves de las filas, en orden, con duplicados quitados) y si hay fila «Presente».
  - `epocas(): Epoca[]`, con `Epoca = { nombre: string; claves: Set<string>; ruta: string; presente: boolean }`, en el orden de RF-4:
    1. filas de la Timeline (la de «Presente» es la época presente);
    2. fichas de la carpeta de épocas sin fila, por nombre (`localeCompare` `es`).
    - Se juntan por **mismo nombre**: una ficha cuyo nombre o alias coincide con una fila se pone en el sitio de la fila; dos fichas iguales en subcarpetas, una. El `nombre` que se escribe es el de la ficha si la hay; si no, el de la fila.
    - Una ficha o fila «Presente» no da época aparte: marca `presente`.
  - `lectura: number`: distinto en cada `cargar()`, también entre instancias (`Sesion.leerWiki` crea una `Wiki` nueva cada vez). Lo usa el arrastre (caso límite «la wiki se relee mientras se arrastra»).
  - `rutaTimeline`: la ruta si la nota existe, para «Abrir la Timeline» (RF-11).
  - `esPresente(epoca)`: vacía, «Presente» o un alias de una ficha «Presente».
- `clave` no cambia (la usan pasar.ts y otras 16 llamadas: `_Notas` y `Notas` deben seguir distintas). Las épocas usan `claveLimpia = clave(nombreLimpio(s))`. `nombreLimpio` solo quita `|texto` dentro de `[[…]]`.

### Línea (`src/lib/vistas/historia.ts`, nuevo)
```ts
type IdColumna = "presente" | "fuera" | `e:${string}`;   // e:<clave de la época>
interface Columna { id: IdColumna; nombre: string; epoca: Epoca | null; escenas: Evento[]; soltable: boolean; porQueNo?: string }
columnasHistoria(m: Modelo, epocas: Epoca[], filtro: string /* "" = toda la serie */): Columna[]   // RF-4 a RF-7, RF-12, RF-14
temporadaDeEscena(m, ev): string                 // "" = Sin temporada
dondeSeEmite(m, ev): string                      // «T01E03 · 2», «Bandeja T01», «Sin temporada» (RF-8)
valorMundo(c: Columna): string                     // «[[Nombre]]» o "" (RF-18)
cambioDeEpoca(m, id, c: Columna): Cambio | null  // null si ya está en esa columna (RF-23); solo `mundo` (RF-21)
porQueNoSeCambia(m, id, c, bloqueada): string | null   // canon (RF-25), «No está en la wiki» (RF-22), nombre no enlazable (RF-26), escena borrada
pasoHistoria(columnas, id, "izq" | "der"): { columna: Columna } | { borde: string }    // salta «fuera»; «Ya está en la primera/última época» (RF-19, RF-20)
anuncioEpoca(c): string                          // «Pasa a «La Inundación»» / «Pasa al presente» (RF-29)
```
- Época de una escena: `nombreLimpio(ev.mundo)`; vacío o «Presente» → columna presente.
- La columna de cada escena se busca en un `Map<clave, Columna>` con las claves y alias de cada época: O(escenas + épocas).
- Orden de emisión: posición de su temporada, de su episodio (`indice().posEpisodio`) y `orden`; la bandeja detrás de los episodios de su temporada; «Sin temporada» al final.
- Nombre no enlazable: `/[[\]|#^\u0000-\u001f\u007f]/`.

### Estado (`src/lib/app/estado.svelte.ts`)
- `filtroHistoria = $state("")`: en memoria. Si la temporada deja de existir, la vista enseña «Toda la serie» (RF-15). Al abrir la serie, `""`.
- `cambiarEpoca(id, columnaId, lectura?)`: con el mismo cerrojo que `moverEscena` (`moviendo`, `ignorado`) y su propio `avisoHistoria` y `anuncioHistoria`; el aviso de «guardando» del cerrojo va al sitio de quien llama (la línea, no el visor).
  - Si `lectura` no es la de ahora, no hace nada: «La wiki cambió mientras arrastrabas: no se ha movido.».
  - Después `porQueNoSeCambia` y `s.aplicar(cambioDeEpoca(...))`.
- `moverEpocaConTecla(id, "izq" | "der")`: en la cola `colaTeclas`, calculado sobre lo ya movido.
- Con «Ver ahora» (`viendoAhora`), la sesión de la serie tiene la edición bloqueada: `aplicar` lo rechaza y la vista no deja arrastrar (RF-28).
- `abrirHistoria()`: `cambiarVista("historia")` y `sesion.leerWiki()` (RF-3); el botón «Volver a leer la wiki» llama a lo mismo (RF-3b). En una variante, `SesionVariante.leerWiki` ya no crea piezas.

### Vistas
- `src/vistas/comunes/MenuIzquierdo.svelte`: entrada «Línea de la historia» en «Estructura», debajo de las temporadas (RF-1).
- `src/vistas/Carcasa.svelte`: `vista === "historia"` → `Historia.svelte`.
- `src/vistas/Historia.svelte` (nuevo):
  - cabecera con selector de temporada, «Volver a leer la wiki» y la zona `aria-live` del aviso;
  - caja con desplazamiento a lo ancho (`overflow-x: auto; min-width: 0`), columnas en fila, cada una con nombre, número y tarjetas;
  - textos de vacío (RF-11, RF-12) y «Abrir la Timeline» con `wiki.urlObsidian` si la nota existe.
- `src/vistas/historia/TarjetaHistoria.svelte` (nuevo): título, `dondeSeEmite`, el modo con `etiqueta(MODO, …)` del panel, `Madurez` (solo un punto con `title`) más el nombre del estado en texto visible (aparcado atenuado y descartado tachado). Intro abre en el panel (`estado.elegir`); Alt + ←/→ mueve.
  - Tras mover, `await tick()` y foco en la tarjeta por `data-id` (RF-19): Svelte crea un nodo nuevo en la otra columna.
- `src/vistas/historia/arrastre-historia.ts` (nuevo), como `arrastre-visor.ts`:
  - MIME propio `application/x-atelier-escena-historia`, **sin** `text/plain`;
  - testigo en memoria `{ id, serie, lectura }`;
  - el visor y la rejilla no conocen este MIME, así que no aceptan estas tarjetas;
  - la línea solo acepta su MIME con testigo de la misma serie (RF-24);
  - los ficheros de fuera, `dropEffect = "none"`;
  - Esc o soltar fuera limpia el testigo sin cambiar nada (RF-23);
  - `estado.arrastrando` se pone en `dragstart` y se quita en `dragend`, para que Esc no suba el visor (`Carcasa.svelte`).

## B. Marcas en Tramas, la rejilla y la línea
- `src/lib/consecuencias/fuente.ts` (nuevo): `fuenteMarcas({ pestana, sesion, sesionSerie, variante, viendoAhora })` → `{ base, actual, ids, fantasma, textos } | null`.
  - Es la regla que hoy vive en `Visor.svelte`: con «Si lo dejas así…» abierta y cambios, gris (también dentro de una variante, RF-32); si no, con variante y diferencias, acento.
  - `Visor.svelte` pasa a usarla, sin cambiar lo que enseña.
- `src/lib/consecuencias/vistas.ts` (nuevo), funciones puras sobre `(base, actual, ids)`:
  - `marcasTramas(...)`:
    - por arco, los campos de tarjeta cambiados con su texto de antes, con los mismos datos y recortes que «Lo cambiado» de la 005 (`camposCambiados` y `CAMPOS_VISTOS`); la marca va debajo del campo;
    - `nuevas` en la lista de arcos;
    - `yaNoEsta` con título, al final de la lista.
  - `marcasRejilla(..., temporada)`:
    - por celda (`arco|episodio`), el papel de antes;
    - `estabanAqui` por celda;
    - `nuevas` (escenas).
  - `marcasHistoria(..., epocas, filtro)`:
    - `estabanAqui` por columna (la escena estaba en esa columna y ahora está en otra);
    - `nuevas`.
- RF-33b: con «Si lo dejas así…» abierta, elegir desde Tramas, la rejilla o la línea usa el mismo camino que bajar en el visor (005, RF-25): no cambia la pieza del panel. `estado.pulsarEscena(id)` (y lo mismo al ver otro arco) solo llama a `elegir` fuera de esa pestaña o sin comparación.
- Cada vista pinta con las clases ya existentes de las marcas del visor (gris discontinuo / acento, `TEXTOS_ANTES`, `TEXTOS_QUEDARIA`, `TEXTOS_AHORA`). Las marcas van en línea o como marca fina absoluta, sin mover nada (RF-33), con texto visible o `aria-label`.

## C. Arcos y secretos con variante en el visor
- `src/lib/variantes/visor.ts`: `marcasVariante` añade `solo: Map<id de columna, "ahora" | "variante">` cuando la pieza elegida es un arco o un secreto con diferencias. «Con diferencias» se mide por dónde pasa (`episodiosDe` y `temporadasDe` distintos en los dos modelos), no por su nota: un arco cuya nota no cambia pero cuyas escenas se mueven también cuenta. Solo la lleva una columna por la que la pieza pasa en un modelo y no en el otro (`episodiosDe` y `temporadasDe` de `consecuencias/visor.ts`, que se exportan).
- `Columna.svelte` enseña «solo ahora» / «solo en la variante» con la marca de acento. El resaltado de las dos ya lo hace `marcasVariante` con los ids; con «Si lo dejas así…» abierta manda la fuente gris (RF-32, RF-34).

## D. Pestaña «Ficha»
- `src/lib/wiki/apartados.ts` (nuevo, puro):
```ts
interface Apartado { titulo: string /* "Inicio" para lo de antes */; desde: number; hasta: number /* offsets en el texto crudo */; texto: string /* con \n */ }
partirApartados(texto): Apartado[]            // tras las propiedades; cuenta `## ` a principio de línea fuera de bloques ``` / ~~~ y de comentarios <!-- -->
cambiarApartado(texto, i, nuevo): string      // solo [desde, hasta); usa el fin de línea de la nota (\r\n o \n), conserva el salto final del apartado y el BOM
porQueNoSeGuarda(texto, i, nuevo): string | null  // RF-37b: línea `## ` → «Los apartados se crean en Obsidian.»; `---` al empezar Inicio sin propiedades → «Eso rompería las propiedades.»
```
  - El texto del apartado es lo que hay **debajo** de su título (el título no se edita, RF-44).
  - Fuera del trozo cambiado, el texto queda igual byte a byte (test con `\r\n`, BOM, sin salto final, títulos repetidos, `##` en código y en comentario).
  - «Inicio» va de después de las propiedades al primer título; las propiedades no se enseñan.
- `src/lib/wiki/editar-ficha.ts` (nuevo):
```ts
leerFicha(fs, vault, rutas, p): Promise<FichaLeida | null>   // { ruta, texto, fecha, apartados, estadoWiki }; null si no hay ruta (`rutaFicha`) o no existe (RF-43)
guardarApartado(fs, vault, rutas, leida, i, nuevo, op: { fecha, hora, copia: string | null, log: boolean }): Promise<ResultadoGuardar>
  // ok → { ok: true, leida: nueva lectura }
  // { ok: false, motivo: "cambió fuera" | "no se pudo escribir", mensaje }
```
  - Cambió fuera = el texto del disco ya no es `leida.texto`. La fecha sola no cuenta (el servicio de sincronización la mueve).
  - Si cambió fuera, no se escribe (RF-38).
  - Con `copia`, antes de escribir, guarda el texto de antes en `appDatos/<serie>/_fichas/<AAAA-MM-DD HH-MM-SS> <Nombre>.md.bak` con `escribirSeguro`; si ese nombre ya existe, añade ` (2)`, ` (3)`…
    - Fuera de `CARPETA`: la v1.0 no lo lee (`listarSeries`, `abrirSerie`, instantáneas y papelera solo recorren `CARPETA`).
    - Al acabar en `.bak`, Obsidian no lo enseña ni lo enlaza (RF-39).
  - Con `log`, apunta «Editada desde Atelier: [[Nombre]]» con el apartado (RF-39b).
  - Las copias de `_fichas/` no se borran nunca.
- `Sesion`:
  - `leerFichaDe(id)`;
  - `guardarApartado(id, leida, i, nuevo)`, con dos `Set` en memoria desde que se abrió la serie: fichas ya copiadas (RF-39) y `ruta|apartado` ya apuntados en el Log (RF-39b);
  - **un solo camino para escribir en una ficha** (`escribirEnFicha`), que usan D, E y F:
    1. `await this.fichaPendiente?.()`: la pestaña registra ahí su guardado de lo pendiente (RF-38);
    2. lee, comprueba, escribe con `escribirSeguro`;
    3. pone al día `wiki_mtime` de la pieza con la fecha nueva, salvo que ya estuviera marcada como cambiada fuera (RF-39c), con un método propio (`ponerFechaFicha`): `modelo.poner` y `persistir`, sin vaciar `avisosCambio`, sin bloqueo de canon, sin `comparacion.anotar` y sin paso de Ctrl Z;
       - al deshacer o rehacer, la pieza conserva su `wiki_mtime` de ahora (como `olvidarCrudos`), para que no salga un «Cambió en la wiki» falso;
    4. sube `fichasEscritas` (contador por ruta) para que la pestaña vuelva a leer y no lo tome por «cambió fuera»;
    - `sincronizarFichas` (estado, Ctrl Z, Ctrl Y, «Volver») hace también los pasos 1 y 4;
    - el canon bloqueado no se comprueba aquí: lo comprueba cada uno (la pestaña, RF-41; E, RF-45b; F, RF-55b);
  - no pasa por el historial (RF-40);
  - con `edicionBloqueada` o canon bloqueado no escribe (RF-41); con «Ver ahora» el texto es el de `edicionBloqueada` (`VIENDO_AHORA`);
  - `SesionVariante.guardarApartado` lo rechaza con «La wiki solo cambia al aplicar la variante.» (RF-42).
- Panel:
  - `Pestana` gana `"ficha"`; la pestaña va después de Guía. Si sale se decide al momento, sin leer: `sesion.fichas` dice que existe y `rutaFicha` da ruta (RF-35, RF-43). El texto se lee dentro de la pestaña, y una respuesta que llega cuando ya se eligió otra pieza se tira;
  - `src/vistas/panel/PestanaFicha.svelte` (nuevo):
    - nombre, estado en la wiki, «Abrir en Obsidian»;
    - un `<textarea>` por apartado, que crece con el texto;
    - guarda al salir del campo y a los 2 s sin escribir;
    - registra `sesion.fichaPendiente` mientras hay texto sin guardar; `EstadoApp` lo llama antes de cambiar de pieza, vista o serie, abrir o cerrar variante, «Ver ahora» y pasar a canon (RF-37c); si falla, lo dice;
    - en solo lectura, `readonly` con su porqué.
  - Si al cambiar de pieza la pestaña «Ficha» no existe para la nueva, el panel vuelve a Editar.
- Ruta segura también al leer (RF-43): `leerFicha`, `urlObsidian` de una pieza y `revisarFichas` (`desfase.ts`) pasan por `rutaFicha`; hoy `revisarFichas` arma la ruta a mano.
- `log.ts`: `anotarLog` pasa a `escribirSeguro`.

## E. «Alternativas descartadas»
- `src/lib/wiki/alternativas.ts` (nuevo):
  - puro:
```ts
filaAlternativa(titulo, porque): string                 // «| t | p |», con `|` escapado, saltos a espacio, «Sin título» si vacío
anadirAlternativa(texto, titulo, porque): string | null // null si ya hay una fila igual (título y porqué, RF-47)
quitarAlternativa(texto, titulo, porque, otraLaDa: boolean): { texto: string; quitada: boolean }   // RF-48
```
    - La tabla es la de debajo de un título «Alternativas descartadas» de cualquier nivel (la plantilla usa `###`) o, si no, la primera cuya primera columna es «Idea».
    - Título sin tabla: la tabla de la plantilla («| Idea | Por qué se descartó |») se crea debajo. Sin título: `## Alternativas descartadas` con la tabla, antes de `## Fuentes` o al final (RF-46).
    - La fila vacía de la plantilla (`| | |`) se sustituye por la primera fila.
    - Quitar solo si hay una línea exactamente igual a `filaAlternativa` y `otraLaDa` es false (ninguna otra pieza descartada del arco da esa fila); si no, `quitada: false` y se dice.
    - Fin de línea y BOM de la nota, como en D.
  - con disco: `ponerEnArco(...)` va por `escribirEnFicha` (D). Si cambió fuera, no escribe y avisa (RF-52).
- `Sesion`:
  - `alternativasAlCambiar(antes: Modelo, ahora: Modelo)`: compara el descarte de escenas y tramos entre los dos modelos y pone o quita filas. Se llama solo desde la lista cerrada de RF-45:
    - `cambiarEstado` con éxito;
    - `aplicarVariante`, después de las notas y de `wikiAlAplicar` (RF-51): un fallo no deshace nada y se dice;
    - deshacer, rehacer y «Volver a como estaba» (`volver`), como la ficha sigue al estado (RF-49).
    - No se llama al releer la wiki o el disco, al restaurar una instantánea ni al editar título, porqué o arcos.
  - A qué fichas: escena → cada `ev.arcos[].arco`; si ese arco es un tramo (`tramo_de`), su arco de serie. Tramo → `tramo_de`. Solo arcos con ficha que existe (RF-45). Arco canon bloqueado: no se toca y se dice (RF-45b).
  - `otraLaDa`: alguna otra escena o tramo descartado del mismo arco con la misma fila en `ahora`.
  - Los avisos van a `avisosCambio`; `avisosAlVolver` añade «El Log no se deshace.» cuando el paso cambia filas, en sus dos ramas (también en la de `sinEnlace`).
  - `SesionVariante` no toca la wiki (ya es así).

## F. Estados antiguos
- `src/lib/wiki/equivalencias.ts` (nuevo, puro): `normalizarEstado(v)` (`clave` y espacios juntados), `esEstadoAntiguo(valor: unknown)` (un valor que no es texto también lo es) y `propuesta(valor): Madurez | null` con la tabla de RF-54 (también aparcado/aparcada → idea).
- `desfase.ts`: `EstadoFicha` gana `estadoWiki: unknown` (el valor tal cual); `canon` pasa a `normalizarEstado(v) === "canon"` (RF-53).
- `Sesion`:
  - `dejarAsi(id, valor)`: un paso de Ctrl Z que pone en `avisos_silenciados` de la pieza la entrada `ficha:<valor normalizado>` (constitución 3, RF-56); `quitarDejarAsi` la quita. No pasa por `loSe` (su `idBase` recortaría la última letra). La v1.0 conserva la lista tal cual.
  - `confirmarEquivalencia(id, valor, motivo?)` (RF-55):
    1. canon bloqueado que saldría de canon, o variante abierta: no se confirma y se dice (RF-55b);
    2. si el estado de la pieza no corresponde, `cambiarEstado(id, valor, { motivo, sinJuntar: true })` (spec 001): paso propio, sin la clave `estado ${id}` que lo juntaría con otro cambio de estado de hace menos de 1,5 s; con «idea», propuesta y aparcado se quedan;
    3. si ya corresponde, solo `ponerEstadoFicha(valor)`: sin paso de Ctrl Z (RF-55, RF-40).
  - `cambiarEstado` con ficha en estado antiguo cuenta como confirmar: el Log dice el valor de antes (RF-55c). Para eso `ponerEstadoFicha` lee y devuelve el valor de antes y lo pone en el Log («Estado de [[X]]: boceto → idea»).
  - Nada lo llama solo (RF-57).
- `src/vistas/panel/EstadoAntiguo.svelte` (nuevo): el aviso de RF-53, un selector con la propuesta elegida (o ninguna), el porqué si es descartado, «Confirmar» y «Dejarlo así»; con «Dejarlo así» puesto, una línea «Dejado así: «X»» con «Quitar». Va en Editar junto al estado (`CampoEstado.svelte`, para verlo antes de cambiarlo: RF-55c) y en la pestaña Ficha.

## Rendimiento
- `columnasHistoria` es O(escenas + épocas) con mapas. Test en `rendimiento.test.ts`: 300 escenas y 30 épocas, abrir y filtrar en < 200 ms.
- Un movimiento escribe una nota (el guardado de siempre); el modelo cambia al momento.

## Compatibilidad con la v1.0 (tests/compat)
- En `tests/compat.test.ts` y `tests/compat-variantes.test.ts`, con el lector congelado de `tests/compat/v1/`, la serie se abre igual después de:
  - mover épocas;
  - guardar un apartado (con `_fichas/` dentro);
  - descartar y recuperar;
  - confirmar una equivalencia y «Dejarlo así» (entrada nueva en `avisos_silenciados`).
- Las instantáneas y la papelera de la v1.0 no ven `_fichas/`.

## Seguridad
- Toda lectura, escritura y «Abrir en Obsidian» de una ficha pasa por `rutaFicha`: un enlace con `/`, `\`, `:` o `..` no se lee, no se abre ni se escribe (también en `revisarFichas`).
- En la wiki solo se escribe dentro de narrativa y en el Log de la serie, con `escribirSeguro`.
- Lo que se escribe en tablas se escapa (`|` y saltos de línea).
- `_fichas/` solo se crea dentro de la carpeta de la serie.
- «Abrir la Timeline» y «Abrir en Obsidian» solo abren `obsidian://`.
- Nada sale del equipo.

## Riesgos
- Cambiar `celdas` y `clave` afecta a todo lo que lee tablas y compara nombres. Lo cubren los tests que ya hay, que no se tocan.
- Las copias `.bak` de `appDatos/` se ven en Obsidian si el autor activa «Detect all file extensions»; no son notas ni se enlazan.
- Escribir apartados es lo más delicado de la spec, y por eso tiene tres defensas: la copia, la comparación del texto entero antes de escribir y la escritura segura.
