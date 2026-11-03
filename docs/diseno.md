# Diseño — Atelier v2

> Línea visual y de experiencia. Base: la v1 (`src/estilo/`) y el boceto H (`docs/bocetos/h-atelier-v1-mejorada.html`). Lo que no está aquí se hace como en la v1.

## Brief
| | |
|---|---|
| Sensación | Estudio de trabajo: sobrio, denso, tranquilo. La serie es la protagonista, no la interfaz. |
| Referencia | La v1 (colores, espacios, iconos) y su maqueta. |
| Dispositivo | Escritorio (Windows y Mac Intel), ventana mínima 900 × 600. Sin móvil. |
| Tema | Oscuro por defecto («Estudio oscuro»); claro disponible con el botón de tema. |
| Acento | Uno solo: terracota (`--accent`). El resto, neutros y los colores con significado. |

## Principios de experiencia
1. **La serie entera, siempre a la vista.** El visor de arriba enseña dónde estás dentro de la serie.
2. **Zoom, no pantallas.** Pinchar una temporada la hace ocupar todo el ancho del visor; pinchar un episodio, igual; y así hasta la escena. La miga de pan (`Serie › T01 › E03`) sube de nivel; va en la barra superior y sustituye a la de la v1 (spec 002). Animación corta (0,22 s) al bajar y al subir.
3. **Ver el efecto antes de decidir.** La pestaña «Si lo dejas así…» enseña qué ha cambiado desde que se abrió la pieza, qué avisos saltan (con sus reglas) y qué otras piezas cambian. Solo con la pestaña abierta, el visor resalta lo afectado y atenúa lo demás (spec 005).
4. **La guía avisa, el autor decide.** Los avisos dicen la regla (G01-G49, M01-M02), por qué no se cumple y qué se podría hacer. Nunca bloquean.
5. **Crear en cada nivel.** Barra «Nuevo…» bajo el visor con lo que se puede crear en el nivel actual (trama, temporada, episodio, acto, escena, secreto, idea). La ventana «Nueva pieza» enseña la ruta donde se guarda y el estado inicial.
6. **Probar sin miedo.** «¿Y si…?» abre una variante: la barra superior cambia de tono y nada toca la serie hasta «Aplicar». También «Aparcar» y «Descartar» (nada se borra).

## Paleta (tokens de `src/estilo/tokens.css`)
Oscuro (por defecto) · Claro.

| Token | Uso | Oscuro | Claro |
|---|---|---|---|
| `--bg` / `--side` | Fondo / menú izquierdo | `#141416` / `#18181B` | `#F4F2EE` / `#EEEBE5` |
| `--surface` / `--surface-2` | Tarjetas y paneles | `#1E1E22` / `#1A1A1E` | `#FFFFFF` / `#FAF9F6` |
| `--ink` / `--ink-2` / `--ink-3` | Texto / secundario / pistas | `#ECE9E3` / `#A9A49B` / `#8A8781` | `#1D1B18` / `#57534C` / `#6B6861` |
| `--accent` | Acción principal, selección, «¿Y si…?» | `#D9774F` | `#A4492A` |
| `--plus` / `--minus` | Carga + / − (montaña rusa) | `#D4AA55` / `#7E9CC4` | `#846321` / `#4C6B90` |
| `--warn` / `--ok` | Aviso de la guía / cumple | `#E07A52` / `#78B48C` | `#AA4C2A` / `#427353` |
| `--t1`…`--t6` | Color de cada arco | v1 | v1 |

**Contraste medido en la v1** (texto sobre `--bg` y `--surface`, mínimo 4,5:1):
- Oscuro: todo cumple salvo `--ink-3` (3,9 / 3,5).
- Claro: no cumplen `--ink-3` (3,2 / 3,5), `--warn` (4,1), `--ok` (3,7) y `--plus` (2,8).

**Aprobado (2026-10-20):** subir solo esos tonos, sin cambiar el aspecto.

**Aplicado (spec 001, T3).** Al medir también sobre `--side` y `--surface-2` salió además `--minus` del claro (4,36). Valores finales, todos ≥ 4,5:1 sobre los cuatro fondos (test `tests/contraste.test.ts`):
- Oscuro `--ink-3` `#77736C` → `#8A8781`.
- Claro `--ink-3` → `#6B6861`, `--warn` → `#AA4C2A`, `--ok` → `#427353`, `--plus` → `#846321`, `--minus` → `#4C6B90`.
- Los colores de arco y las marcas de dibujo (paradas, curva) no son texto: se quedan como están. La v1 no se toca.

## Tipografía (ya dentro del programa, sin internet; licencia OFL)
| Familia | Uso |
|---|---|
| Instrument Serif | Títulos de pieza, nombres de temporada y episodio, frases vacías en cursiva |
| Geist (400, 500, 600) | Interfaz y texto. Cuerpo 13 px / 1,45 |
| Geist Mono | Códigos (T1, E03, G12), rutas, cifras tabulares |

## Iconos
Lucide (`@lucide/svelte`, ya instalada). Trazo fino, 15-16 px. Uno por concepto y siempre el mismo (boceto H: `flask-conical` = «¿Y si…?», `plus` = crear, `sun-moon` = tema…).

## Dibujo del visor (como la v1)
- **Paradas de un arco:** abre = anillo, avanza = punto, gira = círculo medio lleno, cierra = barra.
- **Carga:** curva + / − por episodio; el siguiente empieza como acabó el anterior.
- **Secretos:** icono en el punto de siembra y en el de revelación; en `--warn` si una regla falla.
- **Bomba de tiempo:** marca en su episodio límite.
- **Antes:** discontinuo gris (`--ink-3`), siempre con texto («antes 4», «Estaba aquí: «título»», «Ya no está: «título»») = cómo estaba desde que se abrió la pieza (spec 005).
- **Fantasma:** discontinuo en `--accent`, siempre con texto, con una variante abierta (spec 006): en «Cómo quedaría», cómo está ahora («ahora 4», «Ahora aquí», «Nueva en la variante», «Sale en la variante»); con «Ver ahora», cómo quedaría («quedaría 5», «Quedaría aquí»). Con «Si lo dejas así…» abierta manda su gris («antes»).
- **Olvido:** franja rayada en `--warn` donde un arco desaparece demasiados episodios (G14).
- **Pendiente o plan:** borde discontinuo.

## Pantalla principal
```
┌ Menú izq. ┬ Barra: miga · vistas · Buscar o crear (Ctrl K) · ¿Y si…? · + Idea · tema ┐
│           ├ (con variante) ¿Y si…? «nombre» · Ver ahora · Aparcar · Descartar · Aplicar ┤
│ series    ├──────────────────────────────────────────────────────────┬───────────────┤
│ vistas    │ VISOR con zoom (serie › temporada › episodio › escena)   │ INSPECTOR     │
│ bandeja   │ Nuevo: trama · temporada · episodio · … (según nivel)    │ Editar        │
│           │ Contenido del nivel (tablero, rejilla, lista de arcos,   │ Si lo dejas así│
│           │ línea de la historia…)                                   │ ¿Y si…? (var.)│
│           │                                                          │ Guía · Ficha  │
└───────────┴──────────────────────────────────────────────────────────┴───────────────┘
```

## Componentes
Se reutilizan los de `src/estilo/componentes.css` (`.btn`, `.btn.pri`, `.btn.ghost`, `.ib`, `.card`, `.chip`, `.pill`, `.tabs`, `.seg`, `.crumb`, `.f`, `.warnbox`, `.insp`, `.side`, `.top`…). Nuevos del boceto H:

| Componente | Qué es |
|---|---|
| `.visor` + `.colv` | Visor con zoom; cada columna (temporada, episodio) se pincha para bajar. En el nivel episodio, `.actos` con una `.acto` por acto (Teaser, Inicio, Desarrollo, Desenlace y Sin acto si hace falta), tarjetas `.colv` de escena, `.marca` donde cae al arrastrar y `.curva` debajo; en el nivel temporada, `.bandeja-v` tras los episodios (spec 003). Columnas en `flex` con desplazamiento horizontal propio (con 40 escenas no caben). `.cur` elegida, `.mal` con avisos |
| `.crearbar` | Botones discontinuos «Nuevo…» del nivel actual |
| `.colv.afectada`, `.colv.dim` | Con «Si lo dejas así…» abierta: lo afectado con borde `--accent` (y «afectada» para el lector); lo demás con fondo `--bg` y texto `--ink-3`, sin opacidad (4,5:1) |
| `.antes`, `.estaba`, `.ya-no` | Cómo estaba, en discontinuo gris con texto: «antes …» junto al dato de la columna, «Estaba aquí» entre las tarjetas de donde salió una escena, «Ya no está» bajo el nivel |
| `.fantasma`, `.olv` | Con variante abierta, las marcas `.antes`, `.estaba` y `.ya-no` pasan a `--accent` con los textos de la variante (spec 006); olvido |
| Inspector en pestañas | Editar · Si lo dejas así… (con su cifra y el icono de aviso) · ¿Y si…? (solo con variante abierta, con su cifra) · Guía · Comprobar. Si no caben, siguen en otra fila |
| `.velo` + `.vent` | Ventana «Nueva pieza»: formulario a la izquierda; a la derecha, «Lo que te pedirán tus guías» (spec 004) y «Si la creas así…»: dónde aparecerá, qué cambiará y qué avisos saltarán (spec 005); ruta de guardado |
| `.ysibar` + `.ysi-on .top` | Barra de la variante abierta bajo la barra superior, en tono de acento (y la barra superior con el mismo tono): «¿Y si…?», el nombre (se cambia pinchándolo), el icono de choque con su cifra, «Ves cómo quedaría…», Ver ahora · Aparcar variante · Descartar variante · Aplicar. Debajo, en `.warnbox`, la confirmación de aplicar o el porqué de descartar. Sin variante, `.ysi-aviso` con el último aviso |
| `.menu-ysi` | Menú del botón «¿Y si…?»: Nueva variante, Aparcadas (Aplicar · Abrir, icono de choque) y «Aplicadas y descartadas (N)» (Recuperar · Ver, con el porqué en serif cursiva) |
| Versiones en Editar | «Probar otra versión» y «Versiones (N)» de la pieza, cada una con Abrir · Lado a lado · Aplicar |
| Pestaña «¿Y si…?» | Choques (con «Lado a lado» y «Traer lo de ahora»), Lo que cambia la variante («Pisa lo de ahora»), Avisos que saltarían, Quitar de la variante |
| Lado a lado | Ventana `.velo`: la pieza en dos columnas («Ahora» / «Cómo quedaría» o «Antes de aplicar» / «Lo que aplicó»), con «cambia» y «cambió en la serie» en texto |
| Línea de la historia (`Historia.svelte`, `.linea` + `.col` + `.tarjetas`) | Una columna por época de la Timeline (y «Sin época», «No está en la wiki»), con «Presente» donde lo marque la Timeline; `.filtro` con el selector de temporada (como los campos del panel). Cada `.tarjeta` (`TarjetaHistoria.svelte`): título, dónde se emite, `.est` con el estado en texto (aparcado atenuado, descartado tachado) y `.marca-antes`. Se mueve con arrastre o Alt + flechas; solo cambia `mundo` (spec 009) |
| `.estaba` en Tramas, rejilla y línea | Las marcas de la spec 005 y 006 en las tres vistas: «Nueva», «antes: abre», «Estaba aquí: «título»», «Ya no está: «título»»; en gris o, con variante, en acento; siempre con texto y sin mover nada (spec 009) |
| Pestaña «Ficha» (`PestanaFicha.svelte`) | La ficha de la wiki apartado a apartado: un campo `.f` por apartado («Inicio» y cada `## `), con la ruta (`.wkpath`) y «Abrir en Obsidian». Se guarda al salir del campo y a los 2 s; los títulos solo en Obsidian. Si cambió fuera, `.warnbox` con «Ver la de Obsidian». Solo lectura en la variante, con «Ver ahora» o con canon bloqueado (spec 009) |
| Aviso de estado antiguo (`EstadoAntiguo.svelte`) | `.warnbox info antiguo` en Editar y en Ficha cuando la ficha dice un estado de antes de la regla 9: qué dice, la propuesta, «Confirmar» (con su porqué si es descartado) y «Dejarlo así»; luego «Dejado así: «…»» con «Quitar» (spec 009) |
| Lente (`.lente` en la barra, `BuscarLente.svelte`, `MenuContextual.svelte`) | Botón «Lente» con buscador de personajes, arcos y secretos; puesta, «Lente: nombre · tipo» con «Quitar lente» y, si no hay nada que ver, el aviso. «Enfocar» en el menú contextual (clic derecho, tecla de menú, Mayús F10). Lo de fuera, `.fuera-lente`: fondo `--bg` y texto `--ink-3`, sin opacidad, y «fuera de la lente» para el lector (spec 010) |
| Vista «Análisis» (`Analisis.svelte`) | Cabecera `.vh` con selector de temporada `.filtro` y `.tabs` (Presencia · Quién sabe qué · Esquema, con flechas). Tablas `table.analisis` dentro de `.caja-tabla` (se desplazan en su caja, primera columna fija); cada casilla es un botón que lleva al episodio; ausencia larga con raya `--warn` y texto. Esquema en lista con «Copiar» y, si el portapapeles falla, `.respaldo` con el texto seleccionado (spec 010) |
| Causa y efecto (`CausasEscena.svelte`, `analisis/CausaEfecto.svelte`) | En Editar de la escena, «Viene de» (con `BuscarEscena.svelte`, quitar con ✕) y «Provoca», cada escena como enlace con dónde se emite y `.marca` en texto («se ve después», «sin sitio todavía», «círculo», «(descartada)», «(ya no está)», «(no se entiende)»). Pestaña «Causa y efecto» de Análisis: `.cadena` como lista anidada, `.ref` con los enlaces de fuera, «ver arriba» como enlace y `.sueltas` al final (spec 011) |
| Plantillas de estructura (`panel/ApartadoPlantilla.svelte`, rejilla) | En Editar de la temporada, un apartado por plantilla: por momento, nombre con su sitio, explicación, texto, episodio y escena; Save the Cat y Viaje del héroe en `details` plegados si están vacíos. En la rejilla, `.filtro` «Plantilla» en la cabecera y una fila «Plantilla» bajo las cabeceras (`.g-p`): `.franja` con nombre y «E02», «desde E03», «sigue», «hasta E05» (trazo discontinuo si sigue de otra columna), `.mas` «+N más» y `.atado` con borde de acento y su texto al pasar o enfocar. Columna «Previstos» con fondo `--bg`. Colocación explícita `grid-row`/`grid-column` (spec 011) |
| `.reglas-campo` | Regla de la guía bajo el campo con foco: código, texto, fuente, marca con icono y texto, avisos, «Lo sé» y «Ver en la Guía» (spec 004). Se llama así y no `.pista` porque esa clase ya la usan las pistas del secreto |

## Estados de la interfaz
- **Vacío:** frase en serif cursiva y el botón para crear lo que falta (`.vacio-v`).
- **Cargando:** sin spinners largos; la serie abre en menos de 1 s (medido en la v1).
- **Error:** `.warnbox` con qué pasó y qué hacer, en español llano. Nunca un error técnico suelto.
- **Confirmar:** dentro de la interfaz (pie del panel, o junto a la variante en la barra, el menú y «Versiones»), nunca ventanas del sistema (fallan en Mac).
- **Aviso de la guía:** `--warn` + código de regla; se puede ignorar y queda constancia.

## Accesibilidad y reglas
- Contraste ≥ 4,5:1 en texto (ver ajuste de paleta).
- Todo se puede hacer con teclado; foco visible (anillo `--accent`). Atajos de la v1: Ctrl K, Ctrl Z, Esc sube de nivel en el visor.
- Los colores nunca son la única señal: la carga lleva + / −, los avisos llevan icono y código.
- Campos con etiqueta; iconos solos con `title` y `aria-label`.
- Textos que no se cortan sin avisar: puntos suspensivos y el nombre completo en `title`.
- Botones de al menos 28 px de alto.
- Respetar «reducir movimiento» del sistema: sin animación de zoom.

## Fuera de esta línea
Nada de temas nuevos, otros acentos, fuentes externas ni librerías de componentes.
