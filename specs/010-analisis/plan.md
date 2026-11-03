# Plan — Spec 010 «Análisis: lente, presencia, quién sabe qué y esquema»

> El CÓMO de la spec 010. Rama `010-analisis`. Sin dependencias nuevas, sin cambios en `src-tauri/`.
> Revisado por un revisor independiente (25 puntos, recogidos aquí).

## Idea general
- Todo lo que se calcula (personajes de la serie, lente, presencia, quién sabe qué, esquema) son funciones puras en `src/lib/vistas/`, sobre el `Modelo` que enseña el visor (`estado.sesion.modelo`: «cómo quedaría» si hay variante y no se está viendo «ahora»). Así RF-15 sale solo: las vistas recalculan con `estado.version`.
- Lo único que se escribe es «Lo sabe desde», dentro del secreto, por el camino de edición de siempre (`editar` → un paso de Ctrl Z, «Si lo dejas así…», variante, canon bloqueado).
- Lente, pestaña y temporada de Análisis viven en `estado` (memoria).

## A. «Lo sabe desde» (`src/lib/modelo/conocen-desde.ts`, nuevo)

### Formato en disco
Propiedad nueva del secreto, aparte de `conocen` (que no cambia de forma):
```yaml
conocen: ["[[Telmo]]", "[[Ana]]"]
conocen_desde:
  - personaje: "[[Telmo]]"
    episodio: ep-7f3a        # id del episodio, no el código (no cambia al renumerar)
```
- **No entra en `ESQUEMAS`**: se queda en `pieza.extra.conocen_desde`, como cualquier campo desconocido. Así el lector no la normaliza y un valor raro (número, lista, objeto, id roto) se conserva byte a byte (RF-29), y la v1.0 la guarda en su `extra` y la vuelve a escribir (comprobado en `tests/compat/v1/ficheros.ts`, líneas 315-347).
- Va por nombre (RF-28, compatibilidad): la v1.0 puede reordenar o quitar en `conocen` sin descolocar fechas.
- Descartado: meterlo en `conocen` como objetos (la v1.0 los vuelve `""` y machaca la lista) y un mapa nombre → episodio (claves `__proto__`, RF-29b).

### Funciones
- `fechasDe(s: Secreto): Map<string, Fecha>` — clave = `clave(nombreLimpio(personaje))` (la de `wiki/md.ts`); `Fecha = { episodio: string } | { rara: unknown }`. Solo entradas de personajes que están hoy en `conocen`; si un personaje sale dos veces, la primera entrada. Siempre `Map`, nunca objeto literal (RF-29b).
- `fechaVista(m, s, personaje)`: `"sin"` | `{ episodio }` | `{ rota: true }` (rara o episodio que no existe, RF-29).
- `ponerFecha(s, personaje, episodio | "")`: devuelve el nuevo valor de `extra.conocen_desde`:
  - quita la entrada de ese personaje (todas las que tengan su clave) y añade la nueva si no es «Sin fecha»;
  - **conserva tal cual** las demás entradas, también las raras y las huérfanas (de personajes que la v1.0 quitó: si vuelven, vuelven con su fecha);
  - lista vacía → `delete extra.conocen_desde` (nota igual que antes de la 010);
  - **si `conocen_desde` no es una lista** (mapa o texto escrito a mano): no se toca nunca. `fechaVista` da `"sin"` para todos y el selector sale desactivado con «Lo sabe desde está escrito a mano de otra forma: cámbialo en Obsidian».
- `alCambiarConocen(s, antes, despues)`: quita las entradas de los personajes que estaban en `antes` y no en `despues` (RF-28; renombrar = quitar + añadir). Las huérfanas que ya lo eran no se tocan.

### Dónde se engancha
- `CampoWiki.svelte` gana un snippet opcional `debajo(nombre, i)` para pintar algo bajo cada nombre, y el `#each` pasa a clave por posición (un personaje repetido en «Lo conocen» rompía la clave por nombre).
- `app/sesion.ts › juntar`: `extra` se junta subclave a subclave (hoy es un solo campo y una edición de `conocen_desde` pisaría otro campo desconocido cambiado fuera).
- `EditarSecreto.svelte`: `alCambiar` de «Lo conocen» llama a `editar((s) => { s.conocen = v; s.extra.conocen_desde = alCambiarConocen(...) })` → **un** paso de Ctrl Z (RF-28). Debajo de cada personaje, un `<select>` «Lo sabe desde» con `<optgroup>` por temporada y «Sin temporada» al final (RF-26) que llama a `editar` con `ponerFecha` (RF-27). Si `fechaVista` da `rota`, texto junto al campo: «La fecha guardada no es un episodio de la serie: cuenta como Sin fecha».
- `editar` ya respeta canon bloqueado y variante (specs 001, 006): nada nuevo.
- `consecuencias/campos-vistos.ts`: campo visto «Lo sabe desde» con `partes: (s) => Record<nombre, string>` (con `Object.fromEntries`, que trata `__proto__` como propiedad propia; nada de `Map`, porque `igual()` compara con `JSON.stringify`). `CampoVisto` gana `partes?` (opcional), y una función común `expandir(campos, p)` lo convierte en un campo por personaje con etiqueta «Lo sabe desde (Telmo)». La usan todos los que recorren `CAMPOS_VISTOS`:
  - `consecuencias/` («Si lo dejas así…»: «Lo sabe desde (Telmo): E3 → E5») y `consecuencias/vistas.ts`;
  - `variantes/choques.ts › choqueDePieza`: cada personaje va a `soloSerie` o `dosLados` por su cuenta (RF-27). La nota cambiada fuera sigue siendo un choque, como cualquier campo; lo que cambia es que solo es «de los dos lados» si es el mismo personaje;
  - `variantes/lado-a-lado.ts` y el marcado de filas que chocan por etiqueta (`estado.svelte.ts` ~779).
- Guía: `guia/campos.ts` ya tiene `secreto.conocen` → G48; el selector va dentro del mismo `ConGuia`.

### Pasar a la wiki (`wiki/pasar.ts`, RF-30)
- `tabla()` gana una variante por cabecera: `tablaPorColumnas(texto, "Personaje", filas: Record<cabecera, valor>[])`. Lee las celdas de la cabecera con `celdas()`, y para cada fila pone cada valor en la columna cuya `clave()` coincide; el resto vacío. Sin columna «Lo sabe desde» → esa fecha no se escribe.
- La fila del personaje: `{ "Personaje": enlace, "Lo sabe desde": codigo(m, episodio) | "" }`. Todo pasa por `celda()` (escapa `|` y saltos).

## B. Personajes de la serie y lente (`src/lib/vistas/lente.ts`, nuevo)

```ts
type Lente = { tipo: "personaje"; clave: string; nombre: string } | { tipo: "arco"; id: string } | { tipo: "secreto"; id: string };
interface Relacion { escenas: Set<string>; episodios: Set<string>; arcos: Set<string>; secretos: Set<string> }
```
- `alias(wiki): Map<clave, clave>`: clave de cada alias → clave del nombre de su ficha de personaje. `clavePersonaje(alias, texto)` la usa: es la clave que usan **todas** las funciones de abajo (lente, presencia, quién sabe qué), así un alias es el mismo personaje en todas partes.
- `personajesDeSerie(m, wiki): Map<clave, { nombre, formas: string[] }>` — de escenas no descartadas, `conocen` de secretos no descartados y fichas de personaje (`wiki.fichas` tipo `personaje`, nombre y alias). Clave = `clave(nombreLimpio(x))`; un alias lleva a la clave del nombre de su ficha. Nombre que se enseña: el de la ficha; si no, la primera forma en orden de emisión.
- `objetivosLente(m, wiki)` para el buscador: personajes, arcos (no descartados) y secretos (no descartados), con su tipo (RF-1).
- `relacion(m, alias, lente): Relacion` (definiciones de la spec):
  - personaje: escenas cuyo `personajes` tiene esa clave; secretos que lo tienen en `conocen`;
  - arco: escenas con el arco; el arco y sus tramos;
  - secreto: escenas de pistas, falsas y revelación; episodios de las marcadas solo con episodio (sin escena);
  - `episodios` = episodios de esas escenas + los marcados.
  - Rejilla: una casilla (arco × episodio) está relacionada si alguna de sus escenas lo está; con lente de arco, toda la fila del arco y sus tramos.
- `existeLente(mVisto, mOtro | null, wiki, lente)`: existe en alguno de los dos modelos (RF-10, con variante abierta).
- `sinNadaQueVer(relacion, ids visibles)`: RF-11. En el visor, los del nivel; en «Análisis», los de la temporada elegida.

### Estado (`app/estado.svelte.ts`)
- `lente = $state<Lente | null>(null)`, `avisoLente = $state<string | null>(null)`.
- `relacionLente` (getter con caché por `version` y lente): `relacion(sesion.modelo, lente)` o null.
- `ponerLente(l)`, `quitarLente()`. Tras cada cambio de serie (donde hoy se llama a `revisarNivel`) y **solo con la wiki ya cargada** (`leerWiki` es asíncrono; mientras carga no se comprueba), si `!existeLente(...)` → quitar y `avisoLente = "Se quitó la lente: <nombre> ya no está en la serie"`.
- Al cerrar la serie: `lente = null`, `pestanaAnalisis = "presencia"`, `temporadaAnalisis = ""` (RF-11b, RF-13).
- Esc: la decisión va en una función pura `queHaceEsc({ capas, campo, arrastrando, lente })` → `"capa" | "campo" | "nada" | "lente" | "subir"` en `lib/app/`, con test; `Carcasa.svelte › escape` solo la ejecuta (RF-8). El buscador de la lente y el menú contextual se abren como `capas` (Esc los cierra primero).

### Atenuar (RF-4)
- Clase `fuera-lente` en `src/estilo/` con el mismo color atenuado que las piezas aparcadas (color, no opacidad; decisión de la 001). Cada elemento con la clase lleva «fuera de la lente» en su texto accesible (`aria-description` o texto oculto, como las marcas de la 005).
- Visor (`visor/Columna*.svelte`, tarjetas), rejilla (`Rejilla.svelte`, `rejilla/Celda.svelte`), línea (`historia/TarjetaHistoria.svelte`): `fuera = estado.relacionLente && !relacionLente.escenas.has(id)`; columnas de episodio con `episodios`; filas de arcos en la rejilla con lente de arco con `arcos`.
- `BarraSuperior.svelte`: botón «Lente» (icono `Focus` de Lucide, ya en la dependencia) con el patrón de spec 008 (nombre oculto a ≤1000 px). Con lente: pastilla «Lente: Telmo · personaje» + «Quitar lente», y `avisoLente` / RF-11 («Telmo no sale en esta temporada», si `relacion` no toca nada de lo que se ve en el nivel).
- Buscador: `comunes/BuscarLente.svelte`, copia reducida de `Buscar.svelte` (filtro por `clave`, flechas, Intro, Esc).

### «Enfocar» (RF-2): `comunes/MenuContextual.svelte` (nuevo)
- Menú de una entrada, abierto con `oncontextmenu` o con la tecla de menú / Mayús F10 sobre el elemento con foco; se registra en `capas`.
- Se pone en: filas de arco en Tramas y rejilla; secretos en `temporada/Secretos.svelte` y en el panel; cada personaje de `CampoWiki` cuando `tipos` incluye `personaje` (campo «Personajes» de la escena y «Lo conocen»); nombres en Presencia.

## C. Vista «Análisis» (`src/vistas/Analisis.svelte` + `src/vistas/analisis/`)
- `Vista` gana `"analisis"`; `nivelAlCambiarVista` la deja en el nivel anterior (como `historia`).
- Menú izquierdo: «Análisis» bajo «Línea de la historia» (icono `ChartNoAxesGantt` o similar de Lucide).
- Estado: `pestanaAnalisis = $state<"presencia" | "sabe" | "esquema">("presencia")` (por sesión de serie, RF-13), `temporadaAnalisis = $state("")`. `abrirAnalisis()`: si `nivel.tipo === "serie"`, la primera temporada; si no, `nivel.temporada` (no `temporadaActual`, que se queda con la última aunque el visor suba a la serie). Después no la toca (definiciones). Si la temporada elegida desaparece, primera.
- Pestañas con `role="tablist"`. Tablas anchas dentro de una caja con `overflow-x: auto` (spec 008). Casillas como `<button>` dentro de `<td>`; cabeceras `<th scope>`.

### Presencia (`lib/vistas/presencia.ts`)
```
presencia(m, wiki, temporada) → { episodios: Episodio[], filas: { clave, nombre, casillas: number[], ausencias: {desde, hasta, n}[], escenas, episodiosCon }[] }
  episodios = episodiosDeTemporada(m, temporada)
  para cada escena viva con episodio en la temporada, para cada clave distinta de sus personajes: casillas[ep] += 1
  filas con escenas > 0; orden: escenas desc, nombre (localeCompare "es")
  ausencias: recorrer de la primera a la última casilla > 0, saltando episodios sin ninguna escena viva;
             racha de huecos ≥ 3 → ausencia (RF-21)
```

### Quién sabe qué (`lib/vistas/quien-sabe.ts`)
```
quienSabe(m, alias, temporada) → filas por secreto no descartado:
  pos(x) = posicionEpisodio(m, episodioDe(x))   // episodio marcado manda; si no, el de la escena
  cuentan = (sin escena y con episodio marcado) o (escena viva con episodio)
            // con escena aparcada, descartada o en la bandeja NO cuenta aunque lleve episodio marcado
  pos null (episodio sin temporada o que no existe) = después de toda temporada: nunca <= pos(E)
  para cada episodio E de la temporada:
    revelado = rev && pos(rev) <= pos(E)
    N = pistas que cuentan con pos <= pos(E); M = igual con falsas
    nuevas = las que caen en E
    publico = revelado ? "Revelado" : N ? "Pistas: N" (+ "Falsas: M") : M ? "Falsas: M" : "No lo sabe"
    saben = personajes con fecha y pos(fecha) <= pos(E) (repetido: la más temprana); seEnteran = pos == pos(E)
  sinFecha = personajes de conocen sin fecha válida (RF-34)
  conFechaFuera = los que tienen fecha en un episodio sin temporada: van en la misma línea aparte,
                  «E? (sin temporada)», para que nadie desaparezca de la fila
  orden: pos(revelación), título; sin revelación al final por título
```
`compararPos` de `modelo/consultas.ts` da el orden de emisión de toda la serie.

### Esquema (`lib/vistas/esquema.ts`)
- `esquema(m, temporada)`: reutiliza `lib/vistas/actos.ts` (`NOMBRE_ACTO` y el agrupado por acto del visor): episodio → actos → «Sin acto» → escenas por `orden`; descartadas fuera, aparcadas con marca; bandeja al final.
- `esquemaMarkdown(e)`: `## E1 · Título`, `### Acto`, `- 3. Título — valor · + → −`. El texto de la carga se saca de `comunes/Carga.svelte` (`signo`) a `lib/vistas/textos.ts › textoCarga`, y lo usan los dos.
- `textoSeguro(s)` (nuevo en `wiki/md.ts`; `celda` se queda en `pasar.ts`): una línea (`\r`, `\n`, U+2028 y U+2029 → espacio), sin caracteres de control ni bidi, y `\` delante de `\ # * _ [ ] ! | ` $ % = ~ < > &`, y del `-`, `+` o `N.` iniciales (RF-41). Nunca entra `verdad`.
- Copiar: `navigator.clipboard.writeText` dentro del clic; si lanza o no existe, caja con `<textarea readonly>` seleccionado y «Cópialo con Ctrl C» (RF-41b). Sin plugin de Tauri.

## Rendimiento
- `presencia`, `quienSabe` y `esquema`: una pasada por escenas y secretos; test con 300 escenas, 50 personajes, 30 secretos < 200 ms (mismo estilo que `rendimiento.test.ts`).
- `relacion`: una pasada; caché por `version` + lente → poner/quitar < 100 ms, con test de 300 escenas.

## Compatibilidad con la v1.0 (`tests/compat`)
- Secreto con `conocen_desde` escrito por la v2 → leído por el lector congelado de la v1.0 → `conocen` igual.
- Reescrito por la v1.0 tras reordenar y quitar un personaje de `conocen` → leído por la v2: fechas intactas por nombre, la del quitado se ignora; si vuelve, vuelve con fecha.
- Sin fechas, la nota es idéntica a la de antes de la 010 (no aparece `conocen_desde`).

## Seguridad
- Entradas de disco: `conocen_desde` se lee con `Array.isArray`/`esObjeto` y `typeof === "string"`; todo lo demás es `rara` y no se interpreta. Solo `Map`.
- Wiki: solo se toca la fila de la tabla «Personaje» al pasar (ya existía), celdas escapadas.
- Portapapeles: solo escritura y por clic del autor; texto escapado; sin `verdad`.
- Nada sale del equipo.

## Límites conocidos (aceptados por la spec)
- La v1.0, al pasar un secreto a la wiki, escribe la fila «Personaje» por posición y deja vacía «Lo sabe desde».
- Una fecha huérfana (personaje que la v1.0 quitó) no se ve ni se borra desde la v2; si el personaje vuelve, o se renombra a ese nombre, recupera la fecha.
- Al reescribir la nota, el YAML se compacta como siempre: «se conserva» es por valor, no por formato.

## Riesgos y vuelta atrás
- Atenuar toca muchos componentes (visor, rejilla, línea): un solo helper `fueraDeLente(id)` en estado para no repetir la lógica.
- Esc tiene ya cuatro casos; un test de la secuencia en el navegador (abierto → campo → arrastre → lente → subir).
- Vuelta atrás: todo en la rama; `conocen_desde` es opcional y la nota sin fechas no cambia.
