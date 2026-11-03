# Tareas — Spec 002 De arriba abajo

> Tareas de 20-30 min, en orden. Una cada vez: tests primero, `npm run verificar`, marcar, commit.
> Rama `002-de-arriba-abajo`; al acabar se junta en `main`. Sin cambios en `src-tauri/` ni en el formato de las notas.

## Bloque 0 · Integridad (hallazgo 🔴 de la revisión del plan)
- [x] T0. `Almacen` recuerda lo último leído o escrito de cada nota; `guardar` no escribe si la nota cambió fuera o ya no está (`CambioFuera`); `Guardado` no lo reintenta y avisa; la sesión relee esa nota en el acto. (RNF integridad, constitución 2)
      Hecho cuando: tests «`serie.md` cambiada fuera antes de guardar: no se pisa y se avisa», «temporada cambiada fuera: igual», «nota borrada fuera: no se resucita», «lo de fuera queda en el modelo», «lo propio sí se escribe» y todos los de antes en verde.

## Bloque 1 · Lógica (TypeScript puro, con tests)
- [x] T1. `visor.ts`: tipo `Nivel`, `temporadaVisible`, `nivelValido`, `subir`, `migas`, `vistaDeNivel`, `nivelAlCambiarVista`. (RF-14, RF-15, RF-18, RF-20 a RF-24)
      Hecho cuando: tests «temporada visible: la elegida, la primera en marcha o la primera», «sube del episodio a la temporada y de ahí a la serie», «en la serie no sube», «miga Serie › T01 › E03», «episodio borrado, en la papelera o movido de temporada sube a su temporada», «temporada borrada sube a la serie», «Serie / Temporada / Episodios llevan a su nivel», «Tramas y Wiki no cambian el nivel» en verde.
- [x] T2. `visor.ts`: `columnas` y `textoVacio`; prueba de rendimiento. (RF-2 a RF-10, RNF rendimiento)
      Hecho cuando: tests de las columnas de temporada, episodio y evento con sus datos, «solo cuentan los avisos, no las sugerencias ni lo silenciado», «aparcado y descartado con su estado», «Aún no hay episodios · 8 previstos» y «columnas sobre la serie grande en menos de 100 ms» en verde.
- [x] T3. `crear.ts`: `opcionesNuevo` y `crearPieza`. (RF-26, RF-29 a RF-34, RF-47)
      Hecho cuando: tests «opciones de cada nivel», «episodio en temporada canon y evento en episodio canon bloqueados, con su texto», «desbloqueada: activa», «cada pieza nace en idea y en su sitio» (temporada, episodio y evento al final; trama de serie con su tipo; trama de temporada; tramo de una trama de serie; secreto), «sin título también» en verde.
- [x] T4. `crear.ts`: `limpiarIdea`, `destinoIdea`, `crearIdea`; `Sesion.deshacerCreacion`; compatibilidad. (RF-38 a RF-46, RNF compatibilidad)
      Hecho cuando: tests de los cinco destinos (con dos temporadas en marcha: la primera), «sin temporadas: Crea primero una temporada», «vacío o espacios: nada», «saltos y controles → espacios», «300 caracteres visibles sin partir un emoji compuesto», «escrita en `appDatos/` en menos de 2 s», «deshacerCreacion deshace si es el último paso y si no la manda a la papelera», «la v1.0 lee la idea y las piezas nuevas con `: \" --- # [[x]]`, `episodio: \"\"` y `madurez: idea`» en verde.
- [x] T5. `capas.ts`. (RF-15, RF-16)
      Hecho cuando: tests «cierra la última», «quitar fuera de orden», «vacía no cierra nada» en verde.
- [x] T6. `EstadoApp`: `nivel`, `episodioActual` derivado, `cambiarVista`, `cambiarTemporada`, `irANivel`, `subirNivel`, `revisarNivel` diferido; las vistas y el menú los usan. (RF-11, RF-12, RF-20 a RF-24)
      Hecho cuando: tests con el disco en memoria «abrir la serie pone el nivel serie», «pasos y selector llevan el visor», «Tramas no cambia el nivel», «irANivel(episodio) conserva el episodio y lo elige», «elegir un evento no cambia de nivel», «borrar el episodio del nivel sube», «en Tramas sube el nivel y la vista se queda», «ir desde Comprobar deja el visor en el nivel de la vista» en verde.
- [x] T7. `EstadoApp`: estado de la captura, la ventana «Nueva pieza» y la tostada. (RF-27, RF-28, RF-36, RF-37, RF-43)
      Hecho cuando: tests «abrir la captura dos veces la deja como está», «la tostada se va si la idea ya no existe» en verde.

## Bloque 2 · Interfaz
- [x] T8. Estilos del boceto H en `componentes.css` (con el test de contraste ampliado); `Visor.svelte` y `Columna.svelte` en la carcasa, en todas las vistas. (RF-1 a RF-10, RF-25)
      Hecho cuando: `verificar` en verde y en el navegador: tres niveles con sus columnas y sus datos, vacío con botón, aparcado y descartado, desplazamiento horizontal con 40 eventos, claro y oscuro.
- [x] T9. Moverse con el visor: clic e Intro bajan, evento solo se elige, Tab y flechas, foco al cambiar de nivel, animación y movimiento reducido. (RF-11 a RF-13, RF-19, RF-20)
      Hecho cuando: `verificar` en verde y en el navegador, con el teclado solo.
- [x] T10. Miga del visor en la barra superior (fuera la de la v1); Esc con capas en `Panel`, `CampoEstado`, `CampoWiki`, `Buscar`, `Instantaneas`, `Sincronizacion` y `Beats`; Rejilla con el episodio marcado y a la vista. (RF-14 a RF-18, RF-20 a RF-22)
      Hecho cuando: `verificar` en verde y en el navegador: la miga sube; Esc sube, cierra lo abierto sin subir y sale de un campo sin subir; Episodios marca el episodio; pasos y selector mueven el visor; Tramas y Wiki lo dejan.
- [x] T11. `BarraNuevo.svelte` y `NuevaPieza.svelte`. (RF-26, RF-28 a RF-35)
      Hecho cuando: `verificar` en verde y en el navegador: crear cada tipo desde cada nivel y la pieza queda elegida en el panel; tipo de trama y tramo; bloqueados con texto, alcanzables con Tab y sin efecto al pulsar; Cancelar y Esc no crean.
- [x] T12. `Captura.svelte`, `Tostada.svelte`, botón «+ Idea», «Idea» de la barra y Ctrl I / Cmd I. (RF-27, RF-36 a RF-46)
      Hecho cuando: `verificar` en verde y en el navegador: Ctrl I también desde un campo; Intro guarda y dice dónde; Deshacer y Ctrl Z; Esc y vacío no crean; «Crea primero una temporada»; «Recortada a 300 caracteres»; el foco vuelve a donde estaba.

## Bloque 2b · Arreglos de la revisión independiente del código
- [x] T15. Integridad (5 🟡 y 1 ⚪): cada escritura compara con la nota tal como estaba cuando el autor hizo el cambio (no con la última leída); lo soltado no se reintenta; borrar con el lote en marcha no resucita; un borrado de fuera olvida la nota conocida; releer a la fuerza lo que no se pudo guardar; crear con `serie.md` o la temporada cambiadas fuera no crea nada; deshacer no restaura lo que cambió después fuera. (RNF integridad)
      Hecho cuando: tests «reintento tras fallo con la nota soltada», «lo releído no cuela una edición vieja», «deshacer tras un borrado de fuera», «relee aunque coincida con una escritura propia», «crear con serie.md cambiada fuera no deja nada a medias», «Ctrl Z no pisa lo de fuera», «borrar durante el lote no resucita» y todos los de antes en verde.
- [x] T16. Interfaz, accesibilidad y tests (⚪): aviso que no se pierde al seguir escribiendo; «Nueva pieza» sin excepción si cambia el nivel, foco atrapado y devuelto, botones de opción sin flechas falsas; `guardarIdea` solo con la captura abierta; Ctrl Z / Ctrl Y no actúan detrás de una ventana; pinchar fuera de la captura no pierde lo escrito; columna leída entera por el lector de pantalla; porqué del botón vacío bloqueado; contraste al pasar el ratón; tostada que no se va con el foco dentro; tests de la idea en la papelera leída por la v1.0, del fichero escrito en disco e Intro tras cerrar.
      Hecho cuando: tests nuevos en verde, contraste ≥ 4,5:1 con `--accent-soft` de fondo y comprobación en el navegador.

## Bloque 3 · Cierre
- [x] T13. Alinear `docs/inventario-v1.md` (G1: actos, eventos con bandeja y rejilla → «MVP · E3»; G4: Story Circle «fuera de la spec 002») y `docs/diseno.md` (principio 2 y fila `.visor`).
      Hecho cuando: esas cinco líneas cambiadas y en el commit.
- [x] T14. Validación final: `validacion.md` requisito por requisito, medida a mano del cambio de nivel con la serie grande, revisión independiente de código y seguridad, arreglos, pruebas a mano del autor apuntadas, juntar la rama en `main`.
      Hecho cuando: cada RF con su prueba, revisión sin críticos y `verificar` en verde en `main`.
