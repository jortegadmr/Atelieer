# Spec 002 — De arriba abajo (entrega 2)

> Solo el QUÉ y el POR QUÉ. Nada de tecnología, archivos ni esquemas: eso va en plan.md.
> Estado: aprobada (2026-10-20). Revisada por QA independiente; decisiones del autor recogidas.

## Contexto y objetivo
El autor quiere plantear la serie de lo general a lo particular sin perder de vista el conjunto. La v1 ya tiene las vistas Serie, Tramas, Temporada y Episodios (la rejilla), pero son pantallas sueltas. Esta entrega añade tres cosas:
- un **visor con zoom**, siempre arriba, que enseña la serie entera y deja bajar (serie › temporada › episodio) y subir;
- una barra **«Nuevo…»** con lo que se puede crear en el nivel donde está el autor;
- una **captura rápida de ideas**: una frase, Intro, y queda guardada.

Confirma además que «trama» es el arco de la v1, tal cual (docs/prd.md).

## Usuarios
El autor, en su PC con Windows y en su Mac Intel.

## Historias de usuario
- H1: Como autor quiero ver siempre la serie entera arriba para saber dónde estoy dentro de ella.
- H2: Como autor quiero bajar de la serie a una temporada y a un episodio pinchando, y subir con la miga de pan o con Esc, para moverme sin perderme.
- H3: Como autor quiero crear en cada nivel justo lo que tiene sentido ahí para no buscar dónde se crea cada cosa.
- H4: Como autor quiero apuntar una idea en segundos, sin rellenar nada, para que no se me escape.
- H5: Como autor quiero que las ideas caigan donde estoy mirando y que la v1.0 también las vea.

## Requisitos funcionales (EARS)

### Visor: qué enseña
- RF-1: MIENTRAS haya una serie abierta, EL SISTEMA mostrará el visor arriba en todas sus vistas.
- RF-2: MIENTRAS el visor esté en el nivel serie, EL SISTEMA mostrará una columna por temporada, en orden de emisión.
- RF-3: MIENTRAS el visor esté en el nivel temporada, EL SISTEMA mostrará una columna por episodio de esa temporada, en orden.
- RF-4: MIENTRAS el visor esté en el nivel episodio, EL SISTEMA mostrará una columna por evento de ese episodio, en orden.
- RF-5: EL SISTEMA mostrará en cada columna de temporada: su código y título, la marca de su estado (los seis de la spec 001), si está prevista, en marcha o cerrada, su carga al empezar y al acabar (+ → −), su número de episodios y su logline recortada a dos líneas.
- RF-6: EL SISTEMA mostrará en cada columna de episodio: su código y título, la marca de su estado, su estado de escritura (idea, escaleta, guion), su carga al empezar y al acabar, su trama dominante (nombre y color) y su idea central recortada a dos líneas.
- RF-7: EL SISTEMA mostrará en cada columna de evento: su número dentro del episodio, su título recortado a dos líneas, la marca de su estado y su cambio de valor (+ → −).
- RF-8: SI la guía marca avisos en esa pieza (sin contar las sugerencias ni lo silenciado con «Lo sé»), ENTONCES EL SISTEMA mostrará en su columna el número de avisos.
- RF-9: EL SISTEMA mostrará en el visor lo aparcado atenuado y lo descartado tachado, como en el resto de la app (spec 001), siempre con un texto o una marca además del color.
- RF-10: SI el nivel actual no tiene piezas, ENTONCES EL SISTEMA dirá «Aún no hay temporadas / episodios / eventos» junto al botón para crear la primera; en una temporada sin episodios con episodios previstos, dirá también cuántos hay previstos.

### Visor: moverse
- RF-11: CUANDO el autor pinche una columna de temporada o de episodio, o la elija con el teclado y pulse Intro, EL SISTEMA bajará a ese nivel y elegirá esa pieza en el panel.
- RF-12: CUANDO el autor pinche una columna de evento, o la elija con el teclado y pulse Intro, EL SISTEMA elegirá ese evento en el panel sin cambiar de nivel.
- RF-13: EL SISTEMA dejará recorrer las columnas con Tab y con las flechas.
- RF-14: EL SISTEMA mostrará en la barra superior la miga de pan del nivel actual (`Serie › T01 › E03`) en el sitio de la de la v1, y CUANDO el autor pinche uno de sus tramos, subirá a ese nivel.
- RF-15: CUANDO el autor pulse Esc sin nada abierto (una confirmación, la búsqueda, la captura, la ventana «Nueva pieza», un menú) y sin estar escribiendo en un campo, EL SISTEMA subirá un nivel. Tener una pieza elegida en el panel no cuenta como algo abierto.
- RF-16: SI al pulsar Esc hay algo abierto, ENTONCES EL SISTEMA lo cerrará y no subirá de nivel.
- RF-17: SI al pulsar Esc el autor está escribiendo en un campo, ENTONCES EL SISTEMA saldrá del campo, guardará lo escrito como siempre y no subirá de nivel.
- RF-18: MIENTRAS el visor esté en el nivel serie, EL SISTEMA no subirá al pulsar Esc.
- RF-19: CUANDO el visor cambie de nivel, EL SISTEMA lo animará en 0,22 s, salvo que el sistema operativo pida reducir el movimiento, en cuyo caso cambiará sin animación.
- RF-20: CUANDO el visor cambie de nivel, EL SISTEMA enseñará debajo la vista de la v1 de ese nivel: Serie en el nivel serie, Temporada de esa temporada en el nivel temporada y Episodios (la rejilla) de su temporada, con la columna de ese episodio marcada y a la vista, en el nivel episodio.
- RF-21: CUANDO el autor cambie de vista o de temporada con los pasos de la barra superior o con el selector de temporada de la v1, EL SISTEMA llevará el visor al nivel que corresponde (Serie: nivel serie; Temporada o Episodios de T02: nivel temporada T02).
- RF-22: CUANDO el autor abra Tramas o Wiki, EL SISTEMA mantendrá el visor en el nivel donde estaba; SI entonces sube o baja con el visor, ENTONCES EL SISTEMA enseñará debajo la vista de ese nivel (RF-20).
- RF-23: CUANDO el autor abra una serie, EL SISTEMA pondrá el visor en el nivel serie.
- RF-24: SI la pieza del nivel actual deja de existir (borrada, mandada a la papelera, renombrada fuera, deshecha su creación) o se mueve a otra temporada, ENTONCES EL SISTEMA subirá al primer nivel que siga siendo válido, sin errores.
- RF-25: CUANDO una pieza del visor cambie (en la app o desde fuera), EL SISTEMA pondrá al día su columna.

### Nuevo…
- RF-26: EL SISTEMA mostrará bajo el visor la barra «Nuevo…» con lo que se puede crear en el nivel actual:
  - serie: temporada, trama, secreto e idea;
  - temporada: episodio, trama de temporada, secreto e idea;
  - episodio: evento e idea.
- RF-27: CUANDO el autor pulse «Idea» en la barra, EL SISTEMA abrirá la captura rápida (RF-36), igual que «+ Idea».
- RF-28: CUANDO el autor pulse cualquier otra pieza de la barra, EL SISTEMA abrirá dentro de la app la ventana «Nueva pieza» con un título opcional, dónde se guardará (la mesa) y su estado inicial (idea), y los botones Cancelar y Crear.
- RF-29: DONDE la pieza sea una trama, EL SISTEMA dejará elegir en la ventana su tipo (trama, personaje o relación), con trama por defecto.
- RF-30: DONDE la pieza sea una trama de temporada, EL SISTEMA dejará elegir en la ventana entre una trama nueva de esa temporada o un tramo en esa temporada de una trama de serie (lista de las tramas de serie).
- RF-31: CUANDO el autor pulse Crear, EL SISTEMA creará la pieza en estado idea, sin exigir ningún campo, cerrará la ventana y la elegirá en el panel.
- RF-32: EL SISTEMA colocará la pieza nueva en el nivel actual: la temporada, al final de la serie; el episodio, al final de su temporada; el evento, al final de su episodio; la trama de temporada y el tramo, en la temporada actual; la trama de serie, en la serie; el secreto, como un secreto de la serie (los secretos no tienen temporada en la v1).
- RF-33: SI crear la pieza cambiaría lo que contiene una pieza canon bloqueada (un episodio en una temporada canon, un evento en un episodio canon), ENTONCES EL SISTEMA tendrá ese botón desactivado y dirá al lado, con texto visible, «Es canon: desbloquéala para añadir».
- RF-34: MIENTRAS la pieza canon esté desbloqueada (spec 001, RF-30), EL SISTEMA tendrá el botón activo.
- RF-35: SI el autor cierra la ventana con Cancelar o Esc, ENTONCES EL SISTEMA no creará nada.

### Captura rápida de ideas
- RF-36: CUANDO el autor pulse «+ Idea» o el atajo Ctrl I (Cmd I en el Mac), también con el cursor en un campo, EL SISTEMA abrirá un campo de una línea con el cursor dentro.
- RF-37: MIENTRAS no haya una serie abierta, EL SISTEMA no hará nada con el atajo; MIENTRAS la captura esté abierta, el atajo la dejará como está.
- RF-38: CUANDO el autor pulse Intro con texto en la captura, EL SISTEMA guardará la idea como un evento en estado idea, con ese texto como título, y cerrará la captura.
- RF-39: EL SISTEMA pondrá la idea según el nivel en el momento de pulsar Intro:
  - mirando un episodio que no es canon bloqueado: al final de ese episodio;
  - mirando un episodio canon bloqueado: en la bandeja de su temporada;
  - mirando una temporada (canon o no): en su bandeja;
  - mirando la serie: en la bandeja de la temporada en marcha o, si no hay ninguna en marcha, de la última.
- RF-40: SI mirando la serie no hay ninguna temporada, ENTONCES EL SISTEMA no guardará la idea, dejará el texto en la captura y dirá «Crea primero una temporada».
- RF-41: SI el texto está vacío o solo tiene espacios, ENTONCES EL SISTEMA no creará nada y cerrará la captura.
- RF-42: CUANDO el autor pulse Esc en la captura, EL SISTEMA la cerrará sin crear nada.
- RF-43: CUANDO se guarde la idea, EL SISTEMA dirá dónde ha ido («Idea en la bandeja de T01») con un botón Deshacer, y Ctrl Z fuera de un campo también la deshará (a la papelera, como cualquier pieza).
- RF-44: EL SISTEMA guardará el texto tal cual, también con dos puntos, comillas, `---`, `#` o `[[...]]`, sin romper la nota y de forma que la v1.0 lo lea igual.
- RF-45: SI el texto pegado tiene saltos de línea o caracteres de control, ENTONCES EL SISTEMA los cambiará por espacios.
- RF-46: SI el texto tiene más de 300 caracteres, ENTONCES EL SISTEMA guardará los 300 primeros como título y avisará «Recortada a 300 caracteres».

### Tramas
- RF-47: EL SISTEMA tratará «trama» como el arco de la v1, sin cambios: tipo trama, personaje o relación; A, B o C; de serie o de temporada, con tramos.

## Requisitos no funcionales
- Rendimiento: con 5 temporadas × 10 episodios × 300 eventos, bajar o subir de nivel tarda menos de 100 ms sin contar la animación. Una idea queda escrita en el disco en menos de 2 s después de Intro (el PRD pide menos de 10 s de la cabeza a la vault).
- Compatibilidad con la v1.0 (constitución 9): todo lo que se crea en esta entrega lo lee, lo enseña y lo conserva la v1.0. Se prueba con su lector congelado, también la idea deshecha (en la papelera) y los títulos con caracteres raros (RF-44).
- Integridad de la vault (constitución 2): crear una pieza que cambia la nota de la serie o de una temporada usa la misma escritura segura de la v1 y la spec 001: si esa nota cambió fuera o hay conflicto de sincronización, se avisa y no se pisa.
- Nada nuevo se guarda en `appDatos/` salvo las piezas: el nivel del visor no se recuerda entre sesiones (RF-23).
- Intuitiva sin manual: bajar, subir, crear y apuntar una idea se hacen sin leer instrucciones (lista de pruebas a mano del autor).
- Accesibilidad: todo se puede hacer con el teclado, también llegar a los botones desactivados y leer por qué lo están; el texto del visor llega a 4,5:1 en los dos temas; el color nunca es la única señal.
- Idioma: español. La interfaz usa los nombres de la v1: Serie, Tramas, Temporada, Episodios.

## Datos personales
Ninguno. Solo notas de ficción del autor.

## Casos límite
- Serie sin temporadas: el visor dice «Aún no hay temporadas» y ofrece crear la primera (RF-10); la captura pide crear una temporada (RF-40).
- Temporada canon sin episodios: «Aún no hay episodios» y, al lado del botón desactivado, «Es canon: desbloquéala para añadir» (RF-33).
- Temporada o episodio aparcados o descartados: se puede crear dentro; lo nuevo nace en idea y cuenta en las comprobaciones como cualquier idea.
- La pieza del nivel actual desaparece o cambia de temporada mientras la captura está abierta: al pulsar Intro, la idea va donde diga el nivel válido en ese momento (RF-24, RF-39).
- Muchas columnas (20 episodios, 40 eventos): el visor se desplaza en horizontal sin que se desplace la página entera.
- Títulos o frases muy largos: se recortan con «…» en la columna; el texto completo sigue en el panel.
- Intro dos veces seguidas en la captura: se crea una sola idea.
- Esc con la captura o la ventana «Nueva pieza» abiertas: se cierran y no se sube de nivel (RF-16).
- Ctrl I fuera de las vistas de la serie (Inicio, sin serie abierta): no hace nada (RF-37).
- Ctrl Z justo después de capturar: el foco vuelve a donde estaba; si era un campo, Ctrl Z deshace en el campo y la idea se deshace con el botón Deshacer del aviso (RF-43).
- Serie abierta en otro equipo o con conflicto de sincronización: el visor funciona igual y los avisos de la spec 001 siguen saliendo; crear sigue las reglas de escritura segura (RNF).

## Fuera de alcance
- Actos y escenas en el visor, y bajar más allá del episodio (entrega 3). La duda «¿escena = evento?» se decide allí.
- El dibujo de la serie de la v1 (paradas de los arcos, curva de carga, secretos, bomba de tiempo, olvido) dentro del visor: sigue en las vistas de debajo, como en la v1.
- «Si lo dejas así…», resaltar lo afectado y atenuar lo demás en el visor (entrega 4).
- «¿Y si…?» con variantes, y «Buscar o crear» con Ctrl K (entrega 4).
- Vistas nuevas: tablero, línea de emisión, línea de la historia y mapa de arcos (entrega 5).
- Cambiar lo que hacen las vistas de la v1 por dentro. Solo se tocan para: quitar su miga de pan (la sustituye la del visor), seguir el nivel del visor (RF-20, RF-21) y marcar el episodio en Episodios.
- Una bandeja general sin temporada (la v1.0 no la enseña).
- Formato nuevo de notas: las ideas son eventos de la v1, y los secretos no ganan temporada.
- Completar el Story Circle de la temporada (◐ en el inventario).

## Criterios de finalización
- Cada RF con su test en verde (la lógica) o con su prueba en la interfaz (lo visual).
- Test de compatibilidad con la v1.0 en verde con piezas creadas desde «Nuevo…» y la captura, con títulos con caracteres raros.
- Prueba a mano del autor: bajar de la serie a un episodio, subir con Esc y con la miga, crear una pieza de cada tipo y apuntar tres ideas en tres niveles, sin manual; abrir después la serie en la v1.0 y ver las ideas en sus bandejas.
- `npm run verificar` en verde y revisión de seguridad sin críticos.

## Dudas resueltas
1. «Nuevo…» por nivel (RF-26). 2. Columnas con logline (RF-5 a RF-7). 3. Esc sube (RF-15). 4. La idea va al nivel actual (RF-39). 5. Visor arriba en todas las vistas (RF-1, RF-20). 6. Trama = arco de la v1 (RF-47).
7. Mirando la serie, la idea va a la temporada en marcha, no a una bandeja general (RF-39, RF-40).
8. En algo canon bloqueado: ideas sí (a la bandeja), lo demás pide desbloquear (RF-33, RF-39).
9. En el nivel episodio, debajo va Episodios con el episodio marcado (RF-20).
10. «Nuevo…» abre la ventana «Nueva pieza», como en el diseño (RF-28).
11. Decidido sin preguntar (técnico): atajo Ctrl I / Cmd I; el secreto creado en una temporada es un secreto normal; el nivel del visor no se recuerda entre sesiones; texto de idea hasta 300 caracteres.

## Dudas abiertas
- Ninguna.
