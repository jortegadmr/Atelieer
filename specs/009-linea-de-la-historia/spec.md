# Spec 009 — Línea de la historia, fichas y lo pendiente (entrega 5)

> Solo el QUÉ y el POR QUÉ. Nada de tecnología, archivos ni esquemas: eso va en plan.md.
> Estado: aprobada por el autor el 2026-10-22 («adelante con lo propuesto»). Revisada por dos QA independientes (30 y 24 puntos, recogidos aquí).

## Contexto y objetivo
La entrega 5 del PRD era «Wiki y vistas». Tres de sus cuatro vistas ya existen con otro nombre:
- el **tablero de tarjetas** es el visor (episodios y actos en columnas, con sus escenas);
- la **línea de emisión** es el visor de la serie (temporadas en orden de emisión);
- el **mapa de arcos** es la rejilla del paso 4 (arcos × episodios, con paradas de metro).

Decisiones del autor (2026-10-22):
1. La entrega 5 es lo que falta: la **línea de la historia** (A), que también era la «vista cronológica» de la entrega 6.
2. Entra también en esta spec lo que las specs 001, 005 y 006 dejaron para la entrega 5:
   - las marcas de «antes» y de variante en Tramas, la rejilla y la línea (B);
   - los tramos de arcos y secretos en el visor con una variante (C);
   - editar el texto de las fichas desde la app, con una pestaña «Ficha» (D);
   - «Alternativas descartadas» en la ficha del arco (E);
   - la equivalencia de estados antiguos de la wiki (F).
3. «Presente» va donde lo marque la Timeline.

**Por qué.** Hoy la app solo enseña la serie en orden de emisión. Si una escena es un flashback o una leyenda de otra época, el autor no ve dónde cae en la historia del mundo (regla 13 de la wiki y G45 de la guía). Además, una vez creada la ficha de una pieza, solo se puede editar en Obsidian, y lo descartado no llega a la wiki.

## Usuarios
El autor, en su PC con Windows y en su Mac Intel.

## Historias de usuario
- H1: Como autor quiero ver todas las escenas de la serie en el orden del mundo, para saber qué pasó antes y qué después aunque se emita al revés.
- H2: Como autor quiero cambiar de época una escena moviéndola en la línea, para ordenar los flashbacks sin abrir escena por escena.
- H3: Como autor quiero ver en Tramas, en la rejilla y en la línea qué ha cambiado y cómo quedaría una variante, como ya lo veo en el visor.
- H4: Como autor quiero editar el texto de la ficha de una pieza sin salir de la app, sin pisar lo que haya escrito en Obsidian.
- H5: Como autor quiero que lo que descarto quede en «Alternativas descartadas» de su arco, para no perder por qué lo descarté.
- H6: Como autor quiero que la app me proponga a qué equivale un estado antiguo de una ficha, y decidir yo.

## Definiciones
- **Época:** cada época de la wiki de la serie. Salen de las filas de la tabla «Eras» de la Timeline y de las fichas de la carpeta de épocas, como hoy en el campo «Cuándo ocurre en el mundo».
- **Nombre limpio:** el texto sin `[[ ]]` de fuera (de `[[X|texto]]` vale `X`), sin negritas ni cursivas, sin espacios en los extremos y con los espacios de dentro juntados en uno.
- **Mismo nombre:** dos nombres limpios iguales sin distinguir mayúsculas ni acentos. Un alias de una ficha de época cuenta como su nombre.
- **Fila «Presente»:** una fila de la tabla «Eras» cuyo nombre es «Presente».
- **Columna de la línea:** cada parte de la línea. Hay una por época, una «Presente» y, si hace falta, una «No está en la wiki». No confundir con el **tramo de un arco**: un arco de temporada que es parte de un arco de serie.
- **Época de una escena:** su campo «Cuándo ocurre en el mundo». Vacío, o «Presente» escrito a mano, es el presente.
- **Temporada de una escena:** la de su episodio; sin episodio, la de su campo; si esa temporada no existe, «Sin temporada».
- **Orden de emisión:** temporada, episodio y número de escena, como en el visor. Las escenas de la bandeja van detrás de las de los episodios de su temporada, y las «Sin temporada» al final.
- **Ficha de una pieza:** la nota de la wiki de una temporada, un episodio, un arco o un secreto que ya pasó a la wiki (borrador o canon).
- **Apartado:** cada parte de una ficha que empieza con un título de nivel 2 (`## …`) al principio de línea, sin contar los que van dentro de un bloque de código o de un comentario `<!-- -->`. «Inicio» es lo que va entre las propiedades y el primer título; las propiedades no son de ningún apartado y no se enseñan.
- **Estado de la ficha:** el valor de `estado_canon`, sin distinguir mayúsculas, acentos ni espacios de los extremos («Canon» es canon).
- **Marcas:** las de la spec 005 («antes», en gris discontinuo) y las de la spec 006 (variante, en discontinuo de acento: «ahora», «quedaría», «Nueva en la variante», «Sale en la variante»).

## Requisitos funcionales (EARS)

### A. Línea de la historia

#### Abrir y releer
- RF-1: EL SISTEMA tendrá en el menú izquierdo, en «Estructura» y debajo de las temporadas, la entrada «Línea de la historia».
- RF-2: CUANDO el autor pulse «Línea de la historia», EL SISTEMA la abrirá en el contenido.
  - El visor de arriba, el panel y la barra superior siguen como en Tramas.
  - Pulsar una columna del visor lleva a su vista, como desde Tramas.
- RF-3: CUANDO se abra la línea, EL SISTEMA volverá a leer las épocas de la wiki.
- RF-3b: EL SISTEMA tendrá en la línea el botón «Volver a leer la wiki».

#### Qué enseña
- RF-4: EL SISTEMA enseñará las columnas en este orden:
  1. las épocas de la Timeline, en el orden de sus filas, con «Presente» en el sitio de la fila «Presente» si la hay;
  2. las épocas con ficha que no tienen fila en la Timeline, por nombre;
  3. «No está en la wiki», si hay escenas para él (RF-7);
  4. «Presente», si no tiene fila en la Timeline.
- RF-5: EL SISTEMA enseñará una sola columna por época. Si dos filas o fichas tienen el mismo nombre, se juntan en el sitio de la primera según el orden de RF-4. Una fila «Presente» no crea una época «Presente» aparte.
- RF-6: EL SISTEMA pondrá cada escena en la columna cuya época tenga el mismo nombre que la suya, y dentro de la columna las ordenará por emisión. Solo cuentan las épocas, no los personajes ni los lugares.
- RF-7: SI la época de una escena no tiene el mismo nombre que ninguna época de la wiki, ENTONCES EL SISTEMA la pondrá en la columna «No está en la wiki», con el texto que tiene, sin cambiarlo.
- RF-8: EL SISTEMA enseñará cada escena como una tarjeta con:
  - su título;
  - dónde se emite: el código del episodio y su número («T01E03 · 2»), «Bandeja T01» o «Sin temporada»;
  - cómo se cuenta (en escena, flashback o leyenda), como lo enseña el panel;
  - la marca de su estado, con lo aparcado atenuado y lo descartado tachado, siempre con texto además del color.
- RF-9: EL SISTEMA enseñará cada columna con su nombre y el número de escenas que se ven en él, también cero.
- RF-10: EL SISTEMA pondrá las columnas una al lado de otra. Si no caben, la línea se desplaza a lo ancho dentro de su caja; la página no. Cada columna crece hacia abajo.
- RF-11: SI la wiki no tiene ninguna época, ENTONCES EL SISTEMA enseñará las columnas que hagan falta y la frase «Las épocas salen de la Timeline de la wiki.». Si la serie tiene Timeline y la nota existe, añade el botón «Abrir la Timeline» (solo `obsidian://`, dentro de la vault).
- RF-12: SI no hay escenas que enseñar, ENTONCES EL SISTEMA enseñará las columnas vacías y la frase «Aún no hay escenas.» (con toda la serie) o «Esta temporada aún no tiene escenas.» (con una temporada).

#### Filtro de temporada
- RF-13: EL SISTEMA tendrá un selector con «Toda la serie» y una opción por temporada. Al abrir la serie, sale «Toda la serie».
- RF-14: CUANDO el autor elija una temporada, EL SISTEMA enseñará solo las escenas de esa temporada, con su bandeja. Las «Sin temporada» solo salen con «Toda la serie».
- RF-15: EL SISTEMA recordará la temporada elegida mientras la serie siga abierta, sin guardarla en disco. Si deja de existir, volverá a «Toda la serie».

#### Abrir una escena
- RF-16: CUANDO el autor pulse una tarjeta (o pulse Intro con el foco en ella), EL SISTEMA abrirá la escena en el panel, sin cambiar de vista.
- RF-17: CUANDO una escena o la wiki cambien desde otro sitio (panel, visor, Obsidian, deshacer, releer), EL SISTEMA pondrá la línea al día sin volver a abrirla. Las épocas cambiadas en Obsidian llegan al abrir la línea o con «Volver a leer la wiki» (RF-3, RF-3b).

#### Cambiar de época
- RF-18: CUANDO el autor arrastre una tarjeta a otra columna y la suelte, EL SISTEMA cambiará la época de la escena:
  - a una época, escribe el enlace a esa época con su nombre de la wiki (`[[Nombre]]`), como el campo;
  - a «Presente», deja el campo vacío.
- RF-19: CUANDO el autor pulse Alt + flecha a la derecha o a la izquierda con el foco en una tarjeta, EL SISTEMA pasará la escena a la columna siguiente o a la anterior, saltándose «No está en la wiki». El foco seguirá en ella.
- RF-20: SI no hay columna en esa dirección, ENTONCES EL SISTEMA no cambiará nada y lo anunciará («Ya está en la primera época», «Ya está en la última época»).
- RF-21: EL SISTEMA solo cambiará la época al mover: ni el episodio, ni el número, ni el acto, ni cómo se cuenta, ni la pieza elegida en el panel.
- RF-22: EL SISTEMA no dejará soltar en «No está en la wiki».
- RF-23: SI la escena se suelta en su misma columna, fuera de las columnas, o se pulsa Esc durante el arrastre, ENTONCES EL SISTEMA no cambiará nada ni creará un paso de deshacer.
- RF-24: EL SISTEMA solo aceptará en la línea tarjetas que salieron de la línea de esta serie. Tampoco aceptará textos ni archivos de fuera, y sus tarjetas no se podrán soltar en el visor ni en la rejilla.
- RF-25: SI la escena es canon bloqueada, ENTONCES EL SISTEMA no la dejará mover y dirá «La escena es canon: desbloquéala para moverla», como el visor. Dentro de una variante sí se puede, como en el resto de la app (spec 006, RF-11).
- RF-26: SI el nombre de la época de destino no se puede escribir como enlace (lleva `[`, `]`, `|`, `#`, `^` o caracteres de control), ENTONCES EL SISTEMA no dejará soltar en ella y lo dirá en la columna.
- RF-27: CUANDO cambie la época de una escena, EL SISTEMA hará un paso de Ctrl Z por cada movimiento, aunque sean seguidos.
- RF-27b: EL SISTEMA contará cada movimiento en «Si lo dejas así…» como un cambio del autor.
- RF-28: MIENTRAS haya una variante abierta, EL SISTEMA enseñará y cambiará en la línea lo mismo que en el resto de la app (spec 006): con «Cómo quedaría» enseña y guarda en la variante, y con «Ahora» enseña la serie y no deja mover.
- RF-29: CUANDO se mueva una escena, o no se pueda mover, EL SISTEMA lo dirá en la línea con un aviso visible que también lee el lector de pantalla («Pasa a «La Inundación»», o el porqué).

### B. Marcas en Tramas, la rejilla y la línea
- RF-30: MIENTRAS la pestaña «Si lo dejas así…» esté abierta y haya cambios, EL SISTEMA enseñará en gris discontinuo, con la palabra «antes»:
  - **Tramas:** en la lista de arcos, «Nueva» en un arco nuevo y «Ya no está: «título»» al final de la lista; en las tarjetas del arco que se ve, cómo estaba cada dato que cambió, con los mismos datos y textos recortados que «Lo cambiado» de la spec 005 (RF-12). La marca va debajo del campo, fuera de lo que se edita;
  - **rejilla:** en cada celda, el papel de la parada que cambió («antes: abre»); donde estaba una escena que cambió de episodio o de arco, «Estaba aquí: «título»»; una escena nueva lleva «Nueva»;
  - **línea:** en la columna de donde salió una escena, «Estaba aquí: «título»»; una escena nueva lleva «Nueva».
- RF-31: MIENTRAS haya una variante abierta, EL SISTEMA marcará en esas tres vistas las mismas diferencias en discontinuo de acento, con los textos de la spec 006:
  - con «Cómo quedaría», «ahora…», «Nueva en la variante», «Ahora aquí» y «Sale en la variante»;
  - con «Ahora», «quedaría…», al revés.
- RF-32: MIENTRAS «Si lo dejas así…» esté abierta dentro de una variante, EL SISTEMA enseñará el gris y no el acento, como en el visor (spec 006, RF-18).
- RF-33: EL SISTEMA pondrá las marcas sin mover el sitio ni el orden de lo que hay, y siempre con texto que lea el lector de pantalla.
- RF-33b: MIENTRAS «Si lo dejas así…» esté abierta, ver otro arco en Tramas o pulsar una escena en la rejilla o en la línea no cambia la pieza que se compara, como bajar en el visor (spec 005, RF-25). Fuera de esa pestaña, sí la elige, como hoy.

### C. Arcos y secretos en el visor con una variante
- RF-34: MIENTRAS haya una variante abierta y la pieza elegida sea un arco o un secreto con diferencias, EL SISTEMA marcará en el visor «solo ahora» o «solo en la variante» en las temporadas y los episodios por los que pasa solo en uno de los dos lados. Hoy el visor ya resalta por dónde pasan todas las piezas con diferencias; esto añade de qué lado es. Con «Si lo dejas así…» abierta, manda RF-32.

### D. Pestaña «Ficha»
- RF-35: DONDE la pieza elegida tenga ficha y esa nota exista, EL SISTEMA añadirá al panel la pestaña «Ficha», después de Guía.
- RF-36: EL SISTEMA enseñará en la pestaña:
  - el nombre de la ficha y su estado en la wiki;
  - el botón «Abrir en Obsidian»;
  - cada apartado con su título y su texto en un campo de texto, tal como está escrito (sin interpretar el formato).
- RF-37: CUANDO el autor cambie el texto de un apartado, EL SISTEMA lo guardará en la ficha al salir del campo y a los 2 s sin escribir. Solo cambia ese apartado; el resto de la nota (propiedades, otros apartados, espacios y saltos de línea) queda igual, byte a byte. Lo escrito usa el fin de línea de la nota y conserva el salto final que tenía el apartado.
- RF-37b: SI el texto lleva una línea que empieza por `## `, o «Inicio» empieza por `---` en una nota sin propiedades, ENTONCES EL SISTEMA no lo guardará y dirá «Los apartados se crean en Obsidian.» (o «Eso rompería las propiedades.»), dejando el texto en el campo.
- RF-37c: CUANDO haya texto sin guardar y el autor cambie de pieza, de vista o de serie, abra o cierre una variante, pase a «Ver ahora», o la pieza pase a canon, EL SISTEMA lo guardará antes (si aún se puede escribir) y, si no puede, lo dirá. Si la nueva pieza no tiene ficha, el panel vuelve a Editar.
- RF-38: SI la ficha cambió fuera de Atelier desde que la pestaña la leyó, ENTONCES EL SISTEMA no escribirá. Lo que escribe la propia app en la ficha (estado, alternativas, equivalencias) no cuenta: antes guarda lo pendiente de la pestaña y después la vuelve a leer. Dirá «La ficha cambió en Obsidian. No se ha guardado.», dejará en el campo lo que escribió el autor y ofrecerá «Ver la de Obsidian», que vuelve a leerla.
- RF-39: CUANDO se guarde por primera vez una ficha desde que se abrió la serie, EL SISTEMA guardará antes una copia de cómo estaba, en una carpeta propia de la serie que la v1.0 no lee, con un nombre con fecha que no sea una nota de Obsidian (no se puede enlazar ni confundir con la ficha). Las copias no se borran.
- RF-39b: CUANDO se guarde por primera vez un apartado desde que se abrió la serie, EL SISTEMA apuntará en el Log de la wiki «Editada desde Atelier», con la ficha y el apartado.
- RF-39c: CUANDO la app escriba en una ficha (D, E o F), EL SISTEMA pondrá al día en la pieza la fecha de la ficha, como al cambiar el estado (spec 001), para que no salga «Cambió en la wiki» por lo que escribió ella. Si la ficha ya estaba marcada así, se queda marcada. Eso no es un paso de Ctrl Z.
- RF-40: EL SISTEMA no meterá lo escrito en la ficha en el Ctrl Z de la app. Mientras se escribe, el campo tiene su propio deshacer.
- RF-41: SI la pieza es canon bloqueada, ENTONCES EL SISTEMA enseñará la ficha sin dejar editarla, con «Canon: desbloquéala para editar su ficha».
- RF-42: MIENTRAS haya una variante abierta, EL SISTEMA enseñará la ficha de la serie sin dejar editarla, con «La wiki solo cambia al aplicar la variante.».
- RF-43: SI la ficha no se encuentra o su enlace sale de la carpeta de narrativa de la serie, ENTONCES EL SISTEMA no enseñará la pestaña y dejará el aviso de hoy en Editar (spec 001, RF-33). Vale también para leer, para «Abrir en Obsidian» y para la revisión de fichas: un enlace como `[[../../x]]` no se lee ni se abre.
- RF-44: EL SISTEMA no dejará crear ni borrar apartados, ni cambiar su título, desde la pestaña: eso se hace en Obsidian.

### E. «Alternativas descartadas» del arco
- RF-45: CUANDO el autor descarte en la app una escena o un tramo de un arco, EL SISTEMA añadirá en la tabla «Alternativas descartadas» de la ficha del arco una fila con su título (o «Sin título») y el porqué (o vacío).
  - Una escena que toca varios arcos va a la ficha de cada uno; si toca un tramo, a la del arco de serie del que es tramo.
  - Un tramo va a la ficha de su arco de serie.
  - Solo arcos cuya ficha existe (RF-43).
  - Lo ponen en marcha: cambiar el estado en la app, aplicar una variante (RF-51) y deshacer, rehacer o «Volver a como estaba» (RF-49). No lo ponen en marcha los cambios hechos en Obsidian o en la v1.0, restaurar una instantánea ni cambiar después el título, el porqué o los arcos de algo ya descartado.
- RF-45b: SI el arco es canon bloqueado, ENTONCES EL SISTEMA no tocará su ficha y lo dirá («El arco «X» es canon: desbloquéalo para apuntar la alternativa»); el descarte de la pieza sí se hace.
- RF-46: EL SISTEMA buscará la tabla debajo del título «Alternativas descartadas», de cualquier nivel (la plantilla usa `###` dentro de «Profundizar»), o la primera tabla cuya primera columna sea «Idea». La fila vacía de la plantilla se sustituye por la primera fila. SI no hay tabla, la crea debajo de ese título; SI tampoco hay título, añade `## Alternativas descartadas` con la tabla de la plantilla antes de «Fuentes», o al final.
- RF-47: SI ya hay una fila igual (mismo título y mismo porqué), ENTONCES EL SISTEMA no añadirá otra.
- RF-48: CUANDO se recupere lo descartado, EL SISTEMA quitará la fila con su título y su porqué de ahora, solo si está tal cual y ninguna otra pieza descartada de ese arco da la misma fila. Si no la encuentra así (se editó, o cambió el título o el porqué), la deja y lo dice.
- RF-49: CUANDO se deshaga, se rehaga o se «vuelva a como estaba» un descarte o una recuperación, EL SISTEMA pondrá o quitará la fila con las reglas de RF-46 a RF-48, como hace hoy la ficha con el estado (spec 001), y avisará de que el Log no se deshace.
- RF-50: EL SISTEMA apuntará cada fila añadida o quitada en el Log de la wiki.
- RF-51: MIENTRAS haya una variante abierta, EL SISTEMA no tocará la ficha. Al aplicar, después de las notas y del estado de las fichas (spec 006, RF-37b), pone las filas de lo que la variante descarta y quita las de lo que recupera. Si una fila no se puede escribir, la variante queda aplicada igual y se dice cuál.
- RF-52: SI la ficha cambió fuera durante la operación, ENTONCES EL SISTEMA no la escribirá y avisará; el descarte de la pieza sí se hace.

### F. Estados antiguos de la wiki
- RF-53: SI el estado de la ficha de una pieza no es idea, borrador, canon ni descartado (normalizado como en Definiciones), ENTONCES EL SISTEMA lo dirá en Editar y en la pestaña Ficha: «La ficha dice «X», que no es un estado de la regla 9.». Un valor que no es texto (lista, número) también avisa, sin propuesta. «Canon», «Borrador»… son sus estados y no avisan; «Canon» pone la pieza en canon como «canon» (spec 001).
- RF-54: EL SISTEMA propondrá la equivalencia de esta tabla, sin distinguir mayúsculas, acentos ni espacios:

  | Valor en la ficha | Se propone |
  |---|---|
  | aprobado, final, definitivo, cerrado | canon |
  | en desarrollo, en curso, en revisión, revisión, pendiente, wip | borrador |
  | boceto, semilla, propuesta, esbozo, aparcado, aparcada | idea |
  | descartada, eliminado, archivado, obsoleto | descartado |

  Con otros valores no propone ninguno.
- RF-55: CUANDO el autor confirme una equivalencia (la propuesta u otra que elija), EL SISTEMA:
  - cambiará la ficha a ese valor, solo en `estado_canon`, y lo apuntará en el Log;
  - dejará la pieza en el estado que corresponde, con las reglas de la spec 001 (canon, descartado con su porqué). Con «idea», una pieza en propuesta o aparcado se queda como está;
  - si cambia el estado de la pieza, es un paso de Ctrl Z propio, como cambiar el estado: al deshacer, la ficha vuelve al estado de la pieza (spec 001), no al valor antiguo. Si la pieza ya estaba en ese estado, solo cambia la ficha y no hay paso de Ctrl Z, como al guardar la ficha (RF-40).
- RF-55b: SI la pieza es canon bloqueada, ENTONCES EL SISTEMA no dejará confirmar una equivalencia que la saque de canon hasta desbloquearla. MIENTRAS haya una variante abierta, el aviso se ve pero no se confirma («Sal de la variante para cambiar la wiki.»).
- RF-55c: CUANDO el autor cambie en la app el estado de una pieza cuya ficha tiene un estado antiguo, EL SISTEMA lo tratará como confirmar ese estado: el Log dice qué valor había antes. El aviso de RF-53 está junto al estado, así que el autor lo ve antes.
- RF-56: CUANDO el autor pulse «Dejarlo así», EL SISTEMA no tocará la ficha y lo apuntará en la pieza como un «Lo sé» de ese valor (constitución 3: queda constancia de que es a propósito). No vuelve a avisar mientras la ficha diga ese mismo valor; con otro, sí. Se quita desde Editar («Dejado así: «X»» con «Quitar»); no sale en Comprobar, que solo lista reglas. Un valor que no es texto se apunta con su texto (una lista, separada por comas).
- RF-57: EL SISTEMA nunca cambiará un estado antiguo sin que el autor lo confirme.

## Requisitos no funcionales
- Rendimiento: con 300 escenas y 30 épocas, abrir la línea o cambiar el filtro tarda menos de 200 ms, y un movimiento se ve en menos de 100 ms. Las marcas de B no hacen pasar de 200 ms el cambio de pestaña.
- Integridad:
  - mover solo cambia el campo de la época en la nota de la escena, con la escritura segura de siempre;
  - en la wiki solo se toca lo que dicen D, E y F, siempre dentro de la carpeta de narrativa y el Log de la serie, con escritura segura, sin dejar notas a medias y conservando lo que la app no entiende;
  - nada se borra.
- Compatibilidad con la v1.0:
  - nada nuevo en las notas de la mesa;
  - la v1.0 abre la serie igual después de mover épocas, editar fichas, descartar y confirmar equivalencias;
  - las copias de RF-39 no le salen a la v1.0 como piezas ni en su papelera.
- Accesibilidad: todo se hace con teclado; cada marca y cada aviso tiene texto para el lector de pantalla; nada se distingue solo por color.
- Plataformas e idioma: Windows y Mac Intel, en español, con la estética de la v1. La página no se desplaza a lo ancho desde 900 px (spec 008).

## Datos personales
Ninguno nuevo. Usa las notas de la serie y la wiki, que ya lee.

## Casos límite
- Una fila de la Timeline con `[[La Inundación]]`, negritas o `\|`: se usa su nombre limpio.
- Una época con ficha cuyo alias coincide con una fila de la Timeline: se juntan (RF-5).
- Dos fichas de época con el mismo nombre en subcarpetas: una columna (RF-5).
- Una nota cualquiera de la carpeta de épocas (índice, plantilla) cuenta como época, como en el campo hoy.
- Una época que se borra en Obsidian: al releer, sus escenas pasan a «No está en la wiki».
- Una época de la wiki llamada «Presente» sin fila: es el presente, no una columna aparte.
- Mover desde «No está en la wiki» pisa el texto que había; Ctrl Z lo devuelve exacto.
- Una escena flashback en el presente, o «en escena» en otra época: se enseña tal cual. Avisar de eso es cosa de las comprobaciones.
- Una escena aparcada o descartada se ve atenuada o tachada en su columna y se puede mover.
- Un episodio canon bloqueado no impide cambiar la época de sus escenas no canon.
- La escena se borra, o la wiki se relee, mientras se arrastra: al soltar no cambia nada y se dice.
- Ficha muy larga: los apartados crecen hacia abajo, sin límite.
- Un `## ` dentro de un bloque de código o de un comentario no parte el apartado.
- La ficha usa CRLF o lleva BOM: se conservan.
- Cerrar la ventana con texto escrito hace menos de 2 s y el foco aún en el campo: se intenta guardar; si la app se cierra antes, ese texto se pierde (la ficha queda como estaba).
- Dos escenas descartadas con el mismo título y porqué en el mismo arco: una fila; se quita al recuperar la última.
- Dos apartados con el mismo título en una ficha: se enseñan los dos, cada uno con su texto, y solo se guarda el tocado.
- Ficha sin apartados: solo «Inicio».
- Se escribe en la pestaña Ficha y se cambia de pieza antes de los 2 s: se guarda antes de cambiar (RF-37c).
- Fila de «Alternativas descartadas» con `|` en el título o el porqué: se escribe escapado.
- `estado_canon` vacío o sin la propiedad: no es un estado antiguo, no se avisa.

## Fuera de alcance
- Orden dentro de una época (fecha interna, «Día de historia» de la Timeline): dentro de una columna va el orden de emisión.
- Crear, editar o reordenar épocas, o escribir en la Timeline.
- Crear escenas desde la línea.
- Avisos nuevos sobre épocas y modos mezclados (comprobaciones).
- Filtros por arco o personaje (es la «lente» de la entrega 6).
- Editar fichas de personajes, lugares y épocas desde la app: siguen en Obsidian.
- Crear, borrar o renombrar apartados de una ficha.
- Poner al día lo que la app generó en la ficha (escaleta, tablas) con lo de la pieza.
- Estados antiguos en notas que no son fichas de piezas.
- Las otras tres vistas del PRD: quedan cubiertas por el visor y la rejilla.

## Criterios de finalización
- Tests en verde de lo que escribe en disco o en la wiki, y de lo que lee la v1.0:
  - la época al mover, con Ctrl Z exacto (también desde «No está en la wiki» y a «Presente»), el canon bloqueado y la variante;
  - la pestaña Ficha: solo el apartado tocado, byte a byte, sin pisar lo cambiado fuera, con la copia y el Log;
  - las filas de «Alternativas descartadas», su retirada y la variante;
  - la equivalencia de estados;
  - el lector congelado de la v1.0 tras todo lo anterior.
- La interfaz (línea, marcas, pestaña) se comprueba en el navegador (decisión del autor en la 003).
- Nada nuevo en `appDatos/` salvo las copias de RF-39; el filtro de la línea no se guarda.
- RF uno a uno en `validacion.md`, con revisión independiente y de seguridad.
- `npm run verificar` en verde.
- PRD, inventario, `docs/diseno.md` al día: la entrega 5 es esta spec y la «vista cronológica» sale de la entrega 6.

## Decidido sin preguntar (se puede vetar)
1. Las épocas con ficha sin fila en la Timeline van detrás de las de la Timeline, por nombre (RF-4).
2. Las escenas con época que no está en la wiki tienen su columna y no se puede soltar en ella (RF-7, RF-22).
3. Dentro de una columna, orden de emisión (RF-6).
4. Alt + flechas izquierda y derecha para mover (RF-19).
5. Releer la wiki al abrir la línea y con un botón (RF-3).
6. En una variante, el canon bloqueado se mueve, como en el resto de la variante (RF-25).
7. Pestaña Ficha: se guarda al salir y a los 2 s; la copia y el Log, una vez por ficha cada vez que se abre la serie; fuera del Ctrl Z de la app (RF-37 a RF-40).
8. «Alternativas descartadas»: escenas y tramos de arco; al recuperar se quita la fila si nadie la tocó (RF-45 a RF-48). Tras el QA 2: la ficha sigue al descarte también al deshacer, como el estado (RF-49); al aplicar una variante, una fila que falla no deshace la variante (RF-51); la ficha de un arco canon bloqueado no se toca (RF-45b).
9. La tabla de equivalencias de RF-54. Tras el QA 2: «Dejarlo así» es un «Lo sé» guardado en la pieza (constitución 3), que vale mientras la ficha diga ese valor (RF-56); cambiar el estado en la app cuenta como confirmar (RF-55c); «Canon» con mayúscula es canon (RF-53).
10. Los tramos de arcos y secretos con variante: «solo ahora» y «solo en la variante» en el visor (RF-34).
11. Tras la revisión del plan: confirmar una equivalencia sin cambiar la pieza no es un paso de Ctrl Z (RF-55); «Dejarlo así» se quita desde Editar (RF-56); las épocas cambiadas en Obsidian llegan al releer (RF-17).
12. Tras el QA 2: la pestaña Ficha guarda lo pendiente ante cualquier cambio de contexto (RF-37c) y no deja crear títulos (RF-37b); tras escribir en una ficha, la app pone al día su fecha en la pieza (RF-39c); las copias van en una carpeta propia y no son notas (RF-39).

## Dudas abiertas
Ninguna.
