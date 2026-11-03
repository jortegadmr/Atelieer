# Plan — Spec 013 «Guion: escribir las escenas» (entrega 7, parte 1)

> El CÓMO de la spec 013, apartados A-E (escribir, referencias, código, páginas, guardado). Rama `013-guion`. Sin dependencias nuevas y sin cambios en `src-tauri/`. Los apartados F-H (desglose, datos, cuadre) son la spec 014.
> Revisado por un revisor independiente (30 puntos, recogidos aquí). Pendiente de aprobación del autor antes de la T1.

## Idea general
- El guion de una escena es un **dato de la serie**, no una pieza: no entra en `Modelo`, ni en `ESQUEMAS`, ni en las comprobaciones, ni en la wiki. Vive en una nota por escena (D3) y tiene su propio almacén, guardado diferido y estado, igual que la pizarra de la 012 (`almacen-pizarra.ts`, `pizarra/guardado.ts`, `estado-pizarra.svelte.ts`), que es el patrón.
- Lógica en TypeScript puro en `src/lib/guion/` (sin Svelte ni Tauri), probada con Vitest y el disco en memoria. Vistas en `src/vistas/guion/`; solo presentan.
- `sesion.ts` y `estado.svelte.ts` crecen unas líneas y no ganan lógica: la sesión gana `guion: AlmacenGuion` (como `pizarra`) y `Sesion.cerrar` vacía su guardado, como el de la pizarra; el estado crea un `EstadoGuion` en fichero nuevo.
- **El editor es propio** (D9): modelo puro del documento y una vista que lo pinta. Es el mayor riesgo, así que **lo primero es un spike en el navegador** (T1) que puede parar el plan.

## A. El guion en disco

### Formato (`appDatos/<serie>/_guion/<id de la escena>.md`)
```
---
atelier_guion: 1
escena: ev-7f3a
---
INT. TALLER – NOCHE

Los restos de la lámpara. [[Vera]] entra sin hacer ruido.

VERA
(en voz baja)
¿Hugo?
```
- Nota Markdown con cabecera mínima (versión y escena) y el texto del guion tal cual. Lo que la app no entienda de la cabecera (`extra`) se conserva. El nombre del fichero es el id de la escena; antes de construir una ruta, el id se valida con `FORMA_ESCENA = /^ev-[a-z0-9]{4,}$/` (hoy en `modelo/viene-de.ts`, se exporta) para que ningún texto llegue a una ruta.
- La v1.0 no recorre carpetas con `_` delante (`esFicheroDePieza`, como `_pizarra` y `_variantes`). Decisión en `docs/decisiones/0004-guion.md`.
- **Texto plano inspirado en Fountain (D7).** Tipos forzados con prefijo, solo en la forma estricta de Fountain: `.` seguido de una letra (así «.5 segundos» y «...y entonces» no cuentan), `@` seguido de letra, `!` seguido de letra o dígito, `>` seguido de espacio o letra. Eso son encabezado, personaje, acción y transición. «...y entonces», «.5 segundos» o «!!» **no** son forzados y se ven intactos. El editor oculta el prefijo y muestra el tipo; en disco queda. Un `@` real al principio de línea en disco es, por tanto, «personaje forzado»; el selector de menciones (RF-11) escribe `[[ ]]`, nunca `@`. Un test de ida y vuelta cubre cada prefijo y las líneas parecidas.
- **Referencias:** `[[Vera]]`, `[[Vera|la Gaviota]]` y, si dos fichas se llaman igual, `[[01_Wiki/Personajes/Vera|Vera]]`. La ruta del texto sirve solo para elegir entre fichas ya leídas.
- Finales de línea: se leen LF y CRLF y al guardar se conserva el estilo del fichero (LF si es nuevo). Versión mayor que 1: solo lectura. Cabecera ilegible: se aparta a `_guion/<id> rota <sello>.md` (un nombre que no es un id, así que se trata como ignorado y no se vuelve a leer) y se empieza vacío, avisando.
- **Topes (RNF-12):** `leerGuion` mira solo los bytes (1 MB); el de 500 págs lo mira `medir` (T5). Al pasarlos el guion se abre en solo lectura. **Pegar** un texto que haría pasar el tope se rechaza entero con un aviso (nada se corta en silencio). Un fichero de más de 2 MB o no `.md` en la carpeta se avisa y se ignora.
- **«Con guion»:** algún carácter que no sea blanco. Todo en blanco: el fichero se conserva con el cuerpo vacío y la escena vuelve a «sin guion».

### `src/lib/guion/` (puro)
- `tipos.ts`: `TipoLinea` (`encabezado | accion | personaje | parentesis | dialogo | transicion | blanco`), `Guion`, y **`MEDIDAS`**, la única fuente de verdad de anchos, sangrías y líneas por página. La interfaz genera de ella su estilo en línea (anchos en `ch`), así que el CSS y `medir` no pueden desincronizarse.
- `formato.ts`: `leerGuion` / `escribirGuion` (idempotentes, conservan cabecera ajena, finales de línea y blancos; control y bidi se conservan y se muestran como texto).
- `referencias.ts`: `partir` / `unir` (lectura tolerante: `[[` sin cerrar es texto); `resolver(ref, fichas)` **solo contra las fichas que ya leyó `Wiki`**, con `claveLimpia` de `wiki/md.ts` (el mismo normalizador que usa `Wiki` al buscar y sugerir), nunca construye una ruta ni una dirección; los duplicados se buscan en la lista de fichas (`Wiki.de(tipo)`), porque `buscar` guarda una por clave; `agrupar(nombre)` quita `(V.O.)`, `(O.S.)`, `(CONT'D)`, tildes y caja.
- `lineas.ts`: `clasificar`, `siguienteAlEnter` y `cambiosDeTipo(antes, despues)` (RF-31: qué líneas cambian de tipo tras una relectura por fuera).
- `paginas.ts`: `medir(texto, mostrado)`.
- `codigos.ts`: `codigosDeEscenas(m)`.
- `documento.ts`, `historial.ts`: modelo del editor (apartado B).
- `indice.ts`: `IndiceGuion` (totales; apartado C).

### Reconocimiento de líneas (RF-3)
Una línea guardada se clasifica por sí misma y por la anterior y la siguiente. Reglas, en orden:

| # | Regla | Tipo |
|---|---|---|
| 1 | Prefijo forzado estricto (arriba) | encabezado (`.`), personaje (`@`), acción (`!`), transición (`>`) |
| 2 | Línea en blanco | blanco |
| 3 | `INT.`, `EXT.`, `I/E.`, `INT./EXT.`, `EXT./INT.`, `INT/EXT.` o `EXT/INT.` (sin distinguir caja), un espacio y texto | encabezado |
| 4 | Entre paréntesis y la anterior es personaje, paréntesis o diálogo | paréntesis |
| 5 | No en blanco y la anterior es personaje, paréntesis o diálogo | diálogo |
| 6 | Todo en mayúsculas y termina en `:` | transición |
| 7 | Todo en mayúsculas (dígitos, tildes y una extensión final entre paréntesis admitidos), hasta 40 caracteres, no termina en `.` `!` `?`, precedida de blanco o inicio, y **la siguiente línea no está en blanco** | personaje |
| 8 | Lo demás | acción |

Se alinea con la spec RF-3 (que pasa a incluir `INT/EXT.`). Casos fijados como tests: `INT. TALLER - NOCHE`, `int. taller`, `INT/EXT. COCHE`, `INT TALLER` y `INT.TALLER` (acción), `INTENTA SALIR` (acción), `UN GOLPE.` (acción), `VERA (V.O.)` seguida de texto (personaje), `VERA` al final del documento o con blanco debajo (acción), `CORTE A:` (transición), `> FUNDIDO` (transición forzada), `(en voz baja)` bajo un personaje (paréntesis) y suelto (acción), `...y entonces` (acción intacta).

### Línea vacía con tipo pendiente y Enter (RF-4)
Para que las dos tablas no se contradigan, el **modelo del editor** (no el disco) lleva en la línea vacía donde está el cursor un `tipoPendiente` (`accion | personaje | dialogo`). Una línea vacía con `tipoPendiente` se comporta como ese tipo mientras se escribe; al guardarse, vuelve a clasificarse con las reglas de arriba (un personaje al que no se escribió diálogo vuelve a ser acción al reabrir). En una línea con `tipoPendiente = personaje`, lo escrito **se pone en mayúsculas** y se guarda en mayúsculas.

| Al pulsar Enter… | Resultado |
|---|---|
| al final de encabezado, acción o transición | blanco y línea nueva, `tipoPendiente = accion` |
| al final de una línea que cumple la regla 7 sin mirar la siguiente (personaje escrito) | línea nueva pegada, `tipoPendiente = dialogo` |
| al final de personaje o paréntesis | línea nueva pegada, `tipoPendiente = dialogo` |
| al final de diálogo con texto | línea nueva pegada, `tipoPendiente = dialogo` |
| en un diálogo vacío (tipo pendiente) | se quita esa línea, queda un blanco y una línea nueva con `tipoPendiente = personaje` (dos Enter = nuevo personaje) |
| en una acción vacía con `tipoPendiente = accion` | no añade más blancos (no apila líneas vacías) |
| en medio de una línea | la parte; la segunda mitad recibe el tipo que le toque por las reglas |
| al principio de una línea con texto | inserta un blanco encima; la línea conserva su tipo |
| con selección | primero borra la selección y luego aplica la fila que toque |

Tab y Mayús + Tab recorren el tipo forzado de la línea: `auto → acción → personaje → encabezado → transición → auto`. Esc y luego Tab sacan el foco del editor (se anuncia). Cada fila de ambas tablas tiene su test.

### Medidas (RF-8) y páginas
`MEDIDAS`: encabezado y acción 60 car.; diálogo 35 con sangría 10; paréntesis 25 con sangría 16; personaje 35 con sangría 22; transición 60 a la derecha; 55 líneas por página con una línea en blanco entre elementos (Letter, 6 líneas por pulgada). Partir por palabras al ancho de su tipo; una palabra más larga que el ancho se parte por caracteres. Página de una escena = `(líneas + blancos) / 55`; total del episodio = suma de sus escenas; el documento no pagina. Segundos = páginas × 60. El tamaño de letra de la interfaz (10 a 16 pt) no cambia el cálculo. Una escena de solo el encabezado ≈ 0,0 págs. Las medidas se contrastan con el estándar en la T5.

### Código de escena (RF-20 a RF-22)
Por posición en el orden de la spec 003. **Las escenas descartadas conservan su posición**, así que descartar o recuperar una no renumera las demás (puede haber huecos). Mover de episodio, reordenar, crear o borrar sí renumera. Con una variante abierta, los códigos se calculan contra la serie principal.

### Almacén (`src/lib/almacen/almacen-guion.ts`)
`AlmacenGuion(almacen, carpeta)` sigue a `AlmacenPizarra`, **por escena**:
- `cargar(id)`, `guardar(id, guion)` (cola por id; relee y compara con lo conocido; `CambioFuera`, `BorradaFuera`; `escribirSeguro`; un guion vacío que nunca se escribió no deja rastro), `comprobarFuera(id)`, `releer(id)`.
- `copiaAPapelera(id, texto)`: `_papelera/_guion/<id> copia <sello>.md` (los movimientos de `moverAPapelera` son `<id> <sello>.md`, para que devolver no confunda copias con movimientos), `(2)` si coincide, sin pisar. **Copia el texto que se le pasa**, que es el de la memoria justo antes de aplicar el cambio (no el del disco, que puede ir 600 ms atrás).
- `moverAPapelera(id)` / `devolverDePapelera(id)`: para borrar la escena, su deshacer y su rehacer; no borra nada, mueve el fichero.
- `listar()`: guiones por id válido con su tamaño; **huérfanos** (id válido de escena que no existe); **ignorados** (nombre que no es un id, `esConflicto` de `conflictos.ts` —que hoy reconoce `(# Edit conflict … #)`—, binarios o enormes). No se inventa un patrón «Name clash»: el autor confirma cómo se llaman en su vault y entonces se amplía `esConflicto` con su test.

### Cambio por fuera (RF-28) — nada se descarta
Ante `CambioFuera` de una escena, `EstadoGuion` **conserva la versión local intacta** y bloquea el guardado de esa escena. Ofrece tres caminos, cada uno con copia previa en la papelera:
- «Quedarme con la mía»: copia de la del disco a la papelera y escribe la local.
- «Usar la de fuera»: copia de la local a la papelera y carga la del disco.
- «Copiar la mía»: al portapapeles (con caja de respaldo si falla), sin cambiar nada más.
Hasta que el autor elija, el texto local sigue en pantalla.

### Guardado diferido (`src/lib/guion/guardado.ts`)
`GuardadoGuion(almacen, esperar = setTimeout)` como `GuardadoPizarra`, **por escena**: 600 ms tras el último cambio; `vaciar()` (salir de la vista o de la escena, `Sesion.cerrar` y `alCerrarVentana`, cambio de serie, restaurar); un fallo se enseña, mantiene el texto y reintenta con el siguiente cambio o con un botón.

### Vigilancia e instantáneas
- `vigilancia.ts`: `escanear` y `relevante` aprenden la carpeta `_guion` (`<id>.md` válidos; lo demás, ignorado, con el mismo cuidado con conflictos); `repartir` la **excluye** del grupo «resto» (hoy filtra solo variantes y pizarra); `recargar` ya ignora carpetas sin tipo; oyente nuevo `alCambiarGuion(id)`. Test: «un cambio en `_guion` no llega a `alCambiar`».
- `instantaneas.ts`: `ficherosDeCopia()` añade `_guion/*.md`; `restaurar` escribe los guiones de la copia (la instantánea automática que ya hace `restaurar` guarda antes los actuales: se prueba que lo restaurado se puede recuperar) y no toca los guiones actuales si la copia no los tiene; tras restaurar se reinician el `conocido` del almacén, `EstadoGuion` e `IndiceGuion`. Riesgo: el tamaño de las copias crece con N guiones; se mide en la T22.

### Sesión: qué mueve el guion y qué lo deja huérfano
El enganche vive **solo en la sesión principal** (`SesionVariante extends Sesion` comparte `almacen`: su `aplicar` no toca `_guion/`; test «borrar una escena dentro de una variante no mueve nada»). Camino por camino (cada uno con test; el guion se mueve **después** de que el borrado de la pieza haya salido bien, y si moverlo falla se avisa y se reintenta, sin deshacer el borrado):

| Camino | Guion |
|---|---|
| Borrar una escena | se mueve a la papelera |
| Borrar una temporada o un episodio (cascada de escenas) | se mueven los de todas sus escenas |
| Deshacer la creación de una escena | se mueve a la papelera |
| Deshacer un borrado / rehacerlo | se devuelve / se vuelve a mover |
| «Volver a como estaba» | como deshacer, por el diff de ids |
| Aplicar una variante | se mueven los de las escenas que borra; los de las que crea no existen aún |
| Borrado desde fuera (Obsidian, otro equipo, vigilancia `recargar`) | el guion queda como **huérfano**, se avisa y no se toca |
| Mover de episodio, a la bandeja, descartar, recuperar | no toca el guion (viaja por id) |

**Canon:** escribir un guion no pasa por el bloqueo de canon (RF-32), con test sobre una escena canon.
**Variantes (RF-33):** con una variante abierta, `EstadoGuion` lee los ids de escena de la **serie principal** (`sesionSerie.modelo`, como la pizarra) y está en solo lectura; el guion de una escena que solo existe en la variante no existe hasta aplicarla.

## B. El editor (D9)
- **Modelo puro** (`documento.ts`): `Documento = Linea[]`; `Linea = { segmentos; forzado?; tipoPendiente? }`; una referencia es **una unidad** en las posiciones. Operaciones puras: `insertarTexto`, `insertarReferencia`, `partirLinea`, `unirConAnterior`, `borrarRango`, `borrarAtras/Adelante` (una referencia de una vez), `cambiarForzado`, `reemplazar` (pegar). `desdeTexto` / `aTexto` ida y vuelta idéntica.
- **Copia previa (RF-30):** `documento.ts` calcula, por cada gesto (suprimir, cortar, reemplazar al pegar, deshacer), cuántos caracteres de texto se pierden; si pasan de 500, el estado llama a `copiaAPapelera` con el texto en memoria **antes** de aplicarlo. Tests por gesto.
- `historial.ts`: deshacer/rehacer propios por escena (escribir seguido se junta por pausa de 1 s; 200 pasos; en memoria), separados de los de piezas y pizarra. El reparto de Ctrl Z / Ctrl Y según el foco se extrae a una función pura de `lib/app/` (patrón de la pizarra) y se prueba; `Carcasa.teclas` la usa.
- **Vista**: contenedor `contenteditable` cuyas líneas pinta el modelo; todo cambio de texto se intercepta con `beforeinput`, se aplica al modelo y se repinta; la selección se traduce entre el DOM y las posiciones del modelo; composición (acentos, IME): se deja a la nativa y se vuelca al terminar (`compositionend`). Un bloque por escena; las flechas arriba/abajo pasan de un bloque al siguiente.
- **Spike (T1):** en el navegador (Chromium) y, a mano, en WebView2 y el WebKit del Mac: `beforeinput`, selección, teclas muertas, pegado y flechas entre bloques. **El autor prueba el spike en el Mac Intel antes de seguir**; si algo no es fiable se para y se pregunta por la alternativa de D9 (referencia como texto `[[…]]` visible sobre un campo nativo con resaltado).

## C. Interfaz
- `src/vistas/Guion.svelte` (entrada «Guion» en `MenuIzquierdo`; `Vista` en `lib/vistas/visor.ts` gana `"guion"`; `nivelAlCambiarVista` y `vistaDeNivel` mantienen el nivel como con `pizarra` y `analisis`, con test): a la izquierda `ListaEscenas.svelte` (código corto, título, lugar, «sin guion», páginas, sección «Bandeja de la temporada»; ocultable), en el centro el documento del episodio con `BloqueEscena.svelte` y a demanda `FichaLectura.svelte`.
- `SelectorRef.svelte`: abre con `@` al principio de línea o tras un espacio y en una línea de personaje (lógica pura en `guion/selector.ts`, con test). `Wiki.sugerir` devuelve vacío con texto vacío y solo filtra por prefijo, así que se añade `Wiki.listar(tipos, consulta, max)` (consulta vacía → las primeras; «contiene» sin tildes ni caja con `claveLimpia`; tope 8 por defecto) con test; en la interfaz «época» es el tipo `era` de `Wiki`. Test: lo que ofrece el selector se resuelve luego.
- `FichaLectura.svelte`: nombre, tipo, resumen y motor de la ficha leída, con «Abrir en Obsidian» (`Wiki.urlObsidian`); Ctrl/Cmd + clic abre Obsidian directo; **usa solo `Ficha.ruta` leída, nunca la ruta del texto** (RF-17); una referencia sin ficha no llama a abrir (test). Solo direcciones `obsidian://`. Teclado: Alt + Enter (Opción + Enter en Mac, que no produce carácter) con el cursor sobre la referencia, y un botón «Abrir ficha» en la barra del bloque que actúa sobre la referencia bajo el cursor.
- `EstadoGuion` (`lib/app/estado-guion.svelte.ts`, runes): episodio en marcha, bloques cargados, selección, anuncios (`role="status"`), fallo de guardado, cambio por fuera con sus dos versiones, solo lectura (variante, formato futuro o tope). Abrir la vista no escribe nada.
- **`IndiceGuion`** (puro, en memoria y descartable): páginas por escena, calculadas en segundo plano con tope de concurrencia (4 lecturas a la vez), invalidadas por `alCambiarGuion`, por mover o borrar una escena y por restaurar, y canceladas al cambiar de serie; episodio, temporada y serie son sumas; bandeja solo en temporada y serie; «calculando» mientras tanto. Test puro con disco en memoria antes de la interfaz.
- Cambio de tipo por blancos por fuera (RF-31): `EstadoGuion` compara `cambiosDeTipo` en cada relectura y avisa de las líneas afectadas.
- Código `S03` en las tarjetas de escena del visor donde hoy se enseña el orden (la T20 localiza los sitios). Un texto dice que es calculado.
- **Aspecto tipo Slugline** (petición del autor): la hoja es un rectángulo de ancho fijo `MEDIDAS` (60 car. de texto más márgenes) centrado sobre un fondo neutro, con sombra suave y sin bordes de formulario; el texto de cada escena sigue sin cajas ni separadores salvo un espacio entre escenas; el nombre del tipo de línea, el código y las páginas se ven en el margen o en una barra fina, no dentro de la hoja; la lista de escenas es un panel lateral discreto; en oscuro la hoja es oscura. Se valida mirando una captura contra las de Slugline antes de cerrar la T13a y de nuevo en la T20.
- Estética de `src/estilo/`; papel y tinta del guion son tokens en `:root` y en el tema oscuro; `tests/contraste.test.ts` los mide. Courier New con `Courier, monospace` de reserva.

## Rendimiento (RNF-4)
Con el disco en memoria: documento de 15 escenas (45 págs) < 100 ms, de 40 × 3 < 300 ms; recalcular una escena al teclear < 50 ms por pulsación (test de `medir`). Con el disco real (copia de `_prueba` con `_guion/`) abrir la serie sigue en < 2 s porque ningún guion se lee al abrir. Los guiones se leen al entrar en la vista.

## Compatibilidad con la v1.0 (RNF-2)
Prueba nueva con el patrón de `tests/compat-pizarra.test.ts`: serie con `_guion/<id>.md` y `_papelera/_guion/` abierta con el lector congelado de la v1.0 sin avisos; guardar, borrar y papelera de la v1.0 no los tocan; la v1.0 restaura un zip de la v2 con guiones sin romper ni mover nada; sin guiones, la serie es idéntica.

## Texto real
Las convenciones del proyecto prohíben probar contra la vault real. Para comprobar el clasificador y las páginas con texto de verdad, el autor pega 2 o 3 fragmentos de guion en `tests/fixtures/guion-*.txt` (o se escriben a partir de lo que el autor dicte), y la carga se prueba con una **copia** de `_prueba` con `_guion/`.

## Riesgos
- **Editor propio** (selección, IME, deshacer): el spike T1 decide antes de invertir en lo demás, incluyendo una prueba del autor en el Mac.
- **Sesión (RF-34):** el enganche está en la sesión principal con el diff de ids; si no hay un punto limpio, se para y se pregunta.
- **Medidas de página:** del estándar; la comparación real con Trelby o Slugline la hace el autor a mano.
- `vigilancia.ts` e `instantaneas.ts` son comunes a todo: cambios aditivos con sus tests antes.
- Muchos bloques en WebView2 pueden pintar lento; se comprueba con 40 escenas.
- Tamaño de las instantáneas con cientos de guiones.
