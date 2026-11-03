# Tareas — Spec 005 «Si lo dejas así…»

> Tareas de 20-30 min, en orden. Una cada vez: tests primero (solo la lógica, el disco, el canon y la v1.0), `npm run verificar`, marcar, commit.
> Rama `005-si-lo-dejas-asi`; al acabar se junta en `main`. Sin cambios en `src-tauri/`, en el formato de las notas ni en el de `guia.md`.
> Tests en `tests/consecuencias/` (espejo de `src/lib/consecuencias/`).

## Bloque 1 · Lógica (TypeScript puro, con tests)
- [x] T1. `copia.ts`, `comparacion.ts` (con la cadena de `conLaAbierta`), `Historial.ultimoPaso()` y el comentario en `insertarEpisodio` (def., RF-23).
      Hecho cuando están en verde:
      - «la base, congelada a fondo, no cambia al mover, Lo sé, cambiar de estado, deshacer y crear»;
      - «antesDelPaso devuelve las piezas del paso a su antes»;
      - «un cambio que toca la abierta o una de conLaAbierta las suma; uno que no, no»;
      - «la copia de la serie grande, en menos de 50 ms».
- [x] T2. `Sesion`: `empezarComparacion` (`ultimaCreacion` con su `version`), `origen` en `aplicar`, `anotar` en `aplicar`, `revisarFichas` y `aplicarCambios` (solo lo releído que cambia), y fin de la comparación si la abierta desaparece (def., RF-22 a RF-26).
      Hecho cuando están en verde:
      - «al crear, la base es la de antes de crear; si algo cambia antes de elegirla, ya no»;
      - «lo releído de fuera que cambia va a deFuera; lo releído igual, no»;
      - «lo que sube a canon la wiki va a deFuera como canon-wiki»;
      - «deshacer la creación de la abierta acaba la comparación».
- [x] T3. `sobre` en `aviso()` (C01b, C01c, C05, C06, C07, C13, C17) y `avisos.ts` (def., RF-5, RF-6, RF-8, RF-9).
      Hecho cuando están en verde:
      - «renombrar una escena no hace saltar ni dejar de saltar su aviso»;
      - «C13 de inicio y de fin son dos; C06 arranca y resuelve en la misma temporada son dos»;
      - «C07 de T01 que se va y C07 de T02 que llega son dos entradas»;
      - «dos iguales en la misma pieza cuentan uno a uno»;
      - «silenciar o aparcar no es ya no avisan»;
      - los tests de comprobaciones de siempre, sin tocar.
- [x] T4. `huellas.ts`, parte 1: escenas, episodios, temporadas y puntos; nueva, papelera, orden de la serie; comparación incremental (RF-7).
      Hecho cuando están en verde: mover una escena (renumeradas, episodio, acto); carga; dominante; avisos; insertar un episodio cambia los códigos; nueva y papelera; la abierta no sale; solo cambió en disco.
- [x] T5. `huellas.ts`, parte 2: arcos y secretos, por ids de episodio (RF-7).
      Hecho cuando están en verde: arco «pasa también por» y «deja de pasar por»; empieza y acaba; insertar un episodio no cambia el arco; la revelación y una pista del secreto cambian de episodio.
- [x] T6. `campos-vistos.ts`: tabla de serie, punto, temporada y episodio, y `camposCambiados` (RF-8).
      Hecho cuando están en verde: texto, vacío, rejilla (momentos); silenciado y aparcado; escribir y borrar no deja nada; un valor escrito a mano que se olvida no cuenta; etiquetas de `EditarSerie`, `EditarPunto`, `EditarTemporada` y `EditarEpisodio` en la tabla.
- [x] T7. `campos-vistos.ts`: escena, secreto y arco (panel y tarjetas de Tramas), con las listas y `MANUALES` (RF-8).
      Hecho cuando están en verde: listas (pistas, protagonistas, personajes: «3 → 4 · añadida»); rejilla de estados por temporada; etiquetas calculadas; el resto de `.svelte` y `MANUALES` en la tabla.
- [x] T8. `efectos.ts` (RF-2, RF-4 a RF-9, RF-13, RF-17, RF-22).
      Hecho cuando están en verde: los cuatro grupos y su orden; `total` y `conAviso`; reglas de un aviso compartido (C03 → G07, G08, G10); campo de «Ir al campo» (ninguno si canon bloqueado); sin guía; «nada ha cambiado»; abierta cambiada fuera; serie grande: editar un título en menos de 30 ms y mover una escena en menos de 200 ms.
- [x] T9. `volver.ts` (`cambioVolver`, puro) (RF-18, RF-18b, RF-20, RF-22).
      Hecho cuando están en verde: la abierta y sus pasos; la cadena (dos escenas movidas en el mismo episodio); lo de otros pasos se queda; lo creado a `borrar`; lo borrado a `guardar`; `deFuera` → error; canon bloqueado → error con su texto.
- [x] T10. `Sesion.volverAComoEstaba` y el modo «entero» de `aplicar` (vaciar, `cambiadasFuera`, fichas) (RF-18 a RF-21).
      Hecho cuando están en verde, con el disco en memoria:
      - «deja la abierta exacta, con crudos y campos desconocidos» (pieza leída);
      - «lo creado va a la papelera; lo borrado sale de ella»;
      - «cambiado fuera sin que lo vea la vigilancia: no devuelve nada»;
      - «canon bloqueado: no devuelve nada»;
      - «avisa de la ficha de la wiki que se queda»;
      - «la v1.0 lee lo devuelto».
- [x] T11. `Paso.entero` y `volver()` entero para Ctrl Z / Ctrl Y (RF-19, RF-20).
      Hecho cuando están en verde: «Volver es un paso»; «Ctrl Z lo deshace entero y Ctrl Y lo rehace entero»; «si una pieza cambió fuera, Ctrl Z no hace nada y el paso sigue en su pila».
- [x] T12. `nueva.ts`: `simularNueva` (RF-30 a RF-32).
      Hecho cuando están en verde: dónde por tipo; renumeración de las escenas; avisos que saltan; el disco en memoria y el modelo quedan intactos; bloqueo de canon; error de `exige`.
- [x] T13. `consecuencias/visor.ts`: `marcasVisor` (RF-27, RF-28).
      Hecho cuando están en verde: resaltadas en serie, temporada y episodio; un arco y un secreto se resaltan en sus episodios de antes y de ahora; «antes» por columna; «Estaba aquí» solo si la escena cambió de episodio, de acto o de bandeja; «Ya no está».

## Bloque 2 · Interfaz (en el navegador)
- [x] T14. `estado.svelte.ts`: pestaña `"efectos"`, `elegir` con la pestaña de antes y comparación nueva, `abrir` y `restaurar`, RF-25 en `bajar`/`subirNivel`/migas, `irAPieza`, `irAlCampo`, `volverAComoEstaba` con RF-18b. `Panel.borrar`: aplicar y después elegir (RF-14, RF-18b, RF-24 a RF-26).
      Hecho cuando `verificar` está en verde y en el navegador: con la pestaña abierta, bajar en el visor no cambia la pieza; cerrada, sí; el menú izquierdo, como siempre; borrar la abierta deja la serie sin cambios en la lista.
- [x] T15. `Panel.svelte`: pestaña con cifra (99+), icono y `aria-label`; cálculo diferido (RF-1 a RF-3).
      Hecho cuando en el navegador: la cifra sube al editar y la pestaña no se abre sola; escribir en la serie grande no se nota lento.
- [x] T16. `SiLoDejas.svelte`: grupos, «y N más», «Volver a como estaba» y RF-18b (RF-4 a RF-11, RF-17).
      Hecho cuando en el navegador: G42 en «Avisos nuevos» con su regla; mover una escena da las renumeradas; «y N más»; «Volver» y Ctrl Z; canon bloqueado lo impide con su porqué; Volver en una pieza nueva pasa a la serie con su aviso.
- [x] T17. Acciones y foco: «Ir al campo» (panel, sección plegada y Tramas desde otra vista), «Ir a la pieza», «Lo sé», RF-12 y Ctrl Z en la lista (RF-12 a RF-16).
      Hecho cuando en el navegador: cada acción hace lo suyo; tras «Lo sé» el foco va a la siguiente; todo con teclado.
- [x] T18. Visor: resaltado y `.dim`; CSS y `contraste.test.ts` (RF-27, RF-29).
      Hecho cuando `verificar` está en verde y en el navegador: en los tres niveles, temas claro y oscuro; al cerrar la pestaña, se va.
- [x] T19. Visor: «antes», «Estaba aquí» y «Ya no está» (RF-28).
      Hecho cuando en el navegador: mover una escena de episodio y bajar al de origen con la pestaña abierta; el visor no cambia de ancho ni de orden; el lector lee «antes: …».
- [x] T20. «Nueva pieza»: «Si la creas así…» (RF-30 a RF-32).
      Hecho cuando en el navegador: escena en un episodio con escenas (renumeración), episodio, temporada, trama y secreto; cambia al cambiar el tipo o el acto; el bloqueo dice su porqué; escribir el título no se nota lento.

## Bloque 3 · Cierre
- [x] T21. `docs/diseno.md` (resaltado con la pestaña, discontinuo gris = antes, `.afectada`, `.dim`, `.antes`) y `docs/inventario-v1.md`.
      Hecho cuando: esas líneas están cambiadas y en el commit.
- [x] T22. Validación final:
      - `validacion.md` requisito por requisito;
      - revisión independiente de código y seguridad, y arreglos;
      - pruebas a mano del autor apuntadas: Mac/WebKit, Tauri en Windows, `_prueba` en la v1.0 tras «Volver a como estaba»;
      - juntar la rama en `main`.
      Hecho cuando: cada RF tiene su prueba, la revisión no tiene críticos y `verificar` está en verde en `main`.
