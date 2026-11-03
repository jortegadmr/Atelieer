# Tareas — Spec 009 «Línea de la historia, fichas y lo pendiente»

> Tareas de 20-30 min, en orden. Una cada vez: tests primero (solo disco, wiki, canon, variante y v1.0), `npm run verificar`, marcar, commit.
> Rama `009-linea-de-la-historia`; al acabar se junta en `main`. Sin cambios en `src-tauri/` ni en el formato de las notas de las piezas.
> La interfaz se comprueba en el navegador (`npm run dev`, serie de prueba en memoria).

## Bloque 1 · Línea de la historia
- [x] T1. `md.ts` (`nombreLimpio`, `celdas` con `\|`, `clave`) y `Wiki.epocas()` con el orden de la Timeline, «Presente» y `lectura` (RF-4, RF-5, casos límite).
      Hecho cuando están en verde: «orden de las filas y Presente en su fila»; «fichas sin fila detrás, por nombre»; «alias y subcarpetas se juntan»; «[[La Inundación]], negritas y \| dan el nombre limpio»; «Presente sin fila no es época».
- [x] T2. `vistas/historia.ts`: columnas, orden de emisión, dónde se emite, filtro, `cambioDeEpoca`, `porQueNoSeCambia`, `pasoHistoria` (RF-6 a RF-9, RF-14, RF-18 a RF-26).
      Hecho cuando están en verde: «el cambio solo toca mundo»; «a Presente deja vacío»; «nombre con | no se suelta»; «en su misma columna, nada»; rendimiento con 300 escenas y 30 épocas.
- [x] T3. `estado.cambiarEpoca`, `moverEpocaConTecla`, `filtroHistoria`, aviso y anuncio; `Vista` «historia» (RF-15, RF-19, RF-20, RF-25, RF-27 a RF-29).
      Hecho cuando están en verde, con la sesión y el disco en memoria: «un paso de Ctrl Z por movimiento»; «Ctrl Z desde No está en la wiki devuelve el texto exacto»; «canon bloqueado no se mueve; en la variante sí, y no escribe en la serie»; «con Ver ahora no se mueve»; «la wiki releída con `Sesion.leerWiki` a medio arrastre no mueve».
- [x] T4. Menú, `Carcasa` y `Historia.svelte`: columnas, filtro, vacíos, releer, Abrir la Timeline (RF-1 a RF-15).
      Hecho cuando en el navegador: se abre desde el menú, enseña las columnas en orden, filtra y no ensancha la página a 900 px.
- [x] T5. `TarjetaHistoria.svelte`: tarjeta con estado en texto, clic e Intro abren en el panel (RF-8, RF-16, RF-17).
      Hecho cuando en el navegador la tarjeta enseña título, dónde se emite, modo y estado, y abre la escena sin cambiar de vista.
- [x] T6. Arrastre (`arrastre-historia.ts`, con `estado.arrastrando`) y Alt + flechas con el foco en la tarjeta movida, avisos visibles (RF-18 a RF-24, RF-29).
      Hecho cuando en el navegador: arrastrar y Alt + flechas mueven y lo dicen; el foco sigue en la tarjeta; no se suelta en «No está en la wiki»; Esc no cambia nada ni sube el visor; la tarjeta no entra en el visor ni en la rejilla.

## Bloque 2 · Marcas
- [x] T7. `consecuencias/fuente.ts`: la regla de gris o acento, sacada del visor (RF-32).
      Hecho cuando el visor se ve igual que antes (navegador) y los tests del visor siguen en verde.
- [x] T8. `marcasHistoria` y marcas en la línea (RF-30, RF-31, RF-33, RF-33b).
      Hecho cuando en el navegador la línea enseña «Estaba aquí» y «Nueva», en gris y en acento, y elegir con «Si lo dejas así…» abierta no cambia la pieza comparada.
- [x] T9. `marcasRejilla` y marcas en la rejilla (RF-30 a RF-33b).
      Hecho cuando en el navegador la rejilla enseña el papel de antes, «Estaba aquí» y «Nueva», sin mover nada.
- [x] T10. `marcasTramas` y marcas en Tramas (RF-30 a RF-33b).
      Hecho cuando en el navegador Tramas enseña el texto de antes en los campos cambiados, «Nueva» y «Ya no está».
- [x] T11. «solo ahora» / «solo en la variante» en el visor con un arco o un secreto elegido (RF-34).
      Hecho cuando en el navegador, con una variante que mueve una escena del arco a otro episodio, cada uno lleva su texto.

## Bloque 3 · Pestaña «Ficha»
- [x] T12. `wiki/apartados.ts` (RF-36, RF-37, RF-37b, RF-44).
      Hecho cuando están en verde: «cambiar un apartado deja el resto igual byte a byte» con `\r\n`, BOM, sin salto final, títulos repetidos y `##` dentro de un bloque de código y de un comentario; «sin apartados, solo Inicio»; «una línea ## no se guarda»; «`##Título` sin espacio no es título»; «un título setext (`Título` y `---`) no se confunde con las propiedades»; «`## ` dentro de las propiedades no cuenta».
- [x] T13. `wiki/editar-ficha.ts`: leer, comparar, copia en `_fichas/` (con sufijo si ya existe) y Log por apartado (RF-38, RF-39, RF-39b).
      Hecho cuando están en verde: «si cambió fuera, no escribe»; «la primera vez copia y apunta; la segunda, no»; «dos copias en el mismo segundo no se pisan».
- [x] T14. `Sesion.escribirEnFicha`, `ponerFechaFicha`, `leerFichaDe` / `guardarApartado`; `sincronizarFichas` guarda lo pendiente; Ctrl Z conserva `wiki_mtime` (RF-38, RF-39c, RF-40 a RF-42).
      Hecho cuando están en verde: «no entra en el Ctrl Z»; «pone al día la fecha de la ficha en la pieza»; «Ctrl Z de un paso anterior no da Cambió en la wiki»; «lo pendiente se guarda antes de que la app escriba el estado»; «canon bloqueado y variante no escriben».
- [x] T15. Ruta segura al leer (RF-43): `rutaFicha` en `revisarFichas` (desfase.ts), `leerFicha` y `urlObsidian`; `anotarLog` con `escribirSeguro`.
      Hecho cuando están en verde: «un enlace con ../ no se lee, no se escribe ni lo revisa revisarFichas».
- [x] T16. Pestaña «Ficha» en el panel (`PestanaFicha.svelte`) (RF-35 a RF-44).
      Hecho cuando en el navegador: sale después de Guía solo con ficha y sin parpadeo; guarda al salir y a los 2 s; guarda lo pendiente al cambiar de pieza, vista o variante y al pasar a canon, y dice si no puede; vuelve a Editar si la nueva pieza no tiene ficha; dice «La ficha cambió en Obsidian» y «Ver la de Obsidian»; queda en solo lectura con canon, «Ver ahora» y en la variante.

## Bloque 4 · Alternativas descartadas
- [x] T17. `wiki/alternativas.ts`, la parte pura (RF-45 a RF-48).
      Hecho cuando están en verde: «añade bajo ### Alternativas descartadas en el sitio de la fila vacía»; «título sin tabla, crea la tabla debajo»; «sin título, crea el apartado antes de Fuentes»; «fila igual, no añade»; «| en el título se escapa»; «quitar solo si sigue igual y nadie más la da»; «CRLF y BOM se quedan».
- [x] T18. `alternativasAlCambiar` con `cambiarEstado` y `aplicarVariante` (RF-45, RF-45b, RF-50 a RF-52).
      Hecho cuando están en verde: «descartar una escena de dos arcos escribe en las dos fichas y en el Log»; «recuperar la quita»; «escena en un tramo va a la ficha del arco de serie»; «arco canon bloqueado no se toca»; «si la ficha cambió fuera, no escribe y la escena sí se descarta»; «en la variante no toca la wiki hasta aplicar»; «releer la wiki no escribe filas».
- [x] T19. `alternativasAlCambiar` al deshacer, rehacer y volver; avisos en las dos ramas de `avisosAlVolver` (RF-49).
      Hecho cuando están en verde: «Ctrl Z quita la fila y avisa de que el Log no se deshace»; «Ctrl Y la vuelve a poner».

## Bloque 5 · Estados antiguos
- [x] T20. `wiki/equivalencias.ts`; `estadoWiki` y «Canon» normalizado en `revisarFichas`; `ponerEstadoFicha` devuelve el valor de antes y lo pone en el Log (RF-53, RF-54, RF-55c).
      Hecho cuando están en verde: «la tabla propone sin mayúsculas ni acentos»; «vacío no es antiguo»; «una lista avisa sin propuesta»; «Canon con mayúscula es canon»; «el Log dice el valor de antes».
- [x] T21. `Sesion.confirmarEquivalencia`, `dejarAsi` y `quitarDejarAsi` (RF-55 a RF-57).
      Hecho cuando están en verde: «confirmar canon cambia ficha, Log y pieza»; «confirmar descartado pide su porqué»; «confirmar que cambia la pieza es un paso propio de Ctrl Z»; «canon bloqueado y variante no confirman»; «Dejarlo así se guarda en la pieza y vuelve a avisar con otro valor»; «nada cambia sin confirmar».
- [x] T22. `EstadoAntiguo.svelte` en Editar y en la pestaña Ficha (RF-53, RF-55, RF-56).
      Hecho cuando en el navegador el aviso sale con la propuesta, «Confirmar» la aplica y «Dejarlo así» lo quita y se puede volver a poner.

## Bloque 6 · Cierre
- [x] T23. Compatibilidad: la v1.0 abre la serie igual tras mover épocas, guardar un apartado, descartar y recuperar, confirmar una equivalencia y «Dejarlo así» (RNF).
      Hecho cuando están en verde `tests/compat.test.ts` y `tests/compat-variantes.test.ts`.
- [x] T24. `validacion.md` (RF uno a uno) y comprobación en el navegador de todo junto.
- [x] T25. Revisión independiente y de seguridad; arreglos con test.
- [x] T26. PRD, inventario y `docs/diseno.md`; juntar en `main`.
