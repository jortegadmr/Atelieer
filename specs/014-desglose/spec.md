# Spec 014 — Desglose del guion: por locación y personaje, datos y cuadre

> Solo el QUÉ y el POR QUÉ. Estado: **borrador a la espera de que el autor la apruebe** (2026-10-29). Recoge los apartados F, G y H de la spec 013, que quedaron aparcados, con lo ya decidido: duración objetivo en un fichero propio (Q6), cuadre guion–escena sí (Q8), presencia y habla (Q9), datos de la escena según RF-5 (Q10). Se escribe con el guion ya implementado (013) y el mundo editable (015).

## Contexto y objetivo
Con el guion escrito, los nombres de personajes y lugares viven en el texto y no en los campos de la escena. El autor quiere **rodar**: saber qué escenas ocurren en cada lugar, dónde sale cada personaje y cuánto dura cada cosa. Esta spec añade la vista «Desglose», los datos por personaje y por lugar, y el cuadre entre guion y escena. Todo lee; solo «Añadir a la escena» escribe, por el camino normal.

## Palabras
- **Locación:** el lugar del encabezado del guion, resuelto contra la ficha de lugar si su nombre o alias coincide (sin tildes ni mayúsculas); si no, el texto literal. Una escena con varios lugares sale en cada grupo, y los totales de los grupos se solapan.
- **Presencia / habla:** minutos estimados en los que un personaje aparece / habla, sobre el guion escrito.

## Requisitos
### Desglose
- RF-1: EL SISTEMA ofrecerá una vista «Desglose» con una fila por escena: código, título, episodio, locación, interior/exterior, momento del día, personajes, minutos estimados, estado y si tiene guion. De la serie, de una temporada o de un episodio.
- RF-2: EL SISTEMA obtendrá interior/exterior y momento del día **solo del encabezado** del guion: DÍA, NOCHE, AMANECER, ATARDECER y CONTINUO tras un guion (`-`, `–`, `—`). Si no se reconoce, la celda queda en «—» y la escena no entra en ese filtro.
- RF-3: EL SISTEMA dejará **filtrar** por locaciones y por personajes (uno o varios; «alguno» o «todos»), por interior/exterior, momento, temporada, episodio y estado (por defecto sin descartadas). Los filtros activos se ven siempre y se quitan de uno en uno o todos a la vez.
- RF-4: EL SISTEMA agrupará por locación (por defecto), por episodio o por personaje. Cada grupo dirá cuántas escenas tiene, los minutos, los personajes y cuántas escenas no tienen guion.
- RF-5: LOS personajes y la locación de una escena se tomarán del guion; si el guion no tiene ninguna referencia de ese tipo, de los campos de la escena. Una marca dirá de cuál sale cada dato. Una escena sin guion usa solo su ficha de escena.
- RF-6: CUANDO el autor pinche una fila, EL SISTEMA abrirá la escena en «Guion» (o en el panel si no tiene guion). El desglose no cambia ninguna pieza.
- RF-7: EL SISTEMA copiará el desglose filtrado al portapapeles como tabla Markdown, con las columnas visibles, el texto del autor escapado y un tope de 100 000 caracteres (recortando con aviso). No escribe nada en la vault.
- RF-8: SI ninguna escena cumple los filtros, ENTONCES lo dirá y ofrecerá quitarlos.

### Datos
- RF-9: POR **personaje**: escenas (con o sin guion) y episodios en los que aparece; presencia y habla en minutos (solo escenas con guion) y su porcentaje; primera y última aparición (código); escenas en las que está solo; y los cinco personajes con los que más coincide (a igualdad, alfabético).
- RF-10: POR **lugar**: escenas, minutos, porcentaje, interior/exterior y momento más habituales, y los personajes que pasan por él.
- RF-11: DE la serie o del filtro: minutos con guion (y, si hay duración objetivo, contra la prevista), escenas con y sin guion, lugares y personajes con una sola escena, y personajes que hablan sin ficha en el mundo.
- RF-12: LA duración objetivo se podrá poner por serie, temporada o episodio, en un fichero propio de la serie (no en las notas de los episodios). Es opcional.
- RF-13: LAS cifras dirán que son una estimación sobre el guion escrito y cuántas escenas se dejaron fuera por no tener guion.
- RF-14: LOS datos se podrán ordenar por cualquier columna y abrir desde cada fila (su lista de escenas, con los filtros puestos).
- RF-15: LOS análisis no escriben nada.

### Cuadre guion–escena
- RF-16: CUANDO una escena tenga guion, EL SISTEMA enseñará, en la escena y en el desglose, «En el guion y no en la escena» y «En la escena y no en el guion». Es información, no un aviso de las guías. No se hace con escenas sin guion.
- RF-17: PARA «En el guion y no en la escena» habrá «Añadir a la escena» (uno por uno o todos), por el camino normal de la spec 002: un paso del deshacer global, entero o nada. SI la escena está bloqueada por canon, ENTONCES lo dirá con su porqué y ofrecerá el desbloqueo de siempre. Nunca añade ni quita nada por sí mismo.
- RF-18: «En la escena y no en el guion» solo informa.
- RF-19: CON una variante abierta (spec 006) el desglose y los datos leen la serie principal y lo dicen; el cuadre no ofrece añadir.

## Requisitos no funcionales
- RNF-1: **La vault es la única verdad.** Nada nuevo en las notas de las piezas ni en `serie.md`; la duración objetivo, en su fichero propio, que la v1.0 ignora sin avisos.
- RNF-2: Rendimiento con el disco en memoria: desglose de 5 temporadas × 10 episodios × 30 escenas en menos de 500 ms. Con disco real, abrir la serie sigue en menos de 2 s: lo pesado se calcula en segundo plano y dice «calculando».
- RNF-3: Accesibilidad: todo con teclado; tablas con cabeceras; contraste AA. Estética de la v1 (`src/estilo/`).
- RNF-4: Sin dependencias nuevas, sin servicios externos, Windows y Mac Intel.
- RNF-5: Tests de lo que escribe (añadir a la escena, duración objetivo) y de la lectura del encabezado; la interfaz, en el navegador.

## Fuera de alcance
Exportar a PDF o a programas de guion; hojas de rodaje y calendarios; presupuestos.

## Preguntas abiertas para el autor
1. ¿La vista «Desglose» va como pestaña dentro de «Análisis» (junto a los demás) o como entrada propia del menú? *Recomendada: dentro de Análisis.*
2. Presencia: ¿cuenta el tiempo de las escenas donde el personaje solo es nombrado en una acción? *Recomendada: sí, igual que las apariciones con diálogo; el habla cuenta solo sus diálogos.*
3. Si falta la duración objetivo, ¿se oculta la comparación o se pide? *Recomendada: se oculta, sin pedir nada.*
