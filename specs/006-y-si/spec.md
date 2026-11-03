# Spec 006 — «¿Y si…?» (entrega 4, parte 3 de 3)

> Solo el QUÉ y el POR QUÉ. Nada de tecnología, archivos ni esquemas: eso va en plan.md.
> Estado: aprobada (2026-10-21). Revisada por QA independiente (40 puntos, recogidos).

## Contexto y objetivo
La entrega 4 (Consecuencias) va en tres specs: 004 guía junto a cada campo (hecha), 005 «Si lo dejas así…» (hecha) y **006 «¿Y si…?»**.

Hoy cada cambio se guarda en la serie al momento. Para probar una idea grande («¿y si Nando se va en E05?»), el autor tiene que cambiar la serie de verdad y acordarse de deshacerlo. Esta spec añade **variantes**:
- el autor abre «¿Y si…?» y cambia lo que quiera (varias piezas, crear, mover, estados) sin tocar la serie;
- ve «Ahora» frente a «Cómo quedaría», con lo que cambia y los avisos que saltarían;
- al final la **aplica** (entera y en un paso), la **aparca** para más tarde o la **descarta** (nada se borra).

Una variante también se puede empezar desde una pieza («Probar otra versión»). Así una pieza puede tener varias versiones aparcadas y el autor elige después cuál se queda.

## Usuarios
El autor, en su PC con Windows y en su Mac Intel.

## Historias de usuario
- H1: Como autor quiero probar un cambio grande sin tocar la serie, para decidir con calma si lo quiero.
- H2: Como autor quiero ver a la vez cómo está la serie y cómo quedaría, con los avisos que saltarían, para comparar.
- H3: Como autor quiero guardar varias versiones de una pieza y elegir después cuál se queda.
- H4: Como autor quiero que aplicar una variante sea de un golpe y se pueda deshacer, sin pisar sin avisar lo que cambié después en la serie.
- H5: Como autor quiero ver lo que probé y descarté, y recuperarlo si cambio de idea.

## Definiciones
- **Variante:** un conjunto de cambios sobre las piezas de la serie, con nombre, guardado en la vault como nota Markdown aparte de la serie.
  - Las piezas son las de las specs 001-005, incluida la serie (premisa, logline, puntos clave…).
  - Una variante puede cambiar piezas, crearlas, moverlas, cambiar su estado, mandarlas a la papelera y silenciar avisos con «Lo sé».
- **Estado de una variante:** abierta (la que se está viendo; como mucho una), aparcada, aplicada o descartada. No tiene nada que ver con el estado de una pieza (aparcado, descartado…): la interfaz dice siempre «variante» junto a los suyos.
- **Ahora:** la serie tal como está en la vault.
- **Cómo quedaría:** la serie de ahora con los cambios de la variante encima. Las piezas que la variante no toca se ven como están ahora, también si cambian fuera mientras tanto.
- **Pieza de la variante:** una pieza que la variante cambia, crea o manda a la papelera. La serie cuenta como pieza.
- **Base de una pieza de la variante:** cómo estaba su nota en la serie cuando la variante la tocó por primera vez, o cuando se trajo lo de ahora (RF-30).
- **Choque:** una de estas situaciones.
  - **De pieza:** la nota de una pieza de la variante ha cambiado en la serie después de su base, en cualquier cosa: también en campos que la app no enseña. Da igual quién la cambiara: Atelier, Obsidian, la v1.0, el otro equipo o la revisión de fichas. También es choque de pieza que esa pieza ya no exista en la serie.
  - **De sitio:** la variante crea o mueve algo dentro de un contenedor (las escenas de un episodio, los episodios de una temporada, las temporadas de la serie). Hay choque si, después de la primera vez que la variante tocó ese contenedor, la serie le metió, le sacó o le reordenó piezas, o el contenedor ya no existe.
  - **De referencia:** la variante enlaza con una pieza que ya no está en la serie. Por ejemplo, pone la revelación de un secreto en un episodio que se mandó a la papelera.
- **Diferencia:** lo que distingue «Cómo quedaría» de «Ahora». Se mide con las reglas de la spec 005 («pieza afectada», «campo cambiado», «aviso que salta», «aviso que deja de saltar»), poniendo «Ahora» en el lugar del punto de partida. Una pieza con diferencias puede ser de la variante, o no serlo y quedar afectada por ella (por ejemplo, la carga de un episodio cuyas escenas cambia la variante).
- **Versiones de una pieza:** las variantes aparcadas que se crearon desde esa pieza («Probar otra versión») o que la cambian.

## Requisitos funcionales (EARS)

### Abrir una variante
- RF-1: CUANDO el autor pulse «¿Y si…?» en la barra superior, EL SISTEMA abrirá un menú con:
  - «Nueva variante»;
  - las variantes aparcadas, la más reciente primero, cada una con «Abrir» y «Aplicar» y con el icono de aviso si tiene choques;
  - «Aplicadas y descartadas (N)».
- RF-2: CUANDO el autor elija «Nueva variante», EL SISTEMA abrirá una variante vacía llamada «¿Y si…? <día> <mes abreviado>, <hora>:<minutos>» (por ejemplo, «¿Y si…? 21 oct, 18:20»), sin pedir nada más. Se le pone nombre al primer cambio (RF-26). Si en el mismo minuto ya hay una con ese nombre, se añade « (2)», « (3)»…
- RF-2b: EL SISTEMA dejará cambiar el nombre pinchándolo en la barra de la variante.
  - Saltos de línea y caracteres de control se cambian por espacios.
  - Como mucho 120 caracteres; si hay más, se recorta y lo dice.
  - Si se deja vacío, vuelve el nombre de antes.
  - El nombre es solo un dato: no decide dónde se guarda la variante.
- RF-3: EL SISTEMA ofrecerá «Probar otra versión» en el panel de cada pieza. CUANDO el autor lo pulse, EL SISTEMA abrirá una variante nueva llamada «Otra versión de «título»», con esa pieza elegida en el panel. Si ya había una variante abierta, se aplica RF-6.
- RF-4: SI la pieza tiene versiones, ENTONCES EL SISTEMA mostrará «Versiones (N)» junto a «Probar otra versión». Al desplegarlo, cada versión sale con su nombre, su fecha y estos botones: «Abrir», «Lado a lado» (de esa pieza) y «Aplicar».
- RF-5: CUANDO el autor abra una variante aparcada, EL SISTEMA la abrirá con sus cambios, con la pieza que estaba elegida si existe y con el deshacer vacío (RF-10).
- RF-6: SI ya hay una variante abierta al abrir, crear o aplicar otra, ENTONCES EL SISTEMA aparcará antes la abierta y lo dirá: «Nando se va en E05» queda aparcada.

### Mientras está abierta
- RF-7: MIENTRAS haya una variante abierta, EL SISTEMA:
  - mostrará bajo la barra superior la barra «¿Y si…?», en el tono del acento, con:
    - el nombre de la variante;
    - la frase «Ves cómo quedaría. Nada toca la serie hasta que pulses «Aplicar».»;
    - los botones «Ver ahora», «Aparcar variante», «Descartar variante» y «Aplicar»;
  - cambiará el tono de la barra superior (docs/diseno.md).
- RF-8: MIENTRAS haya una variante abierta y se vea «Cómo quedaría», EL SISTEMA guardará en la variante, y no en la serie, todo lo que el autor cambie en las piezas:
  - editar campos, en el panel y en las tarjetas de Tramas;
  - crear piezas y mover escenas;
  - cambiar estados, también pasar a borrador o a canon;
  - mandar a la papelera, con lo que contiene, igual que hoy en la serie;
  - «Lo sé» y «Volver a como estaba».

  Nada de eso escribe en las notas de la serie, en la wiki ni en `Log.md`.
- RF-8b: CUANDO el autor apunte una idea con Ctrl I con una variante abierta, EL SISTEMA la guardará en la serie como hoy, fuera de la variante, y lo dirá: «Apuntada en la serie (fuera de la variante)». Así una idea rápida nunca se queda atrapada en una prueba.
- RF-9: EL SISTEMA guardará cada cambio de la variante en la vault con el guardado seguro de siempre y con el mismo ritmo que el guardado de las piezas de hoy. Cerrar la app no pierde nada.
- RF-10: MIENTRAS haya una variante abierta, Ctrl Z y Ctrl Y deshacen y rehacen los pasos de la variante.
  - El deshacer de la serie queda tal cual y vuelve al salir de la variante.
  - El deshacer de la variante vive mientras está abierta: se vacía al aparcarla, al abrir otra o al cerrar la app, como el de hoy.
- RF-11: MIENTRAS haya una variante abierta, EL SISTEMA dejará editar dentro de la variante las piezas canon bloqueado. Junto al candado dirá: «Canon: en la variante se puede probar; al aplicar habrá que desbloquearla».
- RF-12: MIENTRAS haya una variante abierta, EL SISTEMA no permitirá, y dirá «Sal de la variante para…»:
  - editar la guía;
  - crear o restaurar instantáneas;
  - ver la papelera o recuperar de ella;
  - crear fichas nuevas de personajes, lugares o épocas en la wiki (RF-8: nada escribe en la wiki hasta aplicar; aclarado en el plan);
  - cambiar de serie.

  Lo demás funciona sobre lo que se ve, incluidos Buscar o crear (Ctrl K), «Pasar a la wiki» (se escribe al aplicar) y la vista y los selectores de la wiki (la wiki se lee como está).
- RF-13: EL SISTEMA hará que funcionen sobre lo que se ve («Cómo quedaría» o «Ahora»):
  - Comprobar y la pestaña Guía;
  - las reglas junto al campo (spec 004);
  - «Si lo dejas así…» y «Si la creas así…» (spec 005).

  Dentro de la variante, el punto de partida de «Si lo dejas así…» se toma al elegir la pieza, como hoy. Cambiar entre «Ahora» y «Cómo quedaría» lo vuelve a tomar.

### Ver ahora y cómo quedaría
- RF-14: CUANDO el autor pulse «Ver ahora», EL SISTEMA enseñará la serie de ahora en el visor, el panel y las vistas, y el botón pasará a «Ver cómo quedaría». La barra de la variante sigue a la vista.
- RF-15: MIENTRAS se vea «Ahora» con una variante abierta, EL SISTEMA no dejará cambiar nada: ni campos, ni «Lo sé», ni Ctrl Z, ni Ctrl Y. Lo dirá en el panel: «Estás viendo ahora. Pulsa «Ver cómo quedaría» para seguir probando.» Ctrl I sí funciona (RF-8b).
- RF-16: CUANDO se cambie entre «Ahora» y «Cómo quedaría», EL SISTEMA mantendrá la pieza elegida, el nivel del visor y la pestaña del panel. Si la pieza no existe en lo que se pasa a ver (se creó en la variante o se manda a la papelera en ella), elegirá la pieza que la contiene y lo dirá.
- RF-17: MIENTRAS haya una variante abierta, EL SISTEMA marcará las diferencias en el visor, en el nivel que se vea, en discontinuo de acento y con texto:
  - en «Cómo quedaría», cómo está ahora («ahora 4», «ahora: El eco»);
  - en «Ahora», cómo quedaría («quedaría 5»).

  Se marcan los mismos datos que «antes» en la spec 005 (número de escena, número de escenas o de episodios, carga, trama dominante), además de «Nueva en la variante» y «Sale en la variante». Todo lleva texto para el lector de pantalla.
- RF-18: MIENTRAS la pestaña «Si lo dejas así…» esté abierta dentro de una variante, EL SISTEMA enseñará su gris discontinuo («antes») y no el de acento, para no mezclar dos comparaciones.

### La pestaña «¿Y si…?»
- RF-19: MIENTRAS haya una variante abierta, EL SISTEMA añadirá al panel la pestaña «¿Y si…?», entre «Si lo dejas así…» y Guía.
  - Lleva la cifra de entradas de los grupos 1 a 3 de RF-20 y el icono de aviso si hay choques o salta algún aviso, como en la spec 005 (RF-2).
  - Solo se abre sola al pulsar «Aplicar» con choques (RF-33).
- RF-20: EL SISTEMA mostrará en la pestaña estos grupos, por este orden y solo si tienen algo:
  1. «Choques»: cada choque con lo que cambió en la serie (RF-28);
  2. «Avisos que saltarían», como «Avisos nuevos» en la spec 005, con sus reglas;
  3. «Lo que cambia la variante»: primero las piezas de la variante y luego, marcadas como «afectada», las otras piezas con diferencias. Cada pieza va con su código y su título, y con sus campos cambiados y las frases de la spec 005 (RF-7 y RF-8) que dicen cómo está ahora y cómo quedaría;
  4. «Dejarían de avisar».

  El orden, el límite de 20 entradas con «y N más» y el foco al ponerse al día son los de la spec 005 (RF-5 y RF-10 a RF-12).
- RF-21: SI la variante no tiene diferencias ni choques, ENTONCES EL SISTEMA dirá en la pestaña «La variante no cambia nada todavía».
- RF-22: EL SISTEMA ofrecerá «Lado a lado» en cada pieza de la lista, y «Quitar de la variante» en cada pieza de la variante.
- RF-23: CUANDO el autor pulse «Lado a lado», EL SISTEMA abrirá una ventana con dos columnas, «Ahora» y «Cómo quedaría».
  - Cada columna enseña todos los campos de la pieza, en el orden del panel, y los avisos de ese lado.
  - Las diferencias van marcadas con texto («cambia»). Los campos con choque llevan «cambió en la serie».
  - Si la pieza no existe en un lado, esa columna dice «No existe ahora» o «Sale en la variante».
  - Se cierra con Esc o con «Cerrar», y el foco vuelve a donde estaba.
  - Se llega desde la lista, desde «Choques» y desde «Versiones» (RF-4).
- RF-24: CUANDO el autor pulse «Quitar de la variante», EL SISTEMA dejará esa pieza como está ahora en la serie, en un solo paso de deshacer de la variante:
  - si es nueva, deja de crearse;
  - si lo único que la variante le cambia es un «Lo sé», se quita ese silencio;
  - si es la serie, solo se quitan los cambios de sus campos.
- RF-24b: SI quitar una pieza obliga a quitar otras para que la variante siga entera, ENTONCES EL SISTEMA dirá antes cuáles son y las quitará todas juntas solo si el autor confirma. Pasa con:
  - lo que la pieza contiene, si es nueva (una temporada creada con sus episodios y escenas);
  - las escenas renumeradas de los episodios de los que salió o a los que llegó una escena movida, para que no queden números repetidos ni huecos.

### Aparcar
- RF-25: CUANDO el autor pulse «Aparcar variante», EL SISTEMA cerrará la variante, la dejará en «Aparcadas» y volverá a la serie de ahora, con la misma pieza elegida si existe y, si no, la que la contiene.
- RF-26: SI una variante no tiene piezas de la variante al aparcarla, al descartarla o al salir de ella (abrir otra, cerrar la app), ENTONCES EL SISTEMA no dejará nada guardado y dirá «No cambiaba nada: no se guarda».
- RF-27: CUANDO se abra la serie y quede una variante que estaba abierta al cerrar la app, EL SISTEMA abrirá la serie de ahora y dejará esa variante aparcada.

### Choques
- RF-28: EL SISTEMA buscará los choques de la variante abierta cada vez que cambie la serie, y los de las aparcadas al enseñar el menú, «Versiones» o la confirmación de aplicar. Para cada choque dirá:
  - en un choque de pieza:
    - los campos que cambiaron solo en la serie;
    - los que cambiaron en los dos lados («Sinopsis: cambiada en los dos lados»);
    - «Cambió por dentro (campos que Atelier no enseña)», si es eso;
    - «Ya no está en la serie», si es el caso;
  - en un choque de sitio: «La serie cambió las escenas de T01E05 después» (o lo que toque), o «T01E05 ya no está en la serie»;
  - en un choque de referencia: qué enlaza la variante y con qué pieza que ya no está.
- RF-29: SI la variante tiene choques, ENTONCES EL SISTEMA la marcará con el icono de aviso en la barra, en el menú de «¿Y si…?» y en «Versiones».
- RF-30: CUANDO el autor pulse «Traer lo de ahora» en un choque de pieza, EL SISTEMA pondrá al día esa pieza de la variante con la serie, en un paso de deshacer de la variante:
  - lo que cambió solo en la serie, también lo que la app no enseña, toma lo de ahora;
  - lo que cambió solo en la variante se queda como en la variante;
  - lo que cambió en los dos lados se queda como en la variante y pasa a «Pisa lo de ahora» (RF-30c);
  - la base de la pieza pasa a ser la de ahora, y deja de estar en choque.
- RF-30b: CUANDO el autor pulse «Traer lo de ahora» en un choque de sitio, EL SISTEMA pondrá ese contenedor de la variante en el orden de la serie de ahora. Las piezas que la variante crea o mueve van en el mismo sitio de antes respecto a sus vecinas; si su vecina ya no está, van al final. Todo se renumera sin repetidos ni huecos.
- RF-30c: MIENTRAS un campo de la variante pise un valor que se cambió en la serie después de su base, EL SISTEMA lo dirá en «Lo que cambia la variante» y en «Lado a lado» («Pisa lo de ahora: «…»»). Al aplicar, la confirmación también lo dirá (RF-32). Así nada se pisa sin verlo.
- RF-31: SI un choque es de una pieza o de un sitio que ya no existe en la serie, o de referencia, ENTONCES EL SISTEMA no ofrecerá «Traer lo de ahora». Ofrecerá «Quitar de la variante» en las piezas de la variante implicadas (RF-24) y dirá que también se puede editar la variante para que no lo use.

### Aplicar
- RF-32: CUANDO el autor pulse «Aplicar», EL SISTEMA confirmará dentro de la interfaz con un resumen: «Aplicar «X»: cambia N piezas y saltarían M avisos.». Si pisa algo, añade «Pisa lo de ahora en K campos». Los botones son «Aplicar» y «Cancelar». N son las piezas de la variante.
  - Desde la barra, el resumen sale en el pie de la barra.
  - Desde el menú o desde «Versiones», sale junto a la variante.
- RF-33: SI la variante tiene choques, ENTONCES EL SISTEMA no aplicará nada: abrirá la pestaña «¿Y si…?» en «Choques» (o, si no está abierta, lo dirá en la confirmación) con «Lado a lado» y lo que se pueda hacer en cada uno.
- RF-34: SI no hay choques pero la variante cambia piezas que en la serie son canon bloqueado, ENTONCES EL SISTEMA no aplicará nada, dirá cuáles y ofrecerá «Desbloquear y aplicar», con el aviso de retcon de siempre. «Cambiar» se entiende como en la spec 005 (RF-20): renumerar no es cambiar; meter o sacar escenas de un episodio canon, o editar sus campos, sí. Las piezas desbloqueadas quedan desbloqueadas, como al desbloquear hoy.
- RF-34b: SI no hay choques pero algo de la wiki impide aplicar, ENTONCES EL SISTEMA no aplicará nada y dirá qué y por qué, con los textos de la spec 001. Pasa con:
  - una ficha que hay que crear y cuyo nombre ya existe;
  - una ficha que hay que cambiar y no existe;
  - un enlace a ficha fuera de la wiki de la serie.
- RF-35: SI la variante no tiene diferencias, ENTONCES EL SISTEMA no ofrecerá «Aplicar» y lo dirá («No cambia nada»).
- RF-36: CUANDO se aplique, EL SISTEMA hará antes una instantánea automática de la serie, como al restaurar.
- RF-37: CUANDO se aplique, EL SISTEMA dejará las notas de la serie exactamente como «Cómo quedaría», entero o nada:
  - las piezas cambiadas, creadas o mandadas a la papelera, con el guardado y la papelera de siempre, conservando lo que la app no entiende;
  - SI algo falla al escribirlas, ENTONCES lo ya escrito vuelve a como estaba (lo creado, a la papelera), no se aplica nada y lo dice.
- RF-37b: CUANDO las notas de la serie estén escritas, EL SISTEMA pondrá la wiki al día como hoy:
  - las fichas siguen el estado de su pieza;
  - pasar a borrador crea la ficha, sus Fuentes y la entrada de `Log.md`.

  SI eso falla, ENTONCES:
  - las notas de la serie y los estados de las fichas que ya habían cambiado vuelven a como estaban;
  - lo que la app no puede deshacer en la wiki (una ficha creada, una entrada del Log) se queda y lo dice, con el mismo texto que el deshacer de hoy (spec 005, RF-21).
- RF-38: EL SISTEMA hará «Aplicar» en un solo paso de deshacer de la serie, con las mismas reglas y avisos que «Volver a como estaba» en la spec 005 (RF-19 a RF-21).
  - Ctrl Z lo deshace entero y deja la variante otra vez «aparcada», con sus cambios: se puede volver a abrir y a aplicar.
  - Ctrl Y lo rehace y la deja otra vez «aplicada».
- RF-39: CUANDO se aplique, EL SISTEMA cerrará la variante, la marcará como aplicada con su fecha, guardará con ella cómo estaban las piezas que cambió, volverá a la serie y dirá: «Aplicada «X»: N piezas.».
- RF-40: CUANDO se aplique una variante, EL SISTEMA no cambiará solas las otras variantes que tocaban las mismas piezas: pasarán a tener choques (RF-28).

### Descartar y recuperar
- RF-41: CUANDO el autor pulse «Descartar variante», EL SISTEMA pedirá dentro de la interfaz un «por qué» opcional (como mucho 500 caracteres, con los saltos de línea y los caracteres de control cambiados por espacios). Después cerrará la variante, la marcará como descartada con su fecha y su porqué, y volverá a la serie. No se borra nada.
- RF-42: CUANDO el autor abra «Aplicadas y descartadas», EL SISTEMA mostrará cada una con su nombre, estado, fecha, porqué (si lo tiene) y cuántas piezas cambiaba, la más reciente primero, 20 y «y N más».
- RF-43: EL SISTEMA ofrecerá «Recuperar» en las descartadas: vuelven a «Aparcadas» con sus cambios, y con sus choques si los hay.
- RF-44: EL SISTEMA ofrecerá «Ver» en las aplicadas. Enseña la lista de piezas que cambió y, de cada una, «Lado a lado» con «Antes de aplicar» y «Lo que aplicó». No se puede abrir ni volver a aplicar (para eso, Ctrl Z: RF-38).

### Lo que sigue igual
- RF-45: SIN variante abierta, EL SISTEMA se comportará como hoy: los cambios van a la serie al momento, con su deshacer.

## Requisitos no funcionales
- Rendimiento, en un Mac Intel antiguo con la serie grande (1.500 escenas):
  - abrir, aparcar o cambiar de variante: menos de 1 s;
  - cambiar entre «Ahora» y «Cómo quedaría»: menos de 200 ms;
  - la pestaña «¿Y si…?» y las marcas del visor se ponen al día en menos de 200 ms tras un cambio;
  - una tecla en un campo dentro de la variante no tarda más de 16 ms más que fuera;
  - abrir la serie con 50 variantes guardadas no tarda más de 200 ms más que sin ellas;
  - el menú de «¿Y si…?» con 50 variantes y sus choques, en menos de 500 ms;
  - aplicar una variante de 200 piezas, en menos de 5 s.
- Compatibilidad con la v1.0 (constitución 9):
  - las variantes se guardan donde la v1.0 no las toma por series ni por piezas. Con variantes guardadas, la v1.0 abre la serie igual que sin ellas, y restaurar o mandar a la papelera desde la v1.0 no las toca (probado con su lector);
  - nada cambia en las notas que la v1.0 lee hasta «Aplicar», y lo que escribe «Aplicar» va en el formato de siempre.
- Integridad de la vault (constitución 1 y 2):
  - lo que se prueba vive en la vault como nota Markdown, que se puede leer (RF-9);
  - nada se borra: descartar marca; aplicar usa la papelera de siempre;
  - aplicar es entero o nada en las notas de la serie, hace una instantánea antes y no pisa nada sin decirlo (RF-30c, RF-33);
  - se conservan los campos, el texto y el formato que la app no entiende, en la variante y al aplicar.
- Seguridad:
  - lo que se lee de una variante se valida como cualquier pieza leída de la vault: tipos, identificadores y enlaces a fichas (spec 001, RF-33). Aplicar solo escribe en la mesa de la serie y en su wiki;
  - una variante que no se puede leer se aparta y se enseña, como un fichero roto hoy, sin tumbar la serie ni las demás;
  - nombres, porqués y textos, como texto plano, sin interpretar HTML ni Markdown.
- Accesibilidad:
  - todo con teclado;
  - la barra y la pestaña con títulos;
  - lo discontinuo, con texto;
  - contraste ≥ 4,5:1 en los dos temas, también en la barra de tono acento.
- Intuitiva sin manual: sin leer nada se entiende que se está probando, que la serie no se toca y cómo salir.
- Idioma: español.

## Datos personales
Ninguno. Solo notas de ficción del autor.

## Casos límite
- **Variante vacía:** no se guarda (RF-26) ni se aplica (RF-35). Si la serie llega por fuera a lo mismo que la variante, la variante se queda sin diferencias: se puede descartar o dejar.
- **Nombre largo:** se recorta con «…» a la vista y se lee entero al pasar el ratón o con el lector. Dos variantes pueden llamarse igual: la fecha las distingue.
- **Muchas variantes:** el menú enseña 20 aparcadas y «y N más». Nada se borra, así que la vault crece con lo probado: es lo que pide la constitución.
- **Crear y mandar a la papelera en la misma variante:** no es diferencia y no se crea al aplicar.
- **Mover escenas en la variante:** renumera los episodios en la variante; al aplicar se escribe como un mover de hoy. Quitar una de ellas sigue RF-24b.
- **La serie renumera un episodio que la variante también toca:** choque de sitio. «Traer lo de ahora» (RF-30b) deja la numeración sin repetidos.
- **Canon:** probar sobre canon está permitido (RF-11). Pasar a canon dentro de la variante solo se escribe al aplicar. Si la serie pasa a canon un contenedor donde la variante crea algo, al aplicar se pide desbloquear (RF-34).
- **Pasar a borrador en la variante:** la ficha no existe hasta aplicar. «Abrir en Obsidian» de esa pieza dice «La ficha se crea al aplicar».
- **«Abrir en Obsidian» de una pieza de la variante:** abre la nota de la serie (lo de ahora) y lo dice: «En Obsidian ves ahora, no la variante».
- **Cambios de fuera durante la variante:** las piezas que la variante no toca se ven al día; las que toca pasan a choque (RF-28).
- **La nota de la variante cambia fuera de Atelier** (a mano o desde el otro equipo): se relee. Si es la abierta, se cierra y se vuelve a abrir con lo leído, y se avisa; lo que no se había guardado todavía no se pisa y se dice, como hoy con las piezas (spec 002).
- **Dos equipos:** abrir la serie en los dos a la vez ya tiene su aviso (spec 001). La variante abierta en un equipo se ve aparcada en el otro.
- **Conflicto de sincronización en una variante:** se avisa como los conflictos de hoy, y esa variante no se abre ni se aplica hasta resolverlo.
- **Restaurar una instantánea** (fuera de la variante): no toca las variantes. Las que tocaban piezas restauradas pasan a tener choques.
- **Instantánea de antes de aplicar:** como hoy, no guarda la wiki ni `Log.md`, y de las automáticas solo se guardan las 20 últimas.
- **Deshacer un «Aplicar»:** la variante vuelve a aparcada y se puede aplicar otra vez (RF-38).
- **Pieza aparcada o descartada dentro de la variante:** cambiar su estado es diferencia (RF-8 de la spec 005); sus avisos dejan de contar en «Avisos que saltarían», como en la 005.
- **Panel estrecho:** frases en varias líneas; «Lado a lado» en ventana, no en el panel.

## Fuera de alcance
- Comparar dos variantes entre sí (decisión del autor: se compara «Ahora» con una variante).
- Elegir campo a campo qué se queda al chocar (decisión del autor: «Traer lo de ahora» y decidir editando).
- Aplicar solo una parte de la variante: lo que no se quiere se quita (RF-24) y se aplica el resto.
- Variantes de la guía, o copiar la serie entera como carpeta aparte.
- Lo discontinuo de acento en vistas que no son el visor (Tramas, rejilla, línea de la historia), y los tramos de arcos y secretos: con la entrega 5, que es la que los dibuja.
- Generar variantes con IA (docs/prd.md › Para más adelante).

## Criterios de finalización
- Cada RF tiene su test en verde o su prueba en la interfaz, según la decisión de tests ligeros de la 003.
  - Con test, la lógica:
    - «Cómo quedaría» y las diferencias;
    - el guardado de la variante y el deshacer dentro de ella;
    - los tres tipos de choque, «Traer lo de ahora» y «Pisa lo de ahora»;
    - «Quitar de la variante» con lo contenido y la renumeración;
    - aplicar entero o nada, también con canon, con la wiki y con fallos a medias, y su deshacer y rehacer;
    - descartar y recuperar;
    - leer variantes rotas o manipuladas.
  - En la interfaz, lo visual.
- La v1.0 abre igual la serie con variantes guardadas y lee lo que escribe «Aplicar» (lector de la v1.0).
- Prueba a mano del autor, en `_prueba` y sin manual:
  - «¿Y si…?», cambiar un episodio y mover una escena, «Ver ahora» y volver, aparcar, cerrar la app y abrirla otra vez;
  - «Probar otra versión» dos veces en la misma pieza y elegir una con «Aplicar»; luego Ctrl Z, y aplicarla otra vez;
  - cambiar en Obsidian una pieza que toca una variante aparcada, ver el choque y «Traer lo de ahora»;
  - descartar con un porqué y recuperar.
- `docs/diseno.md` y `docs/inventario-v1.md` al día.
- `npm run verificar` en verde y revisión de seguridad sin críticos.

## Dudas resueltas
1. Una variante es las dos cosas: un modo sobre toda la serie y versiones de una pieza (decisión del autor).
2. Hay un solo mecanismo con dos puertas: «¿Y si…?» en la barra y «Probar otra versión» en la pieza. Las versiones son variantes aparcadas (RF-3, RF-4).
3. Aplicar con choques no aplica: enseña qué choca y ofrece «Traer lo de ahora» (RF-28 a RF-33).
4. Se puede probar todo, también borradores y canon. La wiki solo se toca al aplicar, y el canon pide desbloquear (RF-8, RF-11, RF-34).
5. Descartar marca y se recupera; lo aplicado queda como historial (RF-41 a RF-44).
6. Se compara «Ahora» frente a la variante, no dos variantes entre sí (RF-14 a RF-24).
7. Decidido sin preguntar (se puede vetar):
   - la variante se guarda en la vault como nota Markdown, por la constitución 1 (RF-9);
   - una sola variante abierta a la vez; abrir otra aparca la de antes (RF-6);
   - no se pide nombre al crear: se pone uno con la fecha, que se cambia en la barra (RF-2, RF-2b);
   - mientras se ve «Ahora» no se cambia nada (RF-15);
   - la variante tiene su propio deshacer, que vive mientras está abierta. «Aplicar» es un paso del deshacer de la serie (RF-10, RF-38);
   - instantánea automática antes de aplicar (RF-36);
   - lo que no es de piezas (guía, instantáneas, papelera, otra serie) espera a salir de la variante (RF-12);
   - una variante sin cambios no deja rastro (RF-26);
   - al abrir la app, la variante que estaba abierta queda aparcada (RF-27).
8. Tras la revisión QA (decisiones mías, se pueden vetar):
   - Ctrl I apunta siempre en la serie, también dentro de una variante. Así la captura rápida nunca se queda atrapada (RF-8b);
   - un choque es cualquier cambio en la nota, también en lo que la app no enseña. Hay choques de pieza, de sitio y de referencia (Definiciones, RF-28);
   - con «Traer lo de ahora», lo cambiado en los dos lados se queda como en la variante, pero se marca «Pisa lo de ahora» y lo dice la confirmación (RF-30, RF-30c);
   - aplicar siempre confirma con un resumen (RF-32);
   - la wiki se pone al día después de las notas. Si falla, lo que no se puede deshacer en la wiki se dice, como hoy (RF-37b). Lo que la wiki impide se comprueba antes de aplicar (RF-34b);
   - deshacer un «Aplicar» deja la variante otra vez aparcada (RF-38);
   - «Quitar de la variante» se lleva lo que depende de la pieza, avisando antes (RF-24b);
   - los botones de la barra dicen «Aparcar variante» y «Descartar variante», para no confundirlos con los estados de las piezas;
   - los tramos de arcos y secretos en el visor quedan para la entrega 5.

## Dudas abiertas
Ninguna.
