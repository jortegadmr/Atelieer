# Plan técnico — Spec 004 Guía junto a cada campo

> Cómo se construye. Respeta docs/constitucion.md y cubre los RF-1 a RF-25 de spec.md.
> Versiones: las de la 003 (Tauri 2, Svelte 5, `yaml` 2.9, Vitest, `@lucide/svelte`). Sin dependencias nuevas. Sin tocar `src-tauri/` ni el formato de las notas ni de `guia.md`.
> Revisado por un revisor independiente (2026-10-21): 3 🔴, 8 🟡 y 10 ⚪, todos recogidos aquí y en tasks.md. El 🔴 de foco tras «Lo sé» lo decidió el autor (RF-17).

## Idea general
- La lógica va en TypeScript puro y probado, en `src/lib/guia/`:
  - qué reglas van con cada campo (`campos.ts`, nuevo);
  - el estado de una regla en una pieza (`estadoRegla`, en `marcas.ts`);
  - reglas repetidas (`guia-md.ts`).
- Un componente envoltorio, `ConGuia.svelte`, rodea cada campo de la tabla. Es una caja normal (no `display: contents`): contiene el campo y, debajo, sus reglas. En una rejilla, `ConGuia` es la celda.
- «Lo sé» llama a `Sesion.loSe`, como Comprobar: mismo guardado, mismo bloqueo de canon. Lo único que cambia en la sesión es que «Lo sé» va en su propio paso de deshacer y que «Quitar «lo sé»» quita todas las variantes. En disco se escribe lo mismo que hoy (`avisos_silenciados`).
- La pestaña Guía pasa a `estadoRegla()`. `marca()` se queda como envoltorio de `estadoRegla`, con sus tests de siempre.

## Módulos y archivos
| Archivo | Qué hace | RF |
|---|---|---|
| `src/lib/guia/guia-md.ts` | `leerGuia`: el id se compara en mayúsculas (solo en memoria; el archivo no se toca). Un id ya leído, también entre Reglas y Magia, se salta con el aviso «Regla G07 repetida: se usa la primera» | 20 |
| `src/lib/guia/marcas.ts` | `estadoRegla(guia, regla, p, r, m)` (ver Contratos). `marca()` pasa a ser un envoltorio: «ok» → `"ok"`; «no» o «sugerencia» → `"no"`; el resto → `null` | 10-12, 14, 19 |
| `src/lib/guia/campos.ts` (nuevo) | `CAMPOS`: tabla clave de campo → reglas. Cada regla lleva la pieza de guía esperada y, si la tiene, una condición. `reglasDeCampo(guia, p, clave)`: las de la tabla que están en `reglasDe(guia, p)`, con `regla.pieza` igual a la esperada y la condición cumplida, en el orden de la tabla. `reglasNueva(guia, m, datos)`: `{ propias, subtrama }` | 1-5, 8, 21-24 |
| `src/lib/app/sesion.ts` | `loSe`: clave de historial propia (`lo-se ${pieza}`), aparte de la de escribir. Así no se junta con lo tecleado en los 1,5 s anteriores. Al quitar, borra todos los silenciados de esa comprobación (C01, C01a, C01b…) en un solo cambio | 14, 15, 18 |
| `src/lib/app/estado.svelte.ts` | `reglaSenalada: string \| null`. `verRegla(piezaId, reglaId)`: `elegir(piezaId, "guia")`, sin cambiar de vista, y `reglaSenalada = reglaId` | 16 |
| `src/vistas/panel/campos/ConGuia.svelte` (nuevo) | Envoltorio con `pieza` y `clave`, marcado `data-con-guia`. Detalle debajo | 6-9, 13, 17, RNF |
| `src/vistas/panel/campos/ReglasCampo.svelte` (nuevo) | Por regla: código, texto, fuente, `MarcaRegla`, avisos y botones («Lo sé · también …», «Quitar «lo sé»», «Ver en la Guía»). Botones con `data-accion` y `data-regla` para devolver el foco. Todo como texto (nunca `{@html}`; lo vigila `sin-html.test.ts`). `overflow-wrap: anywhere` | 10-16, RNF |
| `src/vistas/panel/campos/MarcaRegla.svelte` (nuevo) | Icono y texto de una marca. Lo usan `ReglasCampo` y `Guia` | 10, 12, 19 |
| `src/vistas/panel/Guia.svelte` | Usa `estadoRegla` y `MarcaRegla`. Al montarse, o cuando cambia `reglaSenalada`, lo consume: busca la regla por `dataset` (no por selector), la desplaza a la vista, la enfoca (`tabindex="-1"`), la resalta con borde `--accent` y pone `reglaSenalada = null`. El resaltado dura hasta cambiar de pieza | 16, 19 |
| `src/vistas/panel/EditarSerie`, `EditarTemporada`, `EditarEpisodio`, `EditarEvento`, `EditarSecreto`, `EditarArco` (`.svelte`) | Cada campo de la tabla, dentro de `<ConGuia>` (lista en «Envoltorios») | 1, tabla |
| `src/vistas/tramas/Campos.svelte` | Igual con las tarjetas. Los bloques `leida` (de la ficha) no se envuelven | 1, tabla |
| `src/vistas/tramas/TarjetaCampo.svelte`, `TarjetaDoble.svelte` | Dejan de editar cuando el foco sale del `[data-con-guia]` que las contiene (o de sí mismas si no hay ninguno), no con el `blur` del área de texto | RNF estabilidad |
| `src/vistas/visor/NuevaPieza.svelte` | Columna derecha «Lo que te pedirán tus guías» con `reglasNueva`; las de subtrama aparte o con las propias (RF-22); o el texto de RF-24 | 21-24 |
| `src/estilo/componentes.css` | `.reglas-campo` (no `.pista`: ya la usa `EditarSecreto`) y `.maxim.senalada`. Solo fondos y colores de los tokens, sin `color-mix`, para que los cubra `contraste.test.ts` | — |

### `ConGuia`, en detalle
| Qué | Cómo |
|---|---|
| Foco dentro (RF-6, RF-7) | `focusin` lo marca. `focusout` con `relatedTarget` fuera lo quita |
| Mac (WebKit no enfoca los botones al pulsarlos) | `pointerdown` en un botón del campo lo enfoca a mano (`boton.focus()`). Así salen las reglas de los campos que son solo botones: carga, Nivel, Test de relleno, chips de `CampoWiki` |
| Pulsar dentro de la zona de reglas | `mousedown` con `preventDefault`, como en `CampoWiki.svelte`. El foco no sale del campo y la regla no se oculta antes del clic |
| Estabilidad (RNF) | Si hay un botón del ratón pulsado, ocultar se aplaza hasta `pointerup`. Así lo de abajo no sube y el clic no cae en otro sitio |
| Canon bloqueado (RF-9) | No pinta nada si `sesion.estaBloqueada(pieza.id)`. Lee `estado.version`, porque desbloquear no cambia la pieza. En el panel, además, el `fieldset disabled` ya quita el foco |
| Accesibilidad | La zona de reglas está siempre montada (vacía si no hay foco) con un id. En `focusin`, `aria-describedby` de `event.target` apunta a esa zona; se quita en `focusout`. Sin `aria-live`, para no anunciar cada cambio de marca al escribir |
| Foco tras «Lo sé» (RF-17) | Tras `loSe`, `tick()` y foco al botón `[data-accion=quitar][data-regla=…]`, o al revés |
| Botón que desaparece (caso límite) | Un `$effect` tras poner al día las reglas: si `document.activeElement` es `body` y el último foco estaba dentro, devuelve el foco al último elemento del campo |

## Contratos (lógica → interfaz)
```ts
// marcas.ts
export type EstadoMarca = "ok" | "no" | "sugerencia" | "lose" | "juzgas" | "aparcada" | "descartada";
export interface EstadoRegla {
  marca: EstadoMarca;
  /** Avisos de su comprobación en esta pieza: los activos, o los silenciados si marca = "lose" */
  avisos: Aviso[];
  /** Otras reglas de esta pieza con la misma comprobación (para «Lo sé · también G08, G10») */
  comparten: string[];
}
export function estadoRegla(guia: Guia, regla: Regla, p: Pieza, r: Resultado, m: Modelo): EstadoRegla;

// campos.ts
export type ClaveCampo = "serie.logline" | "arco.quiere" | "temporada.carga" | … ;
interface ReglaCampo { id: string; pieza: PiezaGuia; si?: (p: Pieza) => boolean }
export const CAMPOS: Record<ClaveCampo, ReglaCampo[]>;
export function reglasDeCampo(guia: Guia, p: Pieza, clave: ClaveCampo): Regla[];
export function reglasNueva(guia: Guia, m: Modelo, d: { que: QueCrear; tipoArco: TipoArco; tramoDe?: string }): { propias: Regla[]; subtrama: Regla[] };
```

### `estadoRegla`, en orden
1. Si la pieza tiene estado (`"madurez" in p`, como en `comprobar`) y `estadoDe(p)` es aparcado o descartado → «aparcada» o «descartada» (RF-12).
2. Sin `comprobacion` → «juzgas».
3. Activos = `r.avisos` de esta pieza con `idBase(a.id) === comprobacion`. Silenciados = lo mismo en `r.silenciados`.
4. Algún activo de clase aviso → «no». Solo sugerencias → «sugerencia». Ninguno activo y algún silenciado → «lose».
5. Si no, `aplica(...)` (el de hoy, en el mismo archivo) → «ok»; si no aplica → «juzgas».

Los avisos salen en el orden de `r`, que es el de Comprobar: ninguna comprobación mezcla avisos y sugerencias.

### Tabla de claves (de la tabla de la spec)
Una clave puede reunir reglas de varios tipos de arco. Cada regla lleva su pieza de guía esperada (RF-4): si el autor pasa G07 a «arco de personaje», no sale en «Qué quiere» del personaje.
- `arco.quiere`: G07 (`arco de trama`), G21 (`arco de personaje`).
- `arco.cambia`: G11 (`trama`); G23, G24 (`personaje`); G26, G27, G28 (`relación`).
- Las de subtrama esperan `subtrama`, y `reglasDe` solo las da en B y C.

Condiciones: G12 `si: tipo_trama A y nivel serie`; G13 `si: nivel temporada`. En la tabla, `*` = con condición.

| Clave | Reglas | Dónde |
|---|---|---|
| `serie.logline` · `.pregunta` · `.final` · `.filosoficas` · `.dinamica` | G05 · G03 · G02 · G04 · G06 | EditarSerie |
| `arco.quiere` · `.necesita` · `.gana` · `.cambia` | G07, G21 · G22 · G08, G09 · G11, G23, G24, G26, G27, G28 | Campos (Tramas) |
| `arco.bomba` | G10, G20 | Campos («Bomba de tiempo») y EditarArco («Vence la bomba») |
| `arco.protagonistas` | G16 | Campos (tarjeta) y EditarArco (`CampoWiki`) |
| `arco.pegamento` | G19 | Campos (tarjeta y sus botones «Por trama / Por tema», en el mismo `ConGuia`) |
| `arco.estados` | G25 | Campos (rejilla) |
| `arco.nivel` · `.inicio` · `.fin` | G12\*, G13\* · G15, G17 · G12\*, G13\*, G15, G17 | EditarArco |
| `temporada.pregunta` · `.principal` · `.carga` · `.story_circle` · `.crisis` · `.climax` · `.llegada` · `.cierre` | G33 · G35 · G34 · G29 · G30 · G31 · G32 · G33 | EditarTemporada |
| `episodio.idea` · `.motor` · `.carga` · `.desenlace` · `.gancho` | G36 · G37 · G38 · G39 · G40 | EditarEpisodio |
| `evento.valor` · `.gana` · `.relleno` · `.cuando` · `.descripcion` | G42 · G41 · G43 · G45 · G44, M01 | EditarEvento |
| `secreto.verdad` · `.revela` · `.pistas` · `.conocen` | G49 · G46 · G47, M02 · G48 | EditarSecreto |

### Envoltorios que no son un solo control
- Pares con una sola clave (las dos cargas; Valor en juego con Empieza y Acaba; Qué gana con Qué pierde): un `ConGuia` alrededor del par entero.
- Pares con claves distintas en una `.f2` (Empieza y Acaba a mano; Nivel y Tipo; Cuándo ocurre y Cómo se cuenta): cada `ConGuia` es su celda y sus reglas van dentro de la celda.
- Crisis y Clímax: solo esas dos vueltas del bucle «Estructura» (`.momento`), con su selector de episodio.
- Desenlace: dentro del grupo de actos.
- `episodio.motor`: un `ConGuia` alrededor de los seis campos (Protagonista … Contexto). La regla sale debajo del grupo.
- Story Circle, Pistas sembradas y Pistas falsas: un `ConGuia` por grupo.
- Lo conocen con «Qué cree la audiencia»: uno cada uno, con la misma clave.

### `reglasNueva`
| Tipo en la ventana | Reglas propias | Subtrama |
|---|---|---|
| temporada, episodio, evento, secreto | las de su tipo | — |
| trama de serie (`tipoArco` trama o relación) | arco de trama o de relación | aparte, «Si es subtrama (B o C)» |
| trama de temporada (nace B) | arco de trama o de relación | con las propias |
| tramo de una trama | las del tipo de la madre | con las propias si la madre es B o C; si no, ninguna |
| cualquier arco de personaje | arco de personaje | — |

## Decisiones técnicas
| Decisión | Alternativa descartada y por qué |
|---|---|
| Tabla campo → regla en el código (`campos.ts`), con la pieza de guía esperada | Columna «campo» en `guia.md`: la v1.0 salta las filas que no tienen 5 columnas (constitución 9) |
| Envoltorio `ConGuia` alrededor de cada campo, como caja normal | `display: contents` con las reglas a todo el ancho: descoloca las rejillas `.f2` y `.gp` |
| `aria-describedby` puesto en `focusin` sobre el control enfocado | `aria-live`: no anuncia lo que se monta con su contenido y repetiría cada cambio de marca |
| «Lo sé» con clave de deshacer propia | La clave de escribir: un «Lo sé» justo después de teclear se desharía junto con el texto |
| `marca()` como envoltorio de `estadoRegla` | Dejarla sin uso: sus tests no protegerían nada real |
| Calcular las reglas al enfocar, sobre `resultado()` (ya memorizado por versión) | Índice de avisos por pieza: filtrar es de menos de 1 ms con 1.500 escenas; se mide en T2 |

## Seguridad de la funcionalidad
- Entradas: el texto de `guia.md`, los avisos y los títulos de notas vienen de archivos que se editan a mano. Se pintan siempre como texto, sin `{@html}` (lo vigila `sin-html.test.ts`). Los `[[…]]` salen tal cual. La regla señalada se busca por `dataset`, nunca metiendo el id en un selector.
- Escritura: solo «Lo sé», por `Sesion.loSe` → `editar` → `aplicar`. Respeta el canon bloqueado, el guardado seguro y el «cambió fuera» de la 002.
- Nada sale del equipo. Sin datos personales.

## Guía releída
La guía no se vigila: está en la raíz de appDatos y la vigilancia solo mira la carpeta de la serie. Se lee al abrir la serie y con «Volver a leer guia.md» (pestaña Guía), como hoy. El caso límite «al recargarse la guía» se refiere a eso.

## Estrategia de tests
Tests ligeros, como en la 003: lógica pura con Vitest y el modelo en memoria.

| Archivo | Qué prueba |
|---|---|
| `tests/guia-md.test.ts` | Regla repetida (también entre Reglas y Magia, y «g07» frente a «G07»): la primera y un aviso |
| `tests/marcas.test.ts` | `estadoRegla`: las siete marcas, avisos en el orden de `r`, `comparten`, serie y punto sin estado. Los tests de `marca()` sin cambios |
| `tests/campos-guia.test.ts` (nuevo) | Tabla, condiciones, pieza esperada, magia, subtrama, `reglasNueva`; 1.500 escenas en menos de 50 ms (sin `comprobar()`, que ya mide `rendimiento.test.ts`) |
| `tests/sesion.test.ts` | «Lo sé» tras escribir: dos pasos de deshacer; quitar «lo sé» con C01a y C01b silenciados: quedan los dos activos; en disco, lo mismo que hoy |

La interfaz se comprueba en el navegador (`npm run dev`, serie de prueba en memoria):
- foco y Tab;
- ratón;
- «Lo sé» y Ctrl Z;
- «Ver en la Guía» desde el panel y desde Tramas;
- canon bloqueado en el panel y en Tramas;
- rejillas sin salto;
- panel estrecho;
- lector de pantalla (nombre y descripción en el árbol de accesibilidad);
- tema claro y oscuro.

## Riesgos y vuelta atrás
| Riesgo | Qué se hace |
|---|---|
| WebKit en el Mac (foco al pulsar, `relatedTarget`) | Lo resuelven el `pointerdown`, el `mousedown` y el aplazamiento de `ConGuia`. Se prueba a mano en el Mac en cuanto esté T3b, no al final |
| Escribir más lento (el RNF pide menos de 100 ms) | `comprobar()` ya se mide en `rendimiento.test.ts` (11 ms en la serie grande). Las reglas del campo solo se calculan con el foco dentro |
| Vuelta atrás | Cada tarea es un commit. Quitar `ConGuia` de un campo lo deja como hoy. El disco no cambia |

Tamaño estimado: unas 300 líneas de lógica y 300 de tests; unas 400 de interfaz.
