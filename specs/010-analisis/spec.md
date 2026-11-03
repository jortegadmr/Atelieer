# Spec 010 — Análisis: lente, presencia, quién sabe qué y esquema (entrega 6, parte 1)

> Solo el QUÉ y el POR QUÉ. Nada de tecnología, archivos ni esquemas: eso va en plan.md.
> Estado: aprobada por el autor el 2026-10-22 («adelante»). Revisada por un QA independiente (30 puntos, recogidos aquí).

## Contexto y objetivo
La entrega 6 del PRD es G10 (análisis). La «vista cronológica» ya es la línea de la historia (spec 009). El resto va en tres specs (decisión del autor, 2026-10-22):
- **010 (esta):** lo que se lee de lo que ya hay, más un dato pequeño: lente, mapa de presencia, quién sabe qué y vista esquema.
- 011: causa y efecto entre escenas y plantillas de estructura.
- 012: pizarra libre y llevar a la sala de guionistas.

Decisiones del autor (2026-10-22):
1. «Quién sabe qué» lleva **desde cuándo** lo sabe cada personaje: dato nuevo en el secreto.
2. La lente enfoca un personaje, un arco o un secreto, uno cada vez.
3. Presencia: personajes × episodios de la temporada; cuenta escenas.
4. Esquema: leer, copiar y abrir escenas; no se edita en el texto.
5. Presencia, quién sabe qué y esquema van en una sola vista, «Análisis», con tres pestañas.
6. La lente se pone con un botón o desde una pieza, y vive en memoria.

**Por qué.** Hoy el autor ve la estructura, pero no puede preguntar a la serie por un personaje o un secreto: dónde está, cuándo desaparece, quién sabe qué en cada episodio y qué sabe el público. Tampoco puede leer la temporada de un tirón como texto.

## Usuarios
El autor, en su PC con Windows y en su Mac Intel.

## Historias de usuario
- H1: Como autor quiero enfocar un personaje, un arco o un secreto y que lo demás se atenúe, para seguir su hilo por toda la serie.
- H2: Como autor quiero ver en qué episodios sale cada personaje y cuánto, para detectar ausencias largas y desequilibrios.
- H3: Como autor quiero ver, episodio a episodio, qué sabe el público de cada secreto y qué personajes lo saben, para controlar la tensión dramática.
- H4: Como autor quiero apuntar desde qué episodio sabe un personaje un secreto.
- H5: Como autor quiero leer la temporada como texto y copiarla, para revisarla de un tirón o pegarla en otra nota.

## Definiciones
- **Nombre limpio** y **mismo nombre:** como en la spec 009. Un alias de la ficha de un personaje en la wiki cuenta como su nombre.
- **Ficha de personaje:** una nota de la carpeta de personajes de la wiki, la misma que usa hoy el autocompletado de «Personajes».
- **Nombre que se enseña** de un personaje: el de su ficha si la tiene; si no, la primera forma escrita en orden de emisión.
- **Personaje de la serie:** el que sale en alguna escena no descartada (también aparcadas y bandeja), el que está en «Lo conocen» de un secreto no descartado o el que tiene ficha.
- **Temporada elegida:** la del selector de la vista «Análisis». Al abrir la vista, la temporada del visor (si el visor está en la serie, la primera); después el selector no sigue al visor.
- **Sesión:** mientras la serie esté abierta.
- **Orden de emisión:** el de la spec 009, para toda la serie (temporadas, episodios y escenas).
- **Escena viva:** escena que no está aparcada ni descartada.
- **Lo que se ve:** la serie como la enseña el visor en ese momento. Con una variante abierta, según «ver ahora / cómo quedaría» (spec 006).
- **Episodio de una pista o revelación:** el que lleva marcado; si no lleva, el de su escena. Si lleva los dos y no coinciden, manda el episodio marcado (como al pasar a la wiki).
- **Pista que cuenta:** la que está marcada solo con el episodio, o en una escena viva con episodio. Las de escenas aparcadas, descartadas o de la bandeja no cuentan. Igual para pistas falsas y revelación.
- **Escena relacionada con la lente:**
  - personaje: la escena lo lleva en «Personajes» (mismo nombre);
  - arco: la escena lleva ese arco;
  - secreto: la escena es una pista, una pista falsa o la revelación de ese secreto.
- **Episodio relacionado con la lente:** tiene alguna escena relacionada; con un secreto, también si tiene una pista, pista falsa o revelación del secreto marcada solo con el episodio.
- **Lo sabe desde:** para cada personaje que conoce un secreto, el episodio desde el que lo sabe. Es opcional; vacío = «sin fecha». Va por nombre del personaje, no por su posición en la lista.

## Requisitos funcionales (EARS)

### A. Lente

- RF-1: EL SISTEMA tendrá en la barra superior el botón «Lente», que abre un buscador de personajes, arcos y secretos.
  - Personajes: los personajes de la serie, una vez cada uno (mismo nombre), con su nombre que se enseña.
  - Secretos: por su título (el que no lleva spoiler). Los descartados no salen.
  - Cada resultado dice si es personaje, arco o secreto.
- RF-2: EL SISTEMA dejará poner la lente con «Enfocar» desde el menú contextual, y con el teclado (tecla de menú o Mayús F10), en:
  - un arco en Tramas y en la rejilla;
  - un secreto en su lista y en el panel;
  - un personaje en el campo «Personajes» de una escena, en «Lo conocen» de un secreto y en su fila de «Presencia».
- RF-3: CUANDO el autor elija un objetivo, EL SISTEMA pondrá la lente sobre él y quitará la que hubiera.
- RF-4: MIENTRAS haya lente, EL SISTEMA atenuará, con color y no con opacidad, lo que no está relacionado con ella en:
  - el visor (escenas, actos y episodios no relacionados; en la serie y la temporada, episodios sin nada relacionado);
  - la rejilla (casillas y paradas no relacionadas; con lente de arco, las filas de los otros arcos);
  - la línea de la historia (escenas no relacionadas);
  - las tres pestañas de «Análisis» (RF-24, RF-35 y RF-43).
  - Para el lector de pantalla, lo atenuado lleva «fuera de la lente».
- RF-5: MIENTRAS haya lente, EL SISTEMA enseñará en la barra superior «Lente: <nombre>» con su tipo y el botón «Quitar lente».
- RF-6: EL SISTEMA no dejará que la lente cambie nada en disco: lo atenuado se puede abrir, editar y mover como siempre.
- RF-7: CUANDO el autor pulse «Quitar lente», EL SISTEMA la quitará.
- RF-8: CUANDO el autor pulse Esc sin nada abierto ni el foco en un campo, EL SISTEMA quitará la lente antes de subir de nivel; con otro Esc sube como hasta ahora (spec 002).
  - Cuentan como abiertos, y Esc los cierra primero: el buscador de la lente, un menú contextual y un arrastre en curso.
- RF-9: MIENTRAS haya lente, EL SISTEMA la mantendrá al cambiar de vista, de nivel del visor o de temporada.
- RF-10: SI el objetivo de la lente deja de existir (arco o secreto borrado o descartado, personaje que ya no es personaje de la serie), ENTONCES EL SISTEMA quitará la lente y dirá por qué.
  - Con una variante abierta, existe si existe ahora o en la variante: cambiar entre «ver ahora» y «cómo quedaría» no quita la lente.
- RF-11: SI nada de lo que se ve está relacionado con la lente, ENTONCES EL SISTEMA lo dirá junto a la lente («Telmo no sale en esta temporada»).
- RF-11b: EL SISTEMA no guardará la lente: al cerrar la serie o la app desaparece.

### B. Vista «Análisis»

- RF-12: EL SISTEMA tendrá en el menú izquierdo, en «Estructura» y debajo de «Línea de la historia», la entrada «Análisis», con tres pestañas: «Presencia», «Quién sabe qué» y «Esquema».
- RF-13: CUANDO el autor abra «Análisis», EL SISTEMA enseñará la pestaña que tenía abierta la última vez en esta sesión; la primera vez, «Presencia».
- RF-14: EL SISTEMA tendrá en «Análisis» un selector de temporada; las tres pestañas usan la temporada elegida.
- RF-15: EL SISTEMA construirá las tres pestañas con lo que se ve, y las pondrá al día cuando cambie la serie, la variante o «ver ahora / cómo quedaría».
- RF-16: SI la serie no tiene temporadas, ENTONCES EL SISTEMA dirá «Aún no hay temporadas» en las tres pestañas.

### C. Presencia

- RF-17: EL SISTEMA enseñará en «Presencia» una tabla con una fila por personaje y una columna por episodio de la temporada elegida, en orden de emisión.
- RF-18: EL SISTEMA pondrá en cada casilla cuántas escenas vivas del episodio llevan a ese personaje; vacía si ninguna.
  - Las escenas de la bandeja no cuentan.
  - Un personaje escrito de dos formas con el mismo nombre es una fila.
- RF-19: EL SISTEMA tendrá una fila por cada personaje con al menos una escena viva en la temporada, ordenadas por total de escenas de más a menos y, a igualdad, por nombre.
- RF-20: EL SISTEMA enseñará al final de cada fila el total de escenas y de episodios del personaje en la temporada.
- RF-21: SI un personaje falta 3 episodios seguidos o más entre su primera y su última aparición de la temporada, ENTONCES EL SISTEMA marcará esas casillas como «Ausencia larga (N episodios)», con texto para el lector de pantalla.
  - Los episodios sin ninguna escena viva no cuentan para N ni cortan la racha.
  - Es un dato, no una regla de las guías: no se puede silenciar ni sale en «Comprobar».
- RF-22: CUANDO el autor pulse una casilla, EL SISTEMA llevará el visor a ese episodio.
- RF-23: CUANDO el autor pulse el nombre de un personaje, EL SISTEMA pondrá la lente sobre él.
- RF-24: MIENTRAS haya lente de personaje, EL SISTEMA atenuará las demás filas; con lente de arco o de secreto, las casillas de episodios no relacionados.
- RF-25: SI ningún personaje sale en la temporada, ENTONCES EL SISTEMA dirá «Ninguna escena de esta temporada tiene personajes».

### D. Quién sabe qué

#### Lo sabe desde
- RF-26: EL SISTEMA tendrá en el campo «Lo conocen» del secreto, junto a cada personaje, «Lo sabe desde», con la opción «Sin fecha» y los episodios de la serie en orden de emisión, agrupados por temporada y con su código.
  - Los episodios sin temporada van al final, en su grupo «Sin temporada».
- RF-27: CUANDO el autor cambie «Lo sabe desde», EL SISTEMA lo guardará en el secreto como cualquier otro campo:
  - un paso de Ctrl Z;
  - sale en «Si lo dejas así…»;
  - en una variante, solo en la variante hasta aplicarla; al comparar choques, cada personaje cuenta aparte;
  - con el secreto canon bloqueado, no se puede cambiar (como el resto del secreto).
- RF-28: CUANDO el autor quite a un personaje de «Lo conocen», EL SISTEMA quitará también su «Lo sabe desde», en el mismo paso de Ctrl Z.
  - Cambiar el nombre de un personaje en la lista cuenta como quitar uno y añadir otro: la fecha no pasa al nombre nuevo.
- RF-29: SI «Lo sabe desde» no es un episodio que exista (episodio borrado, número, lista, texto roto), ENTONCES EL SISTEMA lo tratará como «Sin fecha», lo dirá junto al campo y conservará el dato tal cual hasta que el autor elija otro.
- RF-29b: EL SISTEMA tratará cualquier nombre de personaje como texto, también los que coinciden con palabras reservadas del programa (`__proto__`, `constructor`…).
- RF-30: CUANDO un secreto pase a la wiki, EL SISTEMA escribirá el código del episodio de «Lo sabe desde» en la columna de la tabla de personajes de la ficha cuya cabecera es «Lo sabe desde»; vacía si es «Sin fecha».
  - SI la plantilla no tiene esa columna, ENTONCES EL SISTEMA no escribirá la fecha en ninguna otra.
  - Todo lo que va en una celda se escapa (`|`, saltos de línea), como el resto de tablas.

#### La tabla
- RF-31: EL SISTEMA enseñará en «Quién sabe qué» una tabla con una fila por secreto no descartado y una columna por episodio de la temporada elegida.
  - Orden de las filas: por el episodio de la revelación, en orden de emisión, y a igualdad por título; los que no se revelan, al final, por título.
- RF-32: EL SISTEMA pondrá en cada casilla lo que sabe el público al acabar ese episodio, con las pistas que cuentan de toda la serie hasta ese episodio en orden de emisión:
  - «Revelado» desde el episodio de la revelación (incluido) en adelante;
  - si no, «Pistas: N» con las N pistas acumuladas, más «Falsas: M» con las M pistas falsas acumuladas si hay alguna;
  - si no, «Falsas: M» si solo hay pistas falsas;
  - si no, «No lo sabe».
  - En el episodio donde ocurre, la pista o la revelación se marca como nueva.
- RF-33: EL SISTEMA pondrá en cada casilla los personajes que lo saben en ese episodio: los que tienen «Lo sabe desde» en ese episodio o antes, marcando los que se enteran en él.
- RF-34: EL SISTEMA enseñará en cada fila, aparte de las casillas, «Lo conocen sin fecha: …» con los personajes sin fecha.
- RF-35: MIENTRAS haya lente de personaje, EL SISTEMA atenuará los secretos que ese personaje no conoce; con lente de secreto, los demás secretos; con lente de arco, las casillas de episodios no relacionados.
- RF-36: CUANDO el autor pulse una casilla, EL SISTEMA llevará el visor a ese episodio; CUANDO pulse el título de un secreto, EL SISTEMA lo abrirá en el panel.
- RF-37: SI la serie no tiene secretos, ENTONCES EL SISTEMA dirá «Aún no hay secretos».

### E. Esquema

- RF-38: EL SISTEMA enseñará en «Esquema» la temporada elegida como texto, en orden de emisión:
  - cada episodio con su código y título;
  - dentro, cada acto con su nombre, y «Sin acto» al final si hay escenas sin acto;
  - dentro, cada escena con su número, título, valor y cambio de carga, escrito como en la tarjeta del visor; lo vacío no se escribe.
  - Nunca lleva «La verdad» de un secreto.
- RF-39: EL SISTEMA dejará fuera del esquema las escenas descartadas y marcará las aparcadas con «(aparcada)».
- RF-40: EL SISTEMA pondrá al final de la temporada «Bandeja» con sus escenas, si tiene.
- RF-41: CUANDO el autor pulse «Copiar», EL SISTEMA copiará el esquema al portapapeles como Markdown (títulos para episodios y actos, lista para escenas) y lo dirá.
  - Se copia lo que se ve (con variante, según «ver ahora / cómo quedaría»), sin marcas de lente ni de variante.
  - Cada texto va en una línea y con escapada toda la sintaxis que Obsidian interpreta: `#`, `*`, `_`, `[`, `]`, `!`, `|`, `` ` ``, `$`, `%`, `=`, `~`, `<`, `>` y `-`, `+` o número con punto al principio.
- RF-41b: SI el sistema no deja copiar al portapapeles, ENTONCES EL SISTEMA enseñará el texto seleccionado en una caja para copiarlo con Ctrl C / Cmd C, y lo dirá. Sin dependencias ni permisos nuevos.
- RF-42: CUANDO el autor pulse una escena del esquema, EL SISTEMA la abrirá en el panel, en «Editar».
- RF-43: MIENTRAS haya lente, EL SISTEMA atenuará en el esquema las escenas no relacionadas.
- RF-44: SI la temporada no tiene episodios ni escenas, ENTONCES EL SISTEMA dirá «Esta temporada está vacía».

## Requisitos no funcionales
- Rendimiento: con 300 escenas, 50 personajes y 30 secretos, abrir cualquier pestaña o cambiar de temporada tarda menos de 200 ms, y poner o quitar la lente se ve en menos de 100 ms.
- Integridad: lo único que se escribe es «Lo sabe desde» (y su columna al pasar a la wiki), con la escritura segura de siempre y conservando lo que la app no entiende. Lente y vista no escriben nada.
- Compatibilidad con la v1.0:
  - la v1.0 abre la serie y ve «Lo conocen» igual que antes;
  - editar el secreto en la v1.0 no hace perder «Lo sabe desde» (si no se puede garantizar, se para y se pregunta);
  - un «Lo sabe desde» de un personaje que la v1.0 quitó de la lista se ignora (si vuelve a la lista, vuelve con su fecha);
  - por eso «Lo sabe desde» va aparte de la lista de quién lo conoce, que no cambia de forma.
- Accesibilidad: todo con teclado; tablas con cabeceras de fila y columna para el lector de pantalla; lente, ausencias y marcas de «nuevo» con texto, nunca solo color.
- Plataformas e idioma: Windows y Mac Intel, en español, estética de la v1. Sin desplazamiento a lo ancho de la página desde 900 px (spec 008): las tablas anchas se desplazan dentro de su caja.

## Datos personales
Ninguno nuevo. Personajes y secretos son ficción.

## Casos límite
- «Telmo», «[[Telmo]]» y «telmo» en escenas distintas: una fila en Presencia y un objetivo en la lente.
- Personaje con ficha y sin escenas, o solo en «Lo conocen»: sale en el buscador de la lente; no tiene fila en Presencia; con la lente puesta, RF-11.
- Episodios vacíos en mitad de la temporada: columna vacía; no cuentan para la ausencia larga (RF-21).
- Pista en una escena aparcada o en la bandeja: no cuenta para el público hasta que la escena vuelva a un episodio y deje de estar aparcada.
- Solo pistas falsas: «Falsas: M».
- Temporada con un solo episodio: Presencia sin ausencias.
- Personaje que sale solo en el primer y el último episodio de 6: ausencia de 4.
- Escena sin episodio con personajes: no cuenta en Presencia; sale en el esquema en «Bandeja».
- Secreto revelado en una temporada anterior: «Revelado» en todas las casillas.
- Revelación sin episodio: nunca «Revelado».
- Pista en un episodio posterior a la revelación: no cambia «Revelado».
- «Lo sabe desde» posterior a la revelación: se enseña tal cual (avisar de eso es cosa de las comprobaciones).
- Personaje repetido en «Lo conocen»: una vez en la tabla, con la fecha más temprana.
- Secreto aparcado: sale en la tabla, marcado «(aparcado)».
- Variante que mueve una escena de episodio: las pestañas lo enseñan según «ver ahora / cómo quedaría».
- Lente de arco y el arco se descarta: RF-10.
- Título de escena con `#`, `![[`, `|`, `<b>`, `%%` o un salto de línea: se copia escapado y en una línea (RF-41).
- Personaje con `|` o `]]` en el nombre al pasar a la wiki: celda escapada (RF-30).
- Personaje llamado `__proto__` o `constructor`: funciona como cualquier otro (RF-29b).
- Personaje con fecha y la v1.0 lo quita y lo vuelve a poner: recupera su fecha.
- Episodio con 40 escenas: el esquema crece hacia abajo sin límite.

## Fuera de alcance
- Causa y efecto y plantillas de estructura (spec 011); pizarra libre y llevar a la sala (spec 012).
- Varias lentes a la vez, lente por lugar, guardar la lente.
- Presencia por escena o por serie entera; presencia de lugares.
- Editar el esquema en el texto o reordenar desde él; exportar a archivo.
- Avisos nuevos en «Comprobar» (ausencias, saber antes de la revelación…).
- Poner al día la tabla de personajes de una ficha que ya está en la wiki con «Lo sabe desde» (como en la 009, la app no pone al día lo que generó).
- Marcas de «antes» (spec 005) en las pestañas de Análisis.
- Cómo se enteró y qué hace con ello (las otras columnas de la tabla de la ficha).

## Criterios de finalización
- Tests en verde de lo que escribe en disco o en la wiki, y de lo que lee la v1.0:
  - «Lo sabe desde»: guardar, quitar con el personaje, Ctrl Z, variante, canon bloqueado;
  - la columna «Lo sabe desde» al pasar a la wiki;
  - el lector congelado de la v1.0 con «Lo sabe desde» guardado, y que sobrevive a una edición del secreto hecha con ese lector (también reordenando y quitando personajes);
  - valores raros de «Lo sabe desde» y nombres `__proto__` / `constructor`;
  - el escape del Markdown copiado y de las celdas.
- Tests del cálculo de Presencia, del estado del público y de quién lo sabe, porque deciden lo que el autor ve (con los casos límite de arriba).
- La interfaz (lente, pestañas, esquema, copiar) se comprueba en el navegador (decisión del autor en la 003).
- Nada nuevo en `appDatos/` salvo «Lo sabe desde» en el secreto.
- RF uno a uno en `validacion.md`, con revisión independiente y de seguridad.
- `npm run verificar` en verde.
- PRD, inventario (la lente también enfoca secretos), `docs/diseno.md` al día.

## Decidido sin preguntar (se puede vetar)
1. «Análisis» va en el menú izquierdo, debajo de «Línea de la historia», porque ahí están las vistas; solo «Lente» va en la barra superior (RF-1, RF-12).
2. La vista tiene su selector de temporada, que arranca en la del visor (RF-14).
3. Ausencia larga = 3 episodios seguidos o más, entre la primera y la última aparición (RF-21).
4. Presencia cuenta solo escenas vivas; las aparcadas no (RF-18).
5. Esc quita la lente antes de subir de nivel (RF-8).
6. Quién sabe qué: el público con pistas acumuladas por toda la serie; el personaje repetido cuenta con la fecha más temprana (RF-32, casos límite).
7. Esquema: descartadas fuera, aparcadas marcadas, bandeja al final (RF-39, RF-40).
8. Tras el QA: para el público solo cuentan pistas de escenas vivas con episodio, o marcadas con el episodio (definiciones); el episodio marcado manda sobre el de la escena.
9. Tras el QA: el selector de temporada no sigue al visor después de abrir la vista (definiciones).
10. Tras el QA: cambiar el nombre en «Lo conocen» pierde la fecha; Ctrl Z la devuelve (RF-28).
11. Tras el QA: la fecha va por nombre y aparte de la lista, para que la v1.0 no la rompa; valores raros = «Sin fecha» conservado (RF-29, compatibilidad).
12. Tras el QA: copiar sin dependencias nuevas; si el portapapeles falla, caja con el texto para Ctrl C (RF-41b).
13. Tras el QA: en la wiki, la fecha va solo en la columna con cabecera «Lo sabe desde» (RF-30).

## Dudas abiertas
Ninguna.
