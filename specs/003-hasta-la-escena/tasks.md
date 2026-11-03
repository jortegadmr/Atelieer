# Tareas — Spec 003 Hasta la escena

> Tareas de 20-30 min, en orden. Una cada vez: tests primero, `npm run verificar`, marcar, commit.
> Rama `003-hasta-la-escena`; al acabar se junta en `main`. Sin cambios en `src-tauri/` ni en el formato de las notas.

## Bloque 0 · Integridad (antes de mover nada)
- [x] T0. `crudos` para `acto` y `cambio` del evento, regla general de escritura (`normalizar(crudo)` igual al valor actual) y `olvidarCrudos` en `Sesion.aplicar`. (RNF integridad)
      Hecho cuando: tests «acto escrito a mano se conserva al guardar la escena y al renumerarla», «cambio raro (`[sube, baja]`, `+ → −`, tres elementos) se conserva», «poner acto 2 y quitarlo no resucita el valor a mano», «deshacer lo devuelve», «la v1.0 los lee como antes», «madurez y madurez_mesa igual que en la 001» y todos los de antes en verde.
- [x] T1. Canon por estructura en `bloqueadaQueToca`: no entra, no sale (ni a la papelera) ni se reordena una escena en un episodio canon bloqueado; mensajes de escena y de episodio. (RF-23, RF-24, RF-25, RF-33)
      Hecho cuando: tests «`moverEvento` de la rejilla a un episodio bloqueado: rechazado», «sacarla a la bandeja: rechazado», «cambiar su acto o su orden: rechazado», «borrarla: rechazado», «escena canon no se mueve», «vecinas canon en un episodio libre sí se renumeran», «desbloqueado: vale», «editar el título de una escena no canon de un episodio canon: vale» en verde.
- [x] T2. Precomprobación de los movimientos: `cambiadasFuera` en paralelo (`conocido` antes de leer, ver plan) y pieza releída durante la espera = cambiada fuera; en `aplicar`, solo con `cambio.mueve` y 2 o más piezas existentes, tras `vaciar` si hay algo pendiente; `vaciar` al acabar de mover; mensaje «no se ha movido nada». (RNF integridad)
      Hecho cuando: tests «una de las notas cambiada fuera: no se mueve nada, se avisa y se relee», «un movimiento mientras se escribe el anterior no da cambió fuera», «nota cambiada entre la comprobación y la escritura: aviso, relectura y el resto escrito», «borrar un episodio y crear siguen como antes» en verde.

## Bloque 1 · Lógica (TypeScript puro, con tests)
- [x] T3. `actos.ts`: `ORDEN_ACTOS`, `actosDe`, `colocarEscena`, `crearEscena`. (RF-4 a RF-6, RF-17, RF-19, RF-31, RF-37, RF-38)
      Hecho cuando: tests «cada escena en su acto en el orden del episodio; acto desconocido en Sin acto», «mover en el mismo acto, a otro acto y a Sin acto», «orden cruzado: al mover queda por actos», «números repetidos o 0: 1, 2, 3…», «en su sitio: nada que guardar», «solo se guardan las que cambian», «de la bandeja a un episodio: al final de su acto, con la temporada del episodio», «crear en un acto: al final de ese acto», «la idea de Ctrl I no reordena», «la v1.0 lee lo movido y lo creado» en verde.
- [x] T4. `actos.ts`: `pasoTeclado`, `porQueNoSeMueve`, `curva`, `anuncio`; `visor.ts`: `columnasActos` y `bandejaVisor`; textos del visor. (RF-7 a RF-12, RF-16, RF-18 a RF-23, RF-29, RF-30, RNF rendimiento)
      Hecho cuando: tests «cuatro actos siempre y Sin acto solo si hace falta», «cabecera con nombre, número y resumen», «empieza y acaba igual», «bordes del teclado (Teaser, Desenlace, Sin acto, primero y último)», «tramos de la curva con huecos», «Escena 4 · Desarrollo, 2.ª», «bandeja de la temporada con las de episodios que ya no existen», «actos y mover con 40 escenas en menos de 100 ms» en verde.
- [x] T5. `crear.ts` («Escena» en «Nuevo…» del episodio, `DatosNueva.acto`); `EstadoApp`: `abrirNueva(que, {acto})`, `moverEscena` y `llevarAEpisodio` en serie y sin clave, `avisoVisor`, `arrastrando`. (RF-13, RF-22, RF-23, RF-28, RF-31, RF-33, RF-35 a RF-37)
      Hecho cuando: tests «Nuevo… del episodio: Escena e Idea», «Sin acto por defecto; desde una columna, su acto», «crear desde la ventana: al final del acto y elegida», «dos movimientos seguidos sin esperar: orden bien y dos pasos de deshacer», «Ctrl Z deshace un movimiento entero», «bloqueado: no mueve y dice por qué» en verde.
- [x] T6. `escaleta.ts`: `escaletaDe` (sacada de `pasar.ts`, que la usa), `leerEscaleta`, `escaletaAlDia`; `revisarFichas` guarda la escaleta leída. (RF-39)
      Hecho cuando: tests «recién pasada: al día», «tras mover a otro acto: desfasada», «cambio de orden dentro de un acto: desfasada», «plantilla con la fila vacía: no avisa», «ficha sin tablas: no avisa», y los de `pasar` sin cambios en verde.

## Bloque 2 · Interfaz
- [x] T7. Nivel episodio en el visor: `Actos.svelte`, `ColumnaActo.svelte`, `Curva.svelte` (aria-hidden), tarjetas con `Columna.svelte`, «+ Escena», teclado 2D, estilos (contraste ampliado); selector de acto en «Nueva pieza». (RF-7 a RF-16, RF-36)
      Hecho cuando: `verificar` en verde y en el navegador: episodio vacío, con escenas en los cuatro actos y en Sin acto, curva con un tramo igual y un hueco, teclado solo, claro y oscuro.
- [x] T8. «escena» en los textos de la v2: visor, crear, panel (`EditarEvento`, `Panel`, `EditarSecreto`, `EditarEpisodio`, `Siembras`), rejilla, bandeja, buscar y mensajes de `comprobaciones/`; la guía del autor y los nombres en disco no se tocan. Los tests que esperan un texto con «evento» cambian ese texto (RF-2), nada más. (RF-2, RF-3)
      Hecho cuando: `verificar` en verde, búsqueda de «evento» en los textos de `src/` sin resultados salvo los permitidos (lista en el commit) y test «la guía del autor sigue diciendo evento».
- [x] T9. Mover en el nivel episodio: `arrastre-visor.ts` (tipo propio sin `text/plain`, testigo, `puestoAlSoltar` sin la arrastrada, limpieza en `window`), arrastrar entre actos y de puesto, Alt + flechas (sin repetir, `stopPropagation`), foco y anuncio; carcasa: Alt + flechas sin efecto fuera de los campos y Esc que no sube mientras se arrastra. (RF-17 a RF-22, RF-26, RF-27, RNF atajos)
      Hecho cuando: test de `puestoAlSoltar` en verde; `verificar` en verde; en el navegador: mover con ratón y teclado, soltar fuera y en su sitio sin cambios, la rejilla de abajo no acepta la tarjeta, texto arrastrado desde fuera no hace nada, episodio canon bloqueado con su porqué.
- [x] T10. Bandeja en el visor de la temporada: `ColumnaBandeja.svelte`, arrastrar a la columna de un episodio, clic e Intro eligen; quitar `<Bandeja>` de `Temporada.svelte`. (RF-29 a RF-34)
      Hecho cuando: `verificar` en verde y en el navegador: idea de Ctrl I en la bandeja, llevarla a un episodio, bandeja vacía, episodio canon bloqueado no la acepta, la vista Temporada sin bandeja y Episodios con la suya.
- [x] T11. Aviso «La escaleta de la wiki no está al día» en el panel del episodio, con el enlace de `Wiki.enlace`. (RF-39)
      Hecho cuando: `verificar` en verde y en el navegador con la serie de prueba (episodio pasado a la wiki, mover una escena: sale el aviso).

## Bloque 3 · Cierre
- [x] T12. Alinear `docs/inventario-v1.md` (G1 actos y escenas, G5 evento → hechos), `docs/diseno.md` (fila `.visor`, «escena») y `docs/prd.md` (duda «¿escena = evento?» resuelta).
      Hecho cuando: esas líneas cambiadas y en el commit.
- [x] T13. Validación final: `validacion.md` requisito por requisito, revisión independiente de código y seguridad, arreglos, pruebas a mano del autor apuntadas (arrastre en Windows y Mac, Alt + flechas en los dos, mover en Tauri en menos de 100 ms con 40 escenas, `_prueba` en la v1.0), juntar la rama en `main`.
      Hecho cuando: cada RF con su prueba, revisión sin críticos y `verificar` en verde en `main`.
