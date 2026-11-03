# Spec 005 — «Si lo dejas así…» (entrega 4, parte 2 de 3)

> Solo el QUÉ y el POR QUÉ. Nada de tecnología, archivos ni esquemas: eso va en plan.md.
> Estado: aprobada (2026-10-21). Revisada por QA independiente (28 puntos, recogidos).

## Contexto y objetivo
La entrega 4 (Consecuencias) va en tres specs: 004 guía junto a cada campo (hecha), **005 «Si lo dejas así…»** y 006 «¿Y si…?» con variantes.

La v1 no enseñaba a qué afecta cada cambio (docs/prd.md). La app guarda cada cambio al momento, y el autor no sabe qué ha movido hasta que abre Comprobar o recorre la serie. Esta spec añade al panel la pestaña **«Si lo dejas así…»**. Enseña lo que ha cambiado desde que se abrió la pieza:
- los avisos que saltan, y los que dejan de saltar, en esa pieza y en otras;
- las piezas afectadas;
- los campos cambiados.

Mientras la pestaña está abierta, el visor resalta lo afectado y enseña en discontinuo cómo estaba. «Volver a como estaba» devuelve la pieza y lo que cambió con ella, en un paso. La ventana «Nueva pieza» enseña, antes de crear, lo que cambiará al crearla.

## Usuarios
El autor, en su PC con Windows y en su Mac Intel.

## Historias de usuario
- H1: Como autor quiero ver qué ha roto o arreglado lo que acabo de cambiar, para decidir si lo dejo así.
- H2: Como autor quiero ver qué otras piezas se mueven por mi cambio, para no descubrirlo semanas después.
- H3: Como autor quiero devolver de un golpe la pieza, y lo que se movió con ella, a como estaba.
- H4: Como autor quiero saber, antes de crear una pieza, qué cambiará y qué avisos saltarán.

## Definiciones
- **Pieza abierta:** la pieza elegida en el panel: serie, temporada, episodio, escena, secreto o arco. Un punto clave cuenta como la serie.
- **Punto de partida:** cómo estaba la serie entera justo antes de abrir la pieza.
  - Al crear una pieza desde la app, su punto de partida es la serie justo antes de crearla: la creación entra en la comparación.
  - Se renueva al elegir otra pieza (RF-24). Cambiar de pestaña en el panel o de vista no lo renueva.
- **Paso:** cada paso de deshacer de hoy (una edición, un «Lo sé», mover escenas, crear…).
- **Cambios del autor:** los pasos hechos en la app desde el punto de partida, en cualquier pieza: panel, tarjetas de Tramas, mover escenas en el visor, «Lo sé», deshacer y rehacer.
- **Cambios de fuera:** lo que la app relee porque cambió fuera de Atelier (Obsidian), y lo que la revisión de fichas cambia sola, como pasar a canon desde la wiki. No son del autor (RF-22).
- **Aviso:** lo que da Comprobar en una pieza: una comprobación (C01, C01a…), su clase (aviso o sugerencia) y su texto. Una comprobación puede ir con varias reglas de la guía (C03 con G07, G08 y G10), con una o con ninguna.
- **Mismo aviso:** dos avisos son el mismo si coinciden la pieza, la comprobación con su variante y aquello de lo que hablan (la temporada, el episodio o la escena que nombran). Da igual que cambie su texto, por ejemplo al renombrar una escena. Si una pieza tiene varios avisos iguales, cuentan uno a uno.
- **Aviso que salta:** un aviso activo ahora (ni silenciado con «Lo sé» ni de una pieza aparcada o descartada) que no estaba activo en el punto de partida. **Aviso que deja de saltar:** al revés, pero solo si sigue sin estar silenciado y su pieza sigue comprobándose (los otros casos van a «Lo que has cambiado»: RF-8).
- **Pieza afectada:** otra pieza que, comparada con el punto de partida, cumple alguna de estas:
  - cambió en disco (por ejemplo, una escena vecina renumerada);
  - cambió algo que el visor enseña de ella:
    - su código (T01E04 → T01E05, al insertar un episodio antes);
    - de una escena, su número, su episodio, su acto o si está en la bandeja;
    - el número de escenas o de episodios;
    - la carga;
    - la trama dominante;
    - el número de avisos;
  - si es un arco, cambió dónde empieza o acaba, o los episodios por los que pasa (se comparan los episodios, no sus códigos: renumerar no cuenta);
  - si es un secreto, sus pistas o su revelación caen ahora en otro episodio (igual);
  - es nueva, o se ha borrado (papelera).
- **Campo cambiado:** un campo con etiqueta en el panel o en las tarjetas de Tramas cuyo valor, tal como se ve, es distinto del punto de partida. Lo que la app guarda por dentro y no enseña no cuenta: orden, fechas, valores escritos a mano que deja de usar.

## Requisitos funcionales (EARS)

### La pestaña
- RF-1: EL SISTEMA añadirá al panel la pestaña «Si lo dejas así…», entre Editar y Guía, en todos los tipos de pieza.
- RF-2: MIENTRAS haya algo en los grupos 1 a 3 de RF-5, EL SISTEMA mostrará en la pestaña cuántas entradas tienen (99+ por encima de 99). SI alguna es un aviso que salta de clase aviso, ENTONCES llevará también el icono de aviso, no solo color. El lector de pantalla lo lee al llegar a la pestaña («Si lo dejas así…, 3 cambios, con avisos»), no cada vez que cambia.
- RF-3: EL SISTEMA no abrirá la pestaña por su cuenta ni le pasará el foco.
- RF-4: SI no hay cambios desde el punto de partida, ENTONCES EL SISTEMA dirá en la pestaña «Nada ha cambiado desde que abriste la pieza».

### Qué enseña
- RF-5: EL SISTEMA mostrará en la pestaña estos grupos, por este orden y cada uno con su título, solo si tiene algo:
  1. «Avisos nuevos»: los avisos que saltan, primero los de la pieza abierta y luego los de las otras;
  2. «Otras piezas afectadas»;
  3. «Lo que has cambiado en esta pieza»;
  4. «Ya no avisan»: los avisos que dejan de saltar.

  Dentro de cada grupo, las piezas van en el orden de la serie (temporada, episodio, escena; luego arcos y secretos en el orden de Tramas) y los campos en el orden del panel.
- RF-6: EL SISTEMA mostrará de cada aviso que salta:
  - el aviso tal como sale en Comprobar, con su clase (icono y texto);
  - la pieza, si no es la abierta;
  - debajo, las reglas de la guía que van con esa comprobación en esa pieza, con su código y su texto, como en la spec 004 («G07 · también G08, G10»).

  Si no hay reglas, o no hay guía, solo el aviso.
- RF-7: EL SISTEMA mostrará de cada pieza afectada su código y título, y una frase por cada cosa que le cambió, con cómo estaba y cómo está:
  - «Escena 4 → 5»;
  - «De T01E02 a T01E03»;
  - «Carga + − → + +»;
  - «Trama dominante: El eco → La cinta oculta»;
  - «Pasa también por T01E07 y T01E08» / «Deja de pasar por T01E05»;
  - «La revelación pasa de T01E06 a T01E04»;
  - «Nueva» / «A la papelera».
- RF-8: EL SISTEMA mostrará en «Lo que has cambiado en esta pieza»:
  - cada campo cambiado, con su etiqueta, cómo estaba y cómo está, los textos largos recortados a una línea y «vacío» si lo estaba o lo queda;
  - en las listas, cuántos había y qué se añadió o quitó («Pistas sembradas: 3 → 4 · añadida «…»»);
  - en las rejillas, qué casilla cambió («Estado por temporada: cambió T02»);
  - los avisos silenciados o reactivados («G42: silenciado con «Lo sé»»);
  - si se aparcó, descartó o volvió a comprobar, la frase «Ya no se comprueba: aparcada», «… descartada» o «Se vuelve a comprobar».
- RF-9: EL SISTEMA mostrará de cada aviso que deja de saltar el aviso tal como salía y la pieza, si no es la abierta.
- RF-10: SI un grupo tiene más de 20 entradas, ENTONCES EL SISTEMA mostrará las 20 primeras y «y N más», que despliega el resto y deja el foco en la entrada 21.
- RF-11: CUANDO cambie algo mientras la pestaña está abierta (el autor cambia algo, deshace o llega un cambio de fuera), EL SISTEMA pondrá la lista al día sin moverle el foco.
- RF-12: SI la entrada que tenía el foco desaparece, ENTONCES EL SISTEMA lo pasará a la entrada siguiente; si no hay, al título del grupo; si el grupo desaparece, al título de la pestaña.

### Qué se puede hacer desde la lista
- RF-13: SI el aviso que salta es de la pieza abierta, la pieza no es canon bloqueado y la tabla de la spec 004 pone alguna de sus reglas junto a un campo, ENTONCES EL SISTEMA ofrecerá «Ir al campo».
  - Va al campo de la primera de esas reglas en la tabla.
  - Si el campo está en Editar, abre esa pestaña y le da el foco; si está en una tarjeta de Tramas, abre la tarjeta.
  - La regla queda a la vista, como en la spec 004.
- RF-14: SI la entrada es de otra pieza, ENTONCES EL SISTEMA ofrecerá «Ir a la pieza». Al lado dirá «La comparación empezará de cero»: la elige en el panel, en la pestaña Editar, y empieza con ella (RF-24).
- RF-15: EL SISTEMA ofrecerá «Lo sé» en cada aviso que salta, igual que junto al campo en la spec 004: dice qué otras reglas silencia y es un paso propio de deshacer. Tras pulsarlo, la entrada pasa a «Lo que has cambiado» (si es de la pieza abierta) o desaparece (si es de otra), y el foco sigue RF-12.
- RF-16: CUANDO el foco esté en la lista, EL SISTEMA tratará Ctrl Z y Ctrl Y como fuera de un campo: deshacen o rehacen el último paso, como en la spec 004.

### Volver a como estaba
- RF-17: SI la pieza abierta, o algo que cambió con ella, es distinta del punto de partida, ENTONCES EL SISTEMA ofrecerá «Volver a como estaba» al principio de la pestaña.
- RF-18: CUANDO el autor pulse «Volver a como estaba», EL SISTEMA dejará exactamente como en el punto de partida:
  - la pieza abierta;
  - las piezas que cambiaron en los mismos pasos que ella (por ejemplo, las escenas renumeradas al mover la abierta, o la pieza creada);
  - y, en cadena, las de cada paso posterior que tocó alguna de esas piezas (por ejemplo, otra escena movida en el mismo episodio, que volvió a renumerar las vecinas). Así no quedan números repetidos ni huecos.

  «Exactamente» incluye los valores escritos a mano y los campos que la app no entiende. Lo cambiado en pasos que no tocaron ninguna de esas piezas se queda como está (por ejemplo, un «Lo sé» en otra pieza). Al acabar, dirá cuántas piezas ha devuelto.
- RF-18b: SI la pieza abierta no existía en el punto de partida (se acaba de crear), ENTONCES, tras volver, EL SISTEMA elegirá la serie en el panel, dirá: «Título» ha vuelto a la papelera; Ctrl Z la recupera, y empezará la comparación de cero con la serie.
- RF-19: EL SISTEMA hará «Volver a como estaba» en un solo paso de deshacer:
  - Ctrl Z lo deshace y deja otra vez todos los cambios; Ctrl Y lo rehace;
  - como cualquier paso nuevo, deja sin rehacer lo que se había deshecho antes con Ctrl Z.
- RF-20: SI alguna de las piezas que hay que devolver no se puede cambiar, ENTONCES EL SISTEMA no devolverá ninguna y dirá cuál lo impide y por qué. Lo mismo al deshacer o rehacer el paso con Ctrl Z o Ctrl Y: entero o nada, como crear (spec 002). Una pieza no se puede cambiar si:
  - es canon bloqueado: «Desbloquéala para volver». Como hoy, renumerarla no es cambiarla; meter o sacar escenas de un episodio canon, o editar sus campos, sí;
  - cambió fuera de Atelier después del punto de partida.
- RF-21: SI lo que se devuelve tiene una parte en la wiki que el deshacer de hoy no devuelve (una ficha creada, una entrada del Log), ENTONCES EL SISTEMA lo dirá al volver, con el mismo texto que el deshacer de hoy.

### Lo que llega de fuera
- RF-22: CUANDO una pieza cambie fuera de Atelier, o la revisión de fichas la cambie, mientras hay una pieza abierta, EL SISTEMA:
  - lo incluirá en la comparación;
  - marcará esa pieza en la lista con «Cambió fuera de Atelier» o «Pasó a canon desde la wiki», sin atribuírselo al autor;
  - no lo devolverá con «Volver a como estaba» (RF-20 decide si se puede volver).

  SI después de volver solo quedan cambios de fuera, ENTONCES no ofrecerá «Volver a como estaba».

### Cuándo empieza de cero
- RF-23: EL SISTEMA tomará el punto de partida al abrir una pieza, antes de cualquier cambio; al crearla desde la app, antes de crearla.
- RF-24: CUANDO el autor elija otra pieza en el panel, en el visor, en Tramas, en Buscar o con «Ir a la pieza», EL SISTEMA empezará la comparación de cero con ella. La pestaña que estaba abierta sigue abierta, salvo con «Ir a la pieza», que abre Editar (RF-14).
- RF-25: MIENTRAS la pestaña «Si lo dejas así…» esté abierta, EL SISTEMA no cambiará la pieza del panel al moverse por los niveles del visor (bajar a una temporada o a un episodio, subir, migas o Esc): así se puede ir a ver lo afectado sin perder la comparación. Pinchar una escena sí la elige (RF-24). Con la pestaña cerrada, el visor elige como hoy. El menú de la izquierda no cambia.
- RF-26: CUANDO la pieza abierta deje de existir por cualquier motivo (se borra, se deshace su creación, se borra fuera), EL SISTEMA dará la comparación por acabada; la pieza que se elija después empieza de cero, ya con eso hecho.

### En el visor
- RF-27: MIENTRAS la pestaña esté abierta y haya cambios, EL SISTEMA resaltará en el visor la pieza abierta y las piezas afectadas, en el nivel que se vea:
  - en la serie, las temporadas que contienen algo resaltado;
  - en la temporada, los episodios (y las escenas de la bandeja);
  - en el episodio, las escenas.

  Un arco o un secreto se resalta en las temporadas y episodios por los que pasa, antes y ahora. El resto se atenúa con color, sin bajar el texto de 4,5:1 de contraste. Lo resaltado lleva texto para el lector de pantalla («afectada»).
- RF-28: MIENTRAS la pestaña esté abierta y haya cambios, EL SISTEMA enseñará en cada columna afectada cómo estaba lo que cambió, en discontinuo gris con la palabra «antes»: número de escena, número de escenas o de episodios, carga y trama dominante. Además:
  - en el sitio de donde salió una escena que cambió de episodio, de acto o de bandeja, una marca fina discontinua «Estaba aquí: «título»», sin ocupar el sitio de una tarjeta. Las escenas que solo se renumeran no llevan esta marca; llevan su número de antes («antes 4»);
  - la marca «Nueva» en una pieza que no existía en el punto de partida;
  - una línea bajo el nivel, «Ya no está: «título»», por cada pieza de ese nivel que se borró.

  Lo discontinuo lleva siempre texto, no solo la línea, y el lector de pantalla lo lee («antes: …»). El discontinuo de acento queda para «Cómo quedaría» (spec 006).
- RF-29: CUANDO la pestaña se cierre (otra pestaña, otra pieza o ninguna), EL SISTEMA quitará el resaltado y lo discontinuo.

### «Nueva pieza»
- RF-30: MIENTRAS la ventana «Nueva pieza» esté abierta, EL SISTEMA mostrará bajo «Lo que te pedirán tus guías» el apartado «Si la creas así…», con:
  - dónde aparecerá, según el tipo:
    - escena: episodio, acto y número;
    - episodio: temporada y número;
    - temporada: su número, al final;
    - trama de serie: «Trama de la serie»;
    - trama de temporada o tramo: su temporada;
    - secreto: «Secreto de la serie»;
  - las piezas que cambiarán al crearla, como en RF-7 (por ejemplo, «T01E03 pasa de 5 a 6 escenas; las escenas 4 y 5 pasan a 5 y 6»);
  - los avisos que saltarán nada más crearla, en ella y en otras piezas, como en RF-6.
- RF-31: CUANDO el autor cambie en la ventana el tipo, el título o lo que decide dónde va, o cambie la serie mientras está abierta, EL SISTEMA pondrá al día ese apartado sin escribir nada en disco; mientras escribe el título, cuando deje de escribir.
- RF-32: SI la pieza no se puede crear así (canon bloqueado, falta elegir algo), ENTONCES EL SISTEMA dirá por qué en lugar del apartado, con el mismo texto que impide Crear.

### Lo que sigue igual
- RF-33: EL SISTEMA mantendrá sin cambios Comprobar, la pestaña Guía, las reglas junto a cada campo (spec 004) y Ctrl Z / Ctrl Y paso a paso.

## Requisitos no funcionales
- Rendimiento, en un Mac Intel antiguo con la serie grande (1.500 escenas):
  - la lista y el resaltado se ponen al día en menos de 200 ms tras un cambio;
  - abrir una pieza tarda como mucho 50 ms más que hoy;
  - una tecla en un campo no tarda más de 16 ms más que hoy;
  - «Si la creas así…» se pone al día 300 ms después de dejar de escribir y tarda menos de 200 ms.
- Compatibilidad con la v1.0 (constitución 9): el punto de partida vive solo en memoria; nada nuevo se escribe en disco. «Volver a como estaba» deja cada nota como estaba en el punto de partida, en el formato de siempre.
- Integridad de la vault (constitución 2):
  - «Volver a como estaba» pasa por el guardado de siempre, es entero o nada y no pisa una nota cambiada fuera (spec 002);
  - nada se borra: lo creado que se devuelve va a la papelera, como hoy;
  - la simulación de «Si la creas así…» no escribe nada.
- Seguridad: textos de la serie y de la guía como texto plano, sin interpretar HTML ni Markdown.
- Estabilidad visual: abrir la pestaña no cambia el ancho, el orden ni el sitio de las columnas del visor. Lo discontinuo va dentro de las columnas o en una línea bajo el nivel.
- Accesibilidad:
  - todo con teclado;
  - grupos con título;
  - la cifra de la pestaña se lee al llegar a ella (RF-2);
  - lo resaltado y lo discontinuo tienen texto;
  - contraste ≥ 4,5:1 en los dos temas.
- Intuitiva sin manual: tras cambiar algo, se entiende qué ha pasado y cómo volver sin leer instrucciones.
- Idioma: español.

## Datos personales
Ninguno. Solo notas de ficción del autor.

## Casos límite
- **Escribir y borrar lo escrito:** el campo vuelve a verse como en el punto de partida y sale de la lista, aunque por dentro la nota haya cambiado (por ejemplo, un valor escrito a mano que la app deja de usar). «Volver» la deja exacta.
- **Deshacer:**
  - con Ctrl Z hasta el punto de partida, la lista queda vacía (RF-4);
  - más allá del punto de partida (cambios de antes de abrir la pieza), lo deshecho sale en la lista: la serie ya no está como al abrirla.
- **Borrados:** si la pieza abierta se borra desde la app, la comparación acaba (RF-26). Si se borra o se renombra fuera, pasa lo de hoy con la pieza elegida; si sigue abierta, se marca como de fuera (RF-22).
- **Canon:**
  - una pieza canon bloqueado no se edita, pero otras pueden afectarla (sus avisos, la renumeración); la lista lo enseña igual;
  - «Volver» solo se bloquea si hay que cambiarla (RF-20);
  - pasar la pieza abierta a canon con el botón es un cambio más; para volver hay que desbloquearla.
- **Aparcada o descartada:** sus avisos no se comprueban (spec 001); aparcar o descartar va a «Lo que has cambiado» (RF-8), no a «Ya no avisan».
- **Mover escenas** con arrastre o Alt + flechas renumera el episodio entero: cada escena renumerada es una pieza afectada (RF-7), con «y N más» si son más de 20 (RF-10).
- **«Lo sé» sobre un aviso que ya estaba:** no es un aviso que deja de saltar; va a «Lo que has cambiado» (RF-8).
- **Sin guía o con una guía que no se lee:** Comprobar sigue dando avisos; la lista los enseña sin reglas (RF-6).
- **Campos que guardan al salir** (protagonistas, selectores de la wiki): entran en la lista al guardarse.
- **Un cambio de fuera llega mientras hay lo del autor sin guardar:** pasa lo de hoy (spec 002); la lista enseña lo que queda.
- **Crear una temporada con episodios:** la temporada es la pieza abierta; cada episodio sale una vez, como «Nueva».
- **Panel estrecho:** las frases se parten en varias líneas, sin desplazamiento horizontal.

## Fuera de alcance
- «Qué se podría hacer» para cada aviso (una propuesta de arreglo por regla): sin spec todavía.
- Comparar con otro momento que no sea el de abrir la pieza (por ejemplo, «desde ayer»), o guardar la comparación entre sesiones.
- Devolver cambios sueltos de la lista: solo «Volver a como estaba», entero.
- Resaltar lo afectado mientras se escribe en Editar (decisión del autor: solo con la pestaña abierta).
- Lo discontinuo en vistas que no son el visor (Tramas, rejilla, línea de la historia): con la entrega 5.
- «¿Y si…?» con variantes y comparar «Ahora» con «Cómo quedaría» (spec 006).

## Criterios de finalización
- Cada RF con su test en verde o con su prueba en la interfaz, según la decisión de tests ligeros de la 003:
  - con test, la lógica: punto de partida (también al crear), mismo aviso, avisos que saltan y que dejan de saltar, piezas afectadas, campos cambiados, Volver exacto y entero o nada (también con Ctrl Z y Ctrl Y), cambios de fuera y simulación de «Nueva pieza»;
  - en la interfaz, lo visual.
- Lo que «Volver a como estaba» escribe, probado con el lector de la v1.0.
- Prueba a mano del autor, en `_prueba` y sin manual:
  - abrir una escena, dejarla empezando y acabando igual y ver G42 en «Avisos nuevos»;
  - mover una escena de episodio, abrir la pestaña, bajar en el visor al episodio de donde salió y ver «Estaba aquí» y las renumeradas;
  - «Volver a como estaba» y luego Ctrl Z;
  - «Nueva pieza» de una escena en un episodio con escenas, viendo la renumeración antes de crear.
- `docs/diseno.md` al día: resaltado con la pestaña abierta, discontinuo gris = antes, de acento = cómo quedaría.
- `npm run verificar` en verde y revisión de seguridad sin críticos.

## Dudas resueltas
1. Compara desde que se abre la pieza (Definiciones, RF-23).
2. Pestaña, resaltado en el visor y lo discontinuo, en una sola spec (decisión del autor tras la revisión QA).
3. La lista lleva avisos nuevos, otras piezas afectadas, campos cambiados y avisos en otras piezas (RF-5).
4. «Volver a como estaba» devuelve la pieza y lo que cambió con ella, en un paso que se deshace con Ctrl Z (RF-18, RF-19).
5. «Nueva pieza» enseña el efecto antes de crear (RF-30).
6. Al elegir otra pieza, la comparación empieza de cero (RF-24).
7. El resaltado solo con la pestaña abierta (RF-27).
8. Decidido sin preguntar, tras la revisión QA:
   - la pestaña no se abre sola (RF-3);
   - con la pestaña abierta, moverse por el visor no cambia la pieza (RF-25); si no, «Estaba aquí» no se podría ver;
   - la comparación es por avisos de Comprobar, con sus reglas debajo, porque un aviso puede tener varias reglas o ninguna (RF-6);
   - un aviso es el mismo aunque cambie su texto (Definiciones);
   - Volver es exacto y entero o nada, también al deshacerlo (RF-18 a RF-20);
   - lo de fuera entra marcado y Volver no lo devuelve (RF-22);
   - silenciar o aparcar no cuenta como «Ya no avisan» (RF-8);
   - más de 20 entradas: «y N más» (RF-10);
   - «antes» en discontinuo gris; el de acento queda para la 006 (RF-28).
9. Tras la revisión del plan (decisiones del autor):
   - «Volver» arrastra en cadena los pasos posteriores que tocaron piezas ya devueltas (RF-18);
   - «Volver» en una pieza recién creada la manda a la papelera y pasa a la serie, con aviso de Ctrl Z (RF-18b);
   - un código de episodio que cambia cuenta como pieza afectada; los arcos y secretos se comparan por episodio, no por código (Definiciones);
   - «Ir a la pieza» abre Editar; elegir de otra forma deja la pestaña que estaba (RF-24).

## Dudas abiertas
Ninguna.
