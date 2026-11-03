# Validación — Spec 003 Hasta la escena

> 2026-10-20, rama `003-hasta-la-escena`. `npm run verificar`: 53 archivos de tests, 520 tests en verde; `svelte-check` 0 errores y 0 avisos; compilación del frontal correcta. Sin cambios en `src-tauri/`.
> Navegador: `npm run dev` (serie de prueba en memoria), temas claro y oscuro. Desde T4, por decisión del autor, tests solo para lo que escribe en disco, toca canon o lo que lee la v1.0; la interfaz se comprueba en el navegador.

## Requisito → prueba → resultado
| RF | Prueba | Resultado |
|---|---|---|
| 1 | Sin campos nuevos: `actos.test.ts` › no toca nada más de la escena; `crudos.test.ts` | ✅ |
| 2 | T8: textos de visor, crear, panel, rejilla, bandeja, buscar y comprobaciones; `visor.test.ts` › «Aún no hay escenas». Búsqueda de «evento» en los textos: solo quedan los permitidos (commit de T8) | ✅ |
| 3 | `guia-md.test.ts` › la guía del autor sigue diciendo evento; nombres en disco sin tocar | ✅ |
| 4-6 | `actos.test.ts` › orden de los actos, mover en el mismo acto, a otro y a Sin acto, orden cruzado, números repetidos o 0, en su sitio nada, solo se guardan las que cambian | ✅ |
| 7-10 | `actos.test.ts` › cuatro actos siempre y Sin acto solo si hace falta, cabecera con nombre y resumen. Navegador: columnas, número de escenas, tarjetas con número, estado, cambio y avisos | ✅ |
| 11 | `actos.test.ts` › empieza y acaba igual; navegador: texto «Empieza y acaba igual» en la tarjeta | ✅ |
| 12, 13 | Navegador: «Aún no hay escenas» y «+ Escena» en cada columna; abre «Nueva escena» con el acto elegido. `estado-app.test.ts` › crear desde una columna | ✅ |
| 14 | Navegador: clic e Intro eligen la escena sin cambiar de nivel | ✅ |
| 15 | Navegador: flechas arriba y abajo dentro del acto; izquierda y derecha al acto de al lado o a su «+ Escena» si está vacío; Tab en orden de lectura | ✅ |
| 16 | `actos.test.ts` › tramos de la curva con huecos; navegador: curva `aria-hidden` debajo de los actos | ✅ |
| 17 | Navegador: arrastrar a Teaser deja la escena en Teaser, con la marca de destino | ✅ |
| 18-20 | `actos.test.ts` › bordes del teclado. Navegador: Alt + ← de Sin acto a Desenlace, Alt + → de Teaser a Inicio | ✅ |
| 21 | `Actos.svelte` ignora `e.repeat` (a mano en Tauri: ver «A mano») | ✅ |
| 22 | `actos.test.ts` › «Escena 4 · Desarrollo, 2.ª»; navegador: foco en la tarjeta y anuncio en la zona `aria-live` | ✅ |
| 23-25, 33 | `bloqueo-canon.test.ts` › 8 tests de canon por la estructura del episodio (entrar, salir, acto u orden, borrar o crear dentro, escena canon, vecinas canon en episodio libre, desbloqueado, editar el título); `estado-app.test.ts` › bloqueado: no mueve y dice por qué. Navegador: «La escena es canon: desbloquéala para moverla» | ✅ |
| 26 | Soltar en su sitio: `actos.test.ts` › nada que guardar. Esc no sube mientras `arrastrando` (`Carcasa.svelte`) | ✅ |
| 27 | Navegador: texto arrastrado desde fuera no se acepta; la rejilla no acepta la tarjeta (tipo propio sin `text/plain`) | ✅ |
| 28 | `estado-app.test.ts` › cada movimiento es un paso de deshacer | ✅ |
| 29, 30 | `actos.test.ts` › bandeja con las de episodios que ya no existen. Navegador: columna «Bandeja» con su número y «Bandeja vacía · las ideas caen aquí» | ✅ |
| 31 | `actos.test.ts` › de la bandeja a un episodio. Navegador: arrastrar una idea de la bandeja a E03 la deja al final de su acto, con la marca de destino | ✅ |
| 32 | Navegador: clic elige la escena de la bandeja; el panel le pone episodio como en la v1 | ✅ |
| 34 | Navegador: la vista Temporada ya no tiene bandeja; Episodios conserva la suya | ✅ |
| 35-37 | `crear.test.ts`; `actos.test.ts` › crear en un acto, al final de ese acto y en idea; `estado-app.test.ts` › crear desde la ventana. Navegador: selector de acto en «Nueva escena» | ✅ |
| 38 | `actos.test.ts` › la idea de Ctrl I no reordena | ✅ |
| 39 | `escaleta.test.ts` › recién pasada al día, desfasada tras mover a otro acto y tras cambiar el orden, plantilla vacía y ficha sin tablas. Navegador: pasar E01 a la wiki y mover una escena saca el aviso con el enlace | ✅ |
| 40 | Tests de la v1 sin cambios salvo los textos de RF-2 | ✅ |
| 41 | El nivel episodio de la 002 se sustituye por los actos | ✅ |
| RNF rendimiento | `actos.test.ts` › actos y mover con 40 escenas en menos de 100 ms. Escritura inmediata tras mover (`integridad-mesa.test.ts`) | ✅ (en Tauri: ver «A mano») |
| RNF compatibilidad | `actos.test.ts` › la v1.0 lee lo movido y lo creado; `crudos.test.ts` › la v1.0 lee el acto y el cambio escritos a mano como antes | ✅ |
| RNF integridad | `integridad-mesa.test.ts` › 5 tests nuevos: una nota cambiada fuera no mueve nada; un movimiento mientras se escribe el anterior; nota cambiada entre la comprobación y la escritura; escritura sin esperar; borrar y crear como antes. `crudos.test.ts` (11 tests): acto y cambio a mano se conservan y no resucitan | ✅ |
| RNF accesibilidad | Teclado para todo lo que se arrastra (Alt + flechas; bandeja desde el panel); contraste en el navegador: claro 7,0:1 y oscuro 5,9:1 en los textos secundarios de las columnas de acto; el color nunca es la única señal | ✅ |
| RNF atajos | Alt + flechas con `preventDefault` fuera de los campos (`Carcasa.svelte`) | ✅ (WebView2 y Mac: ver «A mano») |

## Desviaciones del plan
- `cambiadasFuera` toma lo conocido antes de leer, no después: si la vigilancia relee la nota mientras tanto, después de leer ya no se vería el cambio. Además, una pieza que cambia en el modelo durante la comprobación cuenta como cambiada fuera (la relectura llegó antes que la comprobación). Lo encontró un test de T2.

## Revisión de código y seguridad
Revisor independiente sobre el diff de la rama: 0 🔴, 4 🟡, 6 ⚪. Seguridad: sin hallazgos (sin `{@html}`, enlace `obsidian://` con `encodeURIComponent`, sin dependencias nuevas, sin cambios en `src-tauri/`, nada sale del equipo; el canon y la precomprobación no se saltan).

| Gravedad | Problema | Estado |
|---|---|---|
| 🟡 | Escena sin título: la escaleta recién pasada salía desfasada para siempre | Arreglado (`escaletaAlDia` ignora los títulos vacíos, como al leer) + test |
| 🟡 | El aviso del visor se borraba con cualquier cambio del modelo, no solo al cambiar de nivel | Arreglado (`$derived` de la clave); navegador: el aviso de canon sigue tras editar el título en el panel |
| 🟡 | Alt + flecha pulsada mientras se guardaba el movimiento anterior se perdía sin decir nada | Arreglado: las pulsaciones van en cola, una tras otra; un arrastre soltado a medias avisa «vuelve a soltar». Navegador: tres Alt + ← seguidas, tres actos |
| 🟡 | `arrastrando` se quedaba en `true` si la tarjeta desaparecía o cambiaba el nivel (Esc dejaba de subir) | Arreglado: el visor limpia el arrastre al cambiar de nivel y con `dragend`/`drop` en la ventana (también la bandeja) |
| ⚪ | Un cambio propio durante la precomprobación se tomaba por uno de fuera | Mitigado: crear también espera lo que se está escribiendo. Ctrl Z justo durante la espera aún puede dar el aviso (sin pérdida de datos) |
| ⚪ | `cambio` con más de dos elementos a mano: el modelo enseña los tres | Pendiente: recortarlo tocaría también `story_circle` y `beats`; el crudo se conserva en disco |
| ⚪ | El selector de episodio del panel no volvía atrás tras un rechazo por canon | Arreglado |
| ⚪ | Soltar en un episodio no comprobaba que la escena estuviera en la bandeja | Arreglado |
| ⚪ | Un fichero soltado desde fuera podía abrirse en la ventana | Arreglado (`preventDefault` si trae `Files`); comprobar a mano en Windows y Mac |
| ⚪ | Las tarjetas no anunciaban Alt + flechas | Arreglado (`aria-keyshortcuts`) |

## A mano (pendiente del autor)
1. Windows (instalador nuevo) y Mac: arrastrar una escena entre actos y de la bandeja a un episodio (WebView2 y WebKit).
2. Alt + flechas en Windows y en el Mac: mueven la escena enfocada y no hacen «atrás»; mantener la tecla mueve una sola vez.
3. En Tauri, con un episodio de 40 escenas (serie grande de pruebas), mover una escena se ve en menos de 100 ms.
4. Abrir `_prueba` en la v1.0 tras mover y crear escenas en la v2: acto y número de cada escena iguales que en la v2.
5. Pasar un episodio a la wiki, mover una escena y ver el aviso de la escaleta; el enlace abre la ficha en Obsidian.
6. Arrastrar un `.md` desde el Explorador (o Finder) a la ventana: no pasa nada.
