# Plan — Spec 011 «Análisis: causa y efecto y plantillas de estructura»

> El CÓMO de la spec 011. Rama `011-causa-y-plantillas`. Sin dependencias nuevas, sin cambios en `src-tauri/`.
> Revisado por un revisor independiente (25 puntos, recogidos aquí; dos llevados a la spec: RF-19b, RF-19c y RF-38).

## Idea general
- Todo lo que se calcula (Provoca, marcas, círculos, cadenas, sueltas, sitios en episodios, columnas y franjas) son funciones puras en `src/lib/vistas/`, sobre el `Modelo` que enseña el visor (`estado.sesion.modelo`), como en la 010: recalculan con `estado.version` y siguen «ver ahora / cómo quedaría» solas.
- Lo único que se escribe va por `editar` (Ctrl Z, «Si lo dejas así…», variante, canon bloqueado), como «Lo sabe desde» en la 010.
- Los datos nuevos **no entran en `ESQUEMAS`**: viven en `pieza.extra`, como `conocen_desde`. Así un valor raro se conserva tal cual (RF-9) y la v1.0 los guarda y los vuelve a escribir por valor (comprobado: `tests/compat/v1/ficheros.ts`, 315-319 y 347, también listas y objetos). Sin dato nuevo, la propiedad no existe y la nota queda idéntica.
- Todo acceso a `extra` es con `Object.hasOwn` (un `__proto__:` de primer nivel en disco cambia el prototipo de `extra`).

## A. «Viene de» (`src/lib/modelo/viene-de.ts`, nuevo)

### Formato en disco (escena)
```yaml
viene_de: [ev-7f3a, ev-91c2]   # ids de escena: no cambian al reordenar ni renombrar
```
### Funciones
- `leerVieneDe(ev): { editable: true; entradas: Entrada[] } | { editable: false; crudo: string }`. `Entrada = { id: string; i: number } | { rara: unknown; i: number }`. Lista → cada texto es `{ id }` y lo demás `rara`; ids repetidos, una entrada (la primera). No lista → `crudo` (recortado a una línea y sin caracteres de control) para enseñarlo con el motivo «Viene de está escrito a mano de otra forma: cámbialo en Obsidian» (RF-9).
- `anadirCausa(ev, id)` / `quitarCausa(ev, entrada)`: devuelven el nuevo valor de `extra.viene_de`. Conservan tal cual las demás entradas (raras, repetidas). Quitar un id quita todas sus copias; quitar una rara quita esa posición. Lista vacía → se borra la propiedad.
- `queEs(m, id, propio)`: `"escena"` si `m.eventos.has(id)` y no es `propio`; `"ya-no-esta"` si tiene forma de id de escena (`/^ev-[a-z0-9]{4,}$/`, la de `ids.ts`) y no existe; si no (otro tipo de pieza, `[[T01E03]]`, el propio id), `"no-se-entiende"` (RF-9, RF-19c).

### Cálculos (`src/lib/vistas/causas.ts`, nuevo)
- `posiciones(m)`: una posición común para marcas y para «dónde se emite»: `[iT, iE, índice en eventosDeEpisodio]` de las colocadas (el mismo número que enseña `dondeSeEmite`, también con `orden` repetido en disco); bandeja y «Sin temporada» como en `ordenEmision`.
- `indiceCausas(m)`: una pasada; `causas` y `provoca: Map<id, string[]>` solo con entradas `"escena"` (sin autorreferencias), en orden de emisión. Caché `{ version, r }` por modelo (como `cacheNumeros` en `consecuencias/huellas.ts`): `Modelo` es mutable y sube `version`.
- `marca(pos, causa, efecto)`: `"tardia"` si las dos están colocadas y la causa va después; `"sin-sitio"` si la causa no está colocada y el efecto sí; si no, `null`. Aparcada, descartada, ya no está: aparte, por estado.
- `circulos(m)`: componentes fuertemente conexos (Tarjan iterativo) de tamaño > 1 **solo sobre enlaces activos** (que existen y no están descartados); `Set<id>`.
- `cadenas(m, temporadaId)` (RF-16 a RF-21): escenas de la pestaña = vivas, colocadas, de la temporada. Orden de los inicios: (1) RF-16, (2) círculos sin inicio por su escena más temprana (RF-19), (3) cualquier escena no visitada y no suelta (RF-19b), cada grupo en orden de emisión. Recorrido en profundidad con pila y `visto` → nodos `{ id, nivel, verArriba, fuera: Ref[], marcas }`; `fuera` = enlaces activos a escenas que no son de la pestaña, con dónde se emite y marca. `sueltas` = escenas de la pestaña sin enlaces activos.

### Dónde se engancha
- `EditarEvento.svelte`: bloque «Viene de» (lista con quitar, marcas en texto, clic abre) + `comunes/BuscarEscena.svelte` (nuevo, combobox como `BuscarLente`: `simple()` de `buscar.ts` sobre título y dónde se emite; excluye la propia, las ya puestas y las descartadas; 30 resultados como mucho; prop `filtro` para limitarlo a una temporada con episodio). Debajo, «Provoca» de solo lectura. Si no es editable o está en canon bloqueado, sin botones y con el motivo.
- `consecuencias/campos-vistos.ts`, `evento`: `{ etiqueta: "Viene de", valor: ids en su orden, ver: título · dónde se emite }` (RF-13). Lo usan «Si lo dejas así…», choques y «Lado a lado».
- `variantes/referencias.ts`: **no** se añade `viene_de` (RF-14).
- `borrarPieza` no toca `viene_de` de otras escenas.

## B. Pestaña «Causa y efecto» (`src/vistas/analisis/CausaEfecto.svelte`)
- `Analisis.svelte`: cuarta pestaña `"causas"`; `estado.pestanaAnalisis` gana el valor.
- Lista anidada `<ul>` por cadena; cada `<li>` con `aria-level`. La primera aparición lleva `tabindex="-1"` y una referencia en un `Map` del componente; «ver arriba» es un botón que le pasa el foco (sin usar el id en un fragmento: los ids pueden venir de nombres de fichero). Marcas en texto. Lente: `fuera-lente` por escena (spec 010, RF-4). Clic abre en el panel, en «Editar». Vacío: RF-25.

## C. Plantillas (`src/lib/modelo/plantillas.ts`, nuevo)

### Constantes
`PLANTILLAS` con las tablas de RF-26: `{ id: "tres_actos" | "story_circle" | "save_the_cat" | "viaje_heroe"; nombre; momentos: { clave; nombre; explicacion; sitio: { punto: number } | { tramo: [number, number] } }[] }[]`. Claves en español sin acentos; las de Tres actos son las de `estructura`; las del Story Circle, `tu`, `necesidad`… en el orden de `story_circle`.

### Formato en disco (temporada)
Una propiedad de `extra` por plantilla (`juntar` junta `extra` clave a clave, spec 010):
```yaml
estructura_escenas: { detonante: ev-1 }                        # Tres actos: solo la escena
story_circle_sitios: { tu: { episodio: ep-1, escena: ev-2 } }  # el texto sigue en story_circle
save_the_cat: { catalizador: { texto: "…", episodio: ep-2 } }
viaje_heroe: { odisea: { texto: "…", episodio: ep-4 } }
```
- Texto y episodio de Tres actos siguen en `estructura.<k>`; el texto del Story Circle, en `story_circle[i]` (RF-32).
- Lectura solo de las claves de `PLANTILLAS` con `Object.hasOwn`; un valor que no es texto cuenta como vacío y se conserva; una propiedad que no es objeto → plantilla de solo lectura con su motivo, como RF-9.
- `momento(t, plantilla, clave): { texto; episodio; escena }` y `ponerMomento(t, plantilla, clave, cambio)`: muta `t` dentro de `editar`; solo escribe claves de `PLANTILLAS`, nunca claves que lleguen en `cambio`. Aplica RF-29 (poner escena pone su episodio) y RF-30 (cambiar de episodio quita la escena de otro episodio) en la misma mutación. Entrada vacía → se borra la clave; objeto vacío → se borra la propiedad.

### Cálculos (`src/lib/vistas/plantillas.ts`, nuevo)
- `enEpisodios(sitio, N): [desde, hasta]` (RF-27): punto `max(1, ceil(p·N/100))`; tramo de `min(N, floor(a·N/100) + 1)` a `max(desde, ceil(b·N/100))`. En milésimas enteras, sin coma flotante. Test de punto en múltiplo exacto (50 %, N = 6 → E03).
- `columnasPlantilla(m, t, plantilla)`: N = máx(creados, previstos). Columnas 1..creados y, si N > creados, una más «Previstos: E0x-E0y» (sola si no hay creados). Para cada columna, en orden: los momentos que la cubren (un tramo sale en cada columna que toca, «desde E02» / «sigue» / «hasta E04»; uno que cruza a previstos sale en sus columnas creadas y en «Previstos»), como mucho 4 visibles y `resto`, y los momentos atados a ese episodio (RF-40).
- `atados(m, t, plantilla)`: momentos con episodio de la temporada que existe, con el estado de su escena («en otro episodio», «descartada», «ya no está», RF-33, RF-34).

### Dónde se engancha
- `panel/campos/SelectorPieza.svelte`: si `valor` no está en `opciones`, añade una opción con ese valor «(ya no está)» para no pisarlo en silencio (RF-34; vale también para el Tres actos de hoy).
- `EditarTemporada.svelte`: los bloques «Estructura» y «Story Circle» pasan a `panel/ApartadoPlantilla.svelte` común (texto, episodio, escena con `BuscarEscena` filtrado, explicación junto al campo), con las mismas guías (`ConGuia` §17, §12, G29). Save the Cat y Viaje del héroe en `<details>` plegados si no tienen nada (RF-28). «Episodios previstos» se ve siempre (RF-38). `estado.apartadoTemporada` (en memoria) dice qué apartado abrir y enfocar al llegar desde la rejilla (RF-41).
- `consecuencias/campos-vistos.ts`, `temporada`: un campo por momento con `partes`/`expandir` (spec 010): «Estructura (Detonante)», «Story Circle (2 · Necesidad)», «Save the Cat (Catalizador)»… con valor de tres partes fijas `texto\0episodio\0escena` y un `ver` que enseña texto, código del episodio y título de la escena. Así «Si lo dejas así…», choques y «Lado a lado» van por momento (RF-35). El campo «Estructura» de hoy y el «Story Circle» se sustituyen por estas partes (mismas etiquetas de cara al autor). No entran en `CAMPOS_REFERENCIA`.
- `Rejilla.svelte`: la cuadrícula pasa a colocar con `grid-row`/`grid-column` explícitos, y cada fila de arco y «Sin trama» lleva una celda vacía en la columna «Previstos» si la hay. Selector «Plantilla» en la cabecera. Fila «Plantilla» justo debajo de las cabeceras: una celda por columna, con sus momentos de `columnasPlantilla` («+N más» es un botón que despliega el resto), en el DOM justo detrás de su cabecera. Con 0 creados y N > 0, la rejilla enseña la cabecera, la columna «Previstos» y la fila; con N = 0, el texto de RF-43. La fila no es zona de soltar.
- `src/lib/app/plantilla-vista.ts` (nuevo, puro): `leerPlantillasVista(texto) → Map` (`JSON.parse` en `try`, solo pares id → plantilla de la lista fija), `escribir`, `limpiar(map, existe)`. `estado.svelte.ts` lo usa con `leer`/`guardar` de `localStorage`, clave por serie (`atelier.plantillaVista:<carpeta de la serie>`). Al abrir la serie se olvidan solo las temporadas que no existen ni en la serie ni en la variante (RF-42).

## Rendimiento
- `indiceCausas` + `circulos` + `cadenas`: lineales en escenas + enlaces; test con 300 escenas y 600 causas < 200 ms.
- `columnasPlantilla`: cambiar de plantilla < 100 ms (test con 300 escenas).

## Compatibilidad con la v1.0 (`tests/compat`)
El arnés (`tests/compat/uso-v1.ts`) tiene el lector y el escritor congelados, no las operaciones de la v1.0: cada operación se simula a mano con `editadoPorV1`, como la hace la v1.0:
- editar un campo de la escena o de la temporada;
- reordenar escenas (cambia `orden`) y reordenar episodios (reescribe `temporada.episodios`);
- borrar un episodio: lo quita de `temporada.episodios` y deja `episodio: ""` en sus escenas;
- borrar una temporada: sus escenas ya no se leen (simulado quitándolas del modelo);
- cambiar el episodio del detonante (`estructura.detonante.episodio`).
Después se relee con la v2: lo nuevo intacto, y las vistas dan «sin sitio todavía», «(ya no está)» o «(en otro episodio)». Sin dato nuevo, nota idéntica a la de antes de la 011.

## Seguridad
- Entradas de disco: `Array.isArray`, `typeof === "string"`, `Object.hasOwn` con claves conocidas; todo lo demás se conserva sin interpretar. Nada se mete como HTML: texto de Svelte (sin `{@html}`), títulos en una línea.
- `localStorage`: solo ids de temporada y nombres de la lista fija; `JSON.parse` en `try`; `Map`, nunca objeto literal.
- Nada sale del equipo.

## Límites conocidos (aceptados por la spec)
- El episodio de Tres actos sigue siendo referencia de la 006: si ya no existe, bloquea aplicar la variante como hoy. Lo nuevo no.
- `viene_de` y cada plantilla son una sola propiedad para `juntar` y «Traer lo de ahora» (spec 006): un cambio de fuera en un momento y uno de la app en otro de la misma plantilla chocan; el choque se ve por momento (`partes`), pero se resuelve por plantilla entera. Igual con dos causas de la misma escena.
- Una entrada repetida de `viene_de` escrita a mano se enseña una vez; quitarla quita todas.
- La v1.0 no ve ni edita causas ni momentos nuevos.

## Riesgos y vuelta atrás
- `EditarTemporada` cambia de forma: se comprueba en el navegador que Estructura y Story Circle guardan como antes, y hay test de `ponerMomento` sobre `estructura` y `story_circle`.
- La rejilla pasa a colocación explícita: se comprueba que el arrastre, «Sin trama», la lente y las marcas de «Si lo dejas así…» siguen igual.
- «Un paso de Ctrl Z» se prueba con el reloj inyectado de `Historial` (`deshacer.ts` junta pasos de menos de 1500 ms).
- Vuelta atrás: todo en la rama; las propiedades nuevas son opcionales y la nota sin ellas no cambia.
