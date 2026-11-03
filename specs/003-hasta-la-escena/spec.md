# Spec 003 — Hasta la escena (entrega 3)

> Solo el QUÉ y el POR QUÉ. Nada de tecnología, archivos ni esquemas: eso va en plan.md.
> Estado: aprobada (2026-10-20). Revisada por QA independiente (32 puntos, recogidos).

## Contexto y objetivo
Con la spec 002 el autor baja en el visor de la serie a una temporada y a un episodio, y en el episodio ve sus eventos en fila. La v1 ya guarda en cada evento su acto (teaser, inicio, desarrollo, desenlace), su orden en el episodio y su cambio de valor (+ → −), y en cada episodio el resumen de sus actos; el episodio, el evento y los secretos ya se editan en el panel (G5 y G6 del inventario). Lo que falta es **ver y ordenar el episodio por dentro**:
- en el nivel episodio, el visor enseña **una columna por acto** con sus escenas, y una curva fina con el cambio de valor de cada escena;
- las escenas se **mueven** entre actos y de puesto, con el ratón y con el teclado, y el orden del episodio sigue a los actos;
- mirando una temporada, la **bandeja** (escenas sin episodio, donde caen las ideas) sale en el visor y sus escenas se arrastran a un episodio.

Decide además la duda del PRD: **una escena es un evento de la v1**, tal cual, y la interfaz de la v2 la llama «escena» (la v1.0 sigue diciendo «evento»).

## Usuarios
El autor, en su PC con Windows y en su Mac Intel.

## Historias de usuario
- H1: Como autor quiero ver un episodio por actos para saber de un vistazo qué pasa en cada parte y si alguna está vacía o sobrecargada.
- H2: Como autor quiero mover una escena a otro acto o cambiar su puesto sin abrir formularios, para probar estructuras rápido.
- H3: Como autor quiero ver cómo sube y baja el valor a lo largo del episodio para detectar escenas que no cambian nada.
- H4: Como autor quiero llevar las ideas de la bandeja a su episodio desde el visor para no perderlas.
- H5: Como autor quiero que todo esto lo siga viendo la v1.0 igual.

## Requisitos funcionales (EARS)

### Escena = evento
- RF-1: EL SISTEMA tratará cada escena como un evento de la v1, sin campos nuevos: su acto, su orden en el episodio, su cambio de valor y el resto de sus datos son los de la v1.
- RF-2: EL SISTEMA llamará «escena» y «escenas» a los eventos en todos los textos que escribe la v2 (visor, «Nuevo…», panel, Episodios, bandeja, confirmaciones, avisos y mensajes de las comprobaciones), sin cambiar los nombres de los campos ni de las carpetas en disco. Sustituye, solo para esta palabra, al requisito de la 002 «la interfaz usa los nombres de la v1».
- RF-3: EL SISTEMA no reescribirá la palabra «evento» donde la escribió el autor: su guía de escritura y el texto de sus notas se quedan como están.

### Orden del episodio
- RF-4: EL SISTEMA considerará que el orden de los actos es Teaser, Inicio, Desarrollo, Desenlace y, al final, Sin acto.
- RF-5: CUANDO el autor mueva una escena (RF-17 a RF-19) o cree una escena en un acto (RF-37), EL SISTEMA dejará el orden del episodio entero siguiendo a los actos (RF-4), conservando dentro de cada acto el orden que tenían sus escenas, y reescribirá solo las notas cuyo número, acto o episodio cambien.
- RF-6: MIENTRAS el autor no mueva ni cree nada en un episodio, EL SISTEMA no cambiará su orden, aunque esté cruzado con los actos (por ejemplo, editado en la v1 o en Obsidian).

### Visor en el nivel episodio
- RF-7: MIENTRAS el visor esté en el nivel episodio, EL SISTEMA mostrará cuatro columnas fijas, Teaser, Inicio, Desarrollo y Desenlace, en ese orden, aunque alguna esté vacía.
- RF-8: SI el episodio tiene escenas sin acto, ENTONCES EL SISTEMA mostrará al final una quinta columna «Sin acto» con ellas; si no tiene ninguna, no la mostrará, salvo mientras se esté arrastrando una escena que salió de ella.
- RF-9: EL SISTEMA mostrará en la cabecera de cada columna de acto su nombre, su número de escenas y el resumen de ese acto escrito en el episodio, recortado a dos líneas (nada si no lo hay).
- RF-10: EL SISTEMA mostrará dentro de cada columna sus escenas en el orden que tienen en el episodio, cada una como una tarjeta con su número dentro del episodio, su título recortado a dos líneas, la marca de su estado, su cambio de valor (+ → −) y el número de avisos de la guía (sin sugerencias ni lo silenciado), con lo aparcado atenuado y lo descartado tachado, siempre con texto además del color.
- RF-11: SI una escena empieza y acaba con el mismo valor, ENTONCES EL SISTEMA lo dirá en su tarjeta con el texto «Empieza y acaba igual».
- RF-12: SI una columna de acto no tiene escenas, ENTONCES EL SISTEMA dirá en ella «Aún no hay escenas» junto a un botón «+ Escena»; las columnas con escenas tendrán también su «+ Escena» al final.
- RF-13: CUANDO el autor pulse «+ Escena» en una columna, EL SISTEMA abrirá la ventana «Nueva pieza» de escena con ese acto ya elegido.
- RF-14: CUANDO el autor pinche una escena, o la enfoque y pulse Intro, EL SISTEMA la elegirá en el panel sin cambiar de nivel.
- RF-15: EL SISTEMA dejará recorrer el nivel episodio con el teclado: Tab y Mayús Tab pasan por cada tarjeta y cada botón en orden de lectura (acto a acto, de arriba abajo); las flechas arriba y abajo pasan de una tarjeta a otra dentro del acto, y las flechas izquierda y derecha, a la tarjeta del mismo puesto (o la última) del acto de al lado, o a su «+ Escena» si está vacío.
- RF-16: EL SISTEMA enseñará debajo de los actos una curva fina con un tramo por escena, en el orden del episodio, que va de su valor al empezar a su valor al acabar (+ arriba, − abajo); la escena que empieza y acaba igual se marca con el color de aviso y una forma distinta, y la que no tiene alguno de los dos valores deja un hueco. La curva es un apoyo visual: la misma información está en texto en cada tarjeta (RF-10, RF-11).

### Mover escenas en el nivel episodio
- RF-17: CUANDO el autor arrastre una tarjeta a otra posición de su acto o a otro acto del mismo episodio (también a «Sin acto» si está visible), EL SISTEMA le pondrá ese acto, la dejará en ese puesto y guardará el cambio.
- RF-18: CUANDO el autor pulse Alt + flecha arriba o abajo con una tarjeta enfocada, EL SISTEMA subirá o bajará la escena un puesto dentro de su acto.
- RF-19: CUANDO el autor pulse Alt + flecha izquierda o derecha con una tarjeta enfocada, EL SISTEMA pasará la escena al final del acto anterior o siguiente entre Teaser y Desenlace; desde Sin acto, Alt + flecha izquierda la pasa al final de Desenlace. Alt + flecha derecha desde Desenlace no hace nada.
- RF-20: SI la escena ya está en el primer o el último puesto, o en Teaser, ENTONCES EL SISTEMA no hará nada con la tecla que la sacaría de ahí.
- RF-21: SI el autor mantiene pulsada la tecla, ENTONCES EL SISTEMA hará un solo movimiento por pulsación, sin repetir.
- RF-22: CUANDO se mueva una escena, EL SISTEMA mantendrá el foco en su tarjeta y anunciará con texto dónde ha quedado, con su número nuevo («Escena 4 · Desarrollo, 2.ª»).
- RF-23: SI la escena es canon bloqueada o su episodio es canon bloqueado, ENTONCES EL SISTEMA no la dejará mover, ni arrastrando ni con el teclado, y dirá «La escena es canon: desbloquéala para moverla» o «El episodio es canon: desbloquéalo para cambiar sus escenas».
- RF-24: EL SISTEMA aplicará la misma regla de RF-23 al cambiar el acto o el episodio de una escena desde el panel o desde Episodios: no se mete, se saca ni se reordena una escena en un episodio canon bloqueado.
- RF-25: EL SISTEMA permitirá cambiar el número de escenas canon vecinas cuando el orden del episodio se rehace al mover otra (como en la spec 001).
- RF-26: CUANDO el autor suelte una tarjeta fuera de las columnas del visor, en su mismo sitio, o pulse Esc mientras arrastra, EL SISTEMA no cambiará nada; ese Esc no sube de nivel.
- RF-27: EL SISTEMA solo aceptará en el visor escenas de la serie abierta arrastradas desde el propio visor, y no aceptará en Episodios ni en otras zonas las tarjetas arrastradas desde el visor.
- RF-28: CUANDO se mueva una escena, Ctrl Z fuera de un campo deshará el movimiento entero en un solo paso.

### Bandeja en el nivel temporada
- RF-29: MIENTRAS el visor esté en el nivel temporada, EL SISTEMA mostrará después de los episodios una columna «Bandeja» con las escenas de esa temporada que no están en ningún episodio (también las de un episodio que ya no existe), en su orden, y cuántas son.
- RF-30: SI la bandeja está vacía, ENTONCES EL SISTEMA dirá en su columna «Bandeja vacía · las ideas caen aquí».
- RF-31: CUANDO el autor arrastre una escena de la bandeja a la columna de un episodio, EL SISTEMA la pondrá en ese episodio al final de su acto (RF-5) y guardará el cambio.
- RF-32: CUANDO el autor pinche una escena de la bandeja, o la enfoque y pulse Intro, EL SISTEMA la elegirá en el panel sin cambiar de nivel; desde el panel se le puede elegir episodio con el teclado, como en la v1.
- RF-33: SI la escena de la bandeja es canon bloqueada o el episodio de destino es canon bloqueado, ENTONCES EL SISTEMA no la moverá y lo dirá como en RF-23.
- RF-34: EL SISTEMA dejará de mostrar la bandeja en la vista Temporada de la v1 (la del visor la sustituye); en Episodios sigue como en la v1.

### Crear escenas
- RF-35: MIENTRAS el visor esté en el nivel episodio, EL SISTEMA ofrecerá en «Nuevo…» «Escena» e «Idea».
- RF-36: DONDE la pieza sea una escena, EL SISTEMA dejará elegir en la ventana «Nueva pieza» su acto (Teaser, Inicio, Desarrollo, Desenlace o Sin acto), con «Sin acto» por defecto salvo que se abra desde una columna (RF-13).
- RF-37: CUANDO el autor cree una escena, EL SISTEMA la pondrá al final de su acto en el episodio (RF-5), en estado idea, y la elegirá en el panel.
- RF-38: EL SISTEMA guardará las ideas capturadas con Ctrl I mirando un episodio sin acto, al final del episodio, como en la spec 002, sin reordenar el resto, y saldrán en «Sin acto».

### La wiki
- RF-39: SI el episodio ya tiene ficha en la wiki y el orden o los actos de sus escenas ya no coinciden con la escaleta de esa ficha, ENTONCES EL SISTEMA dirá en el panel del episodio «La escaleta de la wiki no está al día» con el enlace para abrir la ficha en Obsidian, y no tocará la ficha.

### Lo que sigue igual
- RF-40: EL SISTEMA mantendrá sin cambios lo que la v1 ya hace con el episodio, la escena y los secretos en el panel y en Episodios (campos, trama dominante, paradas abre · avanza · gira · cierra, pistas, regla de spoilers), salvo el nombre «escena» (RF-2) y la regla de canon de RF-24.

### Lo que sustituye de la spec 002
- RF-41: Esta spec sustituye, en el nivel episodio, a los RF-4, RF-7, RF-10 (para episodios), RF-12 y RF-13 (para el nivel episodio), RF-26 (episodio: «Escena» en lugar de «Evento») y RF-32 (la escena va al final de su acto) de la 002.

## Requisitos no funcionales
- Rendimiento: con un episodio de 40 escenas, bajar a él, subir o mover una escena se ve en menos de 100 ms (sin contar la animación). El cambio queda escrito en el disco en menos de 2 s.
- Compatibilidad con la v1.0 (constitución 9): mover y crear escenas solo cambian campos que la v1 ya tiene (acto, orden, episodio, temporada); la v1.0 lee y conserva todo. Se prueba con su lector congelado. La v1.0 no tiene vista por actos: se comprueba escena a escena (acto y número).
- Integridad de la vault (constitución 2):
  - Mover una escena puede cambiar varias notas: SI alguna de ellas cambió fuera de Atelier, ENTONCES no se mueve nada, se relee lo de fuera y se avisa (como crear en la spec 002).
  - SI una nota no se puede escribir después (disco, sincronización), ENTONCES se reintenta y se avisa como en cualquier guardado de la v1; lo ya escrito no se pisa con versiones viejas.
  - Deshacer un movimiento no restaura las notas que cambiaron fuera entretanto, y lo dice (como en la 002).
  - SI una escena tiene en su acto o en su cambio de valor algo que la app no conoce (escrito a mano), ENTONCES la escena sale en «Sin acto» o sin cambio, y ese valor se conserva tal cual al guardarla o al renumerarla; solo se sustituye si el autor le pone un acto o un cambio.
- Accesibilidad: todo lo que se hace arrastrando se puede hacer con el teclado (los actos con Alt + flechas; la bandeja, desde el panel); el texto llega a 4,5:1 en los dos temas; el color nunca es la única señal.
- Atajos: Alt + flechas no hacen nada más en la app (por ejemplo, ir atrás o adelante en la ventana).
- Intuitiva sin manual: ver un episodio por actos, mover una escena y llevar una idea de la bandeja a un episodio se hacen sin leer instrucciones.
- Idioma: español.

## Datos personales
Ninguno. Solo notas de ficción del autor.

## Casos límite
- Episodio sin escenas: las cuatro columnas dicen «Aún no hay escenas» con su «+ Escena»; la curva no sale.
- Episodio canon bloqueado: las columnas se ven, «+ Escena» está desactivado con su porqué y no se puede mover nada (RF-23); las ideas van a la bandeja (spec 002).
- Orden cruzado con los actos (la 1.ª en Desenlace y la 2.ª en Inicio): cada una sale en su acto con su número de ahora; al primer movimiento, el episodio entero queda ordenado por actos (RF-5, RF-6).
- Escenas con números repetidos o sin número (notas hechas a mano): salen en un orden estable; al primer movimiento se numeran de nuevo 1, 2, 3…
- Muchas escenas en un acto o en la bandeja (20-30): la columna crece hacia abajo sin desplazar la página en horizontal; el visor se desplaza en horizontal si no caben las columnas.
- Mover una escena mientras se edita en el panel: lo escrito se guarda y la escena sigue elegida.
- La escena o el episodio desaparecen mientras se arrastra (borrado fuera): se suelta sin hacer nada y el visor se pone al día.
- Escena descartada o aparcada: se ve atenuada o tachada en su acto y se puede mover igual.
- Arrastrar texto o un fichero desde fuera de la app al visor: no hace nada (RF-27).

## Fuera de alcance
- Un nivel más por debajo de la escena, o el acto como nivel propio del visor: la escena se elige y se edita en el panel.
- Cambiar los actos posibles o añadir estructuras (tres actos, Story Circle, Save the Cat: entrega 6).
- Mover episodios o temporadas desde el visor (se sigue haciendo en Serie y Temporada, como en la v1).
- Arrastrar escenas entre episodios en el nivel episodio, o de un episodio a la bandeja desde el visor (se hace en Episodios o en el panel, como en la v1).
- «+ Escena» en la bandeja del visor (se apunta con «Idea»).
- Reescribir la ficha de la wiki al mover escenas (RF-39 solo avisa).
- «Si lo dejas así…», resaltar lo afectado y «¿Y si…?» (entrega 4).
- Formato nuevo de notas o carpeta nueva: las escenas siguen en la carpeta de eventos de la v1.

## Criterios de finalización
- Cada RF con su test en verde (la lógica) o con su prueba en la interfaz (lo visual).
- Test de compatibilidad con la v1.0 en verde con escenas movidas de acto y de puesto, llevadas de la bandeja a un episodio, y con valores de acto desconocidos conservados.
- Prueba a mano del autor: abrir un episodio de `_prueba`, mover tres escenas (dos con el ratón, una con el teclado), llevar una idea de la bandeja a un episodio y ponerla en su acto, sin manual; abrir después la serie en la v1.0 y ver los actos y el orden iguales.
- `npm run verificar` en verde y revisión de seguridad sin críticos.

## Dudas resueltas
1. Escena = evento de la v1 (RF-1). 2. «Escena» en toda la interfaz de la v2 (RF-2). 3. Una columna por acto (RF-7). 4. Mover con arrastrar y con teclado (RF-17 a RF-19). 5. Curva de valor en el visor (RF-16). 6. Teaser siempre visible (RF-7). 7. Bandeja en el visor de la temporada, con arrastrar a un episodio (RF-29, RF-31).
8. El orden del episodio sigue a los actos al mover o crear (RF-5). 9. La bandeja sale solo en el visor, no en la vista Temporada (RF-34). 10. Escaleta de la wiki desfasada: aviso con enlace a Obsidian, sin tocar la ficha (RF-39; la app nunca sobrescribe una ficha que ya existe).
11. Decidido sin preguntar: «Sin acto» solo si hay escenas sin acto (RF-8); las ideas de Ctrl I entran sin acto (RF-38); «Sin acto» por defecto en la ventana (RF-36); Alt + flechas para mover (RF-18, RF-19); canon igual en visor, panel y Episodios (RF-24); valores desconocidos conservados (RNF integridad).

## Dudas abiertas
- Ninguna.
