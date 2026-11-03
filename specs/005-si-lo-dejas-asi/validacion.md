# Validación — Spec 005 «Si lo dejas así…»

> 2026-10-21, rama `005-si-lo-dejas-asi`. `npm run verificar`: 64 archivos de tests, 633 tests en verde; `svelte-check` 0 errores y 0 avisos; compilación del frontal correcta. Sin cambios en `src-tauri/`, en el formato de las notas ni en el de `guia.md`.
> Navegador: `npm run dev` (serie de prueba en memoria), 1440 × 900, temas claro y oscuro. Tests ligeros (decisión del autor en la 003): la lógica, el disco y la v1.0, con tests; la interfaz, en el navegador.

## Requisito → prueba → resultado
| RF | Prueba | Resultado |
|---|---|---|
| 1 | Navegador: la pestaña sale entre Editar y Guía en serie, temporada, episodio, escena y trama | ✅ |
| 2 | `efectos.test.ts` › total y `conAviso`. Navegador: tras editar el título de la serie, «1» en la pestaña y `aria-label` «Si lo dejas así…, 1 cambio»; con avisos, el icono de aviso; la cifra llega 150 ms después | ✅ |
| 3 | Navegador: editar no abre la pestaña ni le pasa el foco | ✅ |
| 4 | `efectos.test.ts` › nada ha cambiado (también escribir y borrar). Navegador: «Nada ha cambiado desde que abriste la pieza.» tras volver | ✅ |
| 5 | `efectos.test.ts` › los cuatro grupos, los avisos de la abierta primero. Navegador: los cuatro títulos en su orden | ✅ |
| 6 | `efectos.test.ts` › C03 lleva G07, G08 y G10; sin guía, sin reglas. Navegador: G43 y G41 bajo los avisos de una escena nueva | ✅ |
| 7 | `huellas.test.ts` (renumeradas, episodio, acto, bandeja, carga, dominante, avisos, códigos al insertar un episodio y al cambiar el orden de las temporadas, arcos y secretos por episodio, nueva, papelera). Navegador: mover con Alt + flecha da «Escena 2 → 1» y «Pasa al acto Desenlace» | ✅ |
| 8 | `campos.test.ts` (texto, vacío, lista, rejilla, silenciado, aparcado, escribir y borrar, valores a mano, etiquetas de los `.svelte` en la tabla) | ✅ |
| 9 | `avisos.test.ts` › silenciar o aparcar no es «Ya no avisan»; `efectos.test.ts` › C02 de otra escena en «Ya no avisan» | ✅ |
| 10 | Código: «y N más» por grupo y el foco a la entrada 21. En la serie de prueba no hay más de 20 entradas: a mano | ◐ |
| 11 | Navegador: la lista se pone al día al editar, deshacer y mover sin mover el foco | ✅ |
| 12 | Navegador: tras «Lo sé» con teclado el foco pasa a la entrada siguiente; tras «Volver», al título de la pestaña | ✅ |
| 13 | `efectos.test.ts` › campo de la primera regla; ninguno con canon bloqueado o en otra pieza. Navegador: «Ir al campo» de G41 enfoca «Qué gana» en Editar con su regla; el de C03 abre Tramas y la tarjeta «Qué quiere y por qué» | ✅ |
| 14 | Navegador: «Ir a la pieza» elige la escena en Editar; al lado, «La comparación empezará de cero» | ✅ |
| 15 | Navegador: «Lo sé» en la lista silencia el aviso y la entrada desaparece | ✅ |
| 16 | Navegador: Ctrl Z con el foco en una entrada deshace el último paso | ✅ |
| 17 | `efectos.test.ts` › `puedeVolver`; solo lo de fuera no se puede volver. Navegador: el botón sale al cambiar la abierta y no al mover otra escena | ✅ |
| 18 | `volver.test.ts` (la abierta y sus pasos, en cadena, lo de otros pasos se queda, lo creado a borrar y lo borrado a guardar); `volver-sesion.test.ts` › nota idéntica en disco, con valores a mano y campos desconocidos; lo borrado sale de la papelera. Navegador: «Devuelta 1 pieza.» | ✅ |
| 18b | `volver-sesion.test.ts` › la escena creada vuelve a la papelera y acaba la comparación. Navegador: pasa a la serie con «La boda» ha vuelto a la papelera; Ctrl Z la recupera | ✅ |
| 19 | `volver-sesion.test.ts` › Ctrl Z lo deshace entero y Ctrl Y lo rehace entero. Navegador: Volver, Ctrl Z y Ctrl Y | ✅ |
| 20 | `volver.test.ts` y `volver-sesion.test.ts` › cambiada fuera (también sin que la vea la vigilancia) y canon bloqueado no devuelven nada y dicen cuál; Ctrl Z con una pieza cambiada fuera no hace nada y el paso sigue en su pila | ✅ |
| 21 | `volver-sesion.test.ts` › avisa de la ficha de la wiki que se queda | ✅ |
| 22 | `sesion.test.ts` › lo releído que cambia va a `deFuera`, lo releído igual no; canon desde la wiki. `efectos.test.ts` › la abierta cambiada fuera lo dice | ✅ |
| 23 | `sesion.test.ts` › al crear, la base es la de antes de crear. Navegador: una escena nueva sale como «Nueva» y su episodio «1 → 2 escenas» | ✅ |
| 24 | Navegador: pinchar una escena con la pestaña abierta la elige y deja la pestaña; elegir otra pieza empieza de cero | ✅ |
| 25 | Navegador: con la pestaña abierta, bajar a una temporada no cambia la pieza; cerrada, bajar a un episodio lo elige; el menú izquierdo, como siempre | ✅ |
| 26 | `sesion.test.ts` › deshacer la creación de la abierta acaba la comparación. Navegador: borrar la abierta elige la serie con «Nada ha cambiado»; sin comparación, bajar elige como siempre | ✅ |
| 27 | `visor.test.ts` › resaltado en serie, temporada y episodio; arcos y secretos en sus episodios de antes y de ahora. Navegador: los tres niveles, temas claro y oscuro | ✅ |
| 28 | `visor.test.ts` › «antes» por columna, «Estaba aquí» solo al cambiar de episodio, acto o bandeja, «Ya no está», «Nueva». Navegador: «Estaba aquí: «Se conocen en la lonja»» en Desenlace del episodio de origen y «antes 2» en la renumerada; el lector lee «antes: 2» | ✅ |
| 29 | Navegador: al volver a Editar, el visor queda como siempre | ✅ |
| 30-32 | `nueva.test.ts` (dónde por tipo, renumeración, avisos con reglas, modelo y disco intactos, bloqueo con el texto de Crear, error de nivel). Navegador: escena (cambia al cambiar de acto y al escribir el título), episodio, temporada, trama, trama de temporada y secreto | ✅ |
| 33 | Los tests de Comprobar, Guía, reglas junto al campo y deshacer siguen sin tocar y en verde | ✅ |

| RNF | Prueba | Resultado |
|---|---|---|
| Rendimiento | `copia.test.ts` › copia de la serie grande en menos de 50 ms; `efectos.test.ts` › editar un título en menos de 30 ms y mover una escena en menos de 200 ms (media de cinco ediciones). La cifra, 150 ms después del último cambio; «Si la creas así…», 300 ms. En un Mac Intel antiguo, a mano | ✅ / a mano |
| Compatibilidad v1.0 | El punto de partida vive en memoria. `volver-sesion.test.ts` › la v1.0 lee lo devuelto | ✅ |
| Integridad | `volver-sesion.test.ts` (entero o nada, cambiado fuera, papelera); `nueva.test.ts` › la simulación no escribe nada | ✅ |
| Seguridad | Sin `{@html}` (`sin-html.test.ts`); todo como texto | ✅ |
| Estabilidad visual | Navegador: el visor no cambia de ancho al abrir la pestaña; lo discontinuo va dentro de las columnas o en una línea bajo el nivel. Las pestañas pasan a otra fila si no caben, sin partir su texto | ✅ |
| Accesibilidad | `contraste.test.ts` › lo atenuado sin opacidad, `--ink-3` sobre `--bg`. Navegador: todo con teclado; grupos con título; «afectada» y «antes:» para el lector | ✅ |

## Arreglos encontrados al probar
- El pie del panel no repintaba los avisos añadidos al mismo array (se veía «Devuelta 1 pieza.» solo a veces): ahora devuelve una copia.
- Con la cifra, «Si lo dejas así…» se partía en dos líneas: cada pestaña va en una línea y la fila sigue debajo si no caben.
- Sin comparación (la abierta deshecha), bajar en el visor no elegía nada con la pestaña abierta: ahora elige como siempre.
- «Estaba aquí» llevaba el texto solo para el lector: ahora se ve, como pide RF-28.
- `candidatas` recalculaba los códigos de todos los episodios de la temporada al editar el título de uno: solo si cambia el orden (de la temporada o de la serie).

## Revisión independiente (código y seguridad)
Una revisión independiente revisó la rama frente a `main` (solo lectura). Un crítico, dos importantes y cinco menores; todos arreglados con su test:

| Gravedad | Hallazgo | Arreglo | Prueba |
|---|---|---|---|
| Crítico | «Volver» pulsado dos veces (doble clic, Intro dos veces) o Ctrl Z repetido sobre su paso dejaba la serie a medias: números repetidos, modelo distinto del disco, aviso falso de «cambió fuera» y un paso perdido de la pila | Cerrojo en la sesión para todo lo entero (Volver y su Ctrl Z / Ctrl Y); el botón se desactiva mientras trabaja. Si algo cambia en Atelier mientras se comprueba el disco, no se devuelve nada, no se relee nada ni se toma por de fuera: «Algo cambió mientras tanto…». El canon bloqueado se vuelve a mirar tras las esperas | `volver-sesion.test.ts` › pulsado dos veces; Ctrl Z dos veces; algo cambia mientras tanto (los dos primeros fallan sin el cerrojo) |
| Importante | Con fichas de la wiki, Volver no era entero: podía dejar una ficha cambiada y la mesa no, o seguir con una ficha sin poner al día | En modo entero se comprueba que están todas antes de escribir ninguna; si una falla a medias, o algo cambia, las ya escritas vuelven a su estado (el Log lo apunta) y no se aplica nada | `volver-fichas.test.ts` (falta una, falla la segunda, todo bien) |
| Importante | El visor seguía con las marcas de la comparación anterior al elegir otra pieza con la pestaña abierta | Elegir otra pieza avisa al visor | Navegador: editar la escena 2, elegir la 1: sin resaltado ni atenuado, «Nada ha cambiado» |
| Menor | «Volver» se ofrecía cuando solo había cambios de fuera | No se ofrece si todo lo cambiado es de fuera | `efectos.test.ts` › solo la abierta cambiada fuera |
| Menor | Tras volver con cambio de estado de ficha, la fecha de la ficha (`wiki_mtime`) hacía que la pieza no quedara «igual» | `wiki_mtime` no cuenta al comparar; volver deja la fecha de ahora (la de la última escritura) | `efectos.test.ts` y `volver.test.ts` › la fecha de la ficha |
| Menor | Lo pasado a canon desde la wiki decía «cambió fuera de Atelier»; el Ctrl Z entero decía «no se ha devuelto nada» | Texto propio para cada caso | `volver.test.ts` › pasó a canon desde la wiki |
| Menor | La lista no se ponía al día al releer `guia.md` | La guía entra en la clave del memo | `volver-sesion.test.ts` › se recalcula al releer la guía |
| Menor | Lo que sale de la papelera podía pisar una nota que el autor ya había vuelto a poner en su sitio | Si ya hay nota en su sitio, no se devuelve nada | `volver-sesion.test.ts` › no pisa una nota ya en su sitio |

Comprobado sin problemas: nada nuevo en `appDatos/` (todo en memoria) y la v1.0 lee lo devuelto; papelera; sin `{@html}` ni red; la simulación de «Nueva pieza» no toca modelo ni disco; accesibilidad y rendimiento.

## A mano (pendiente del autor)
1. En `_prueba` y sin manual (criterios de la spec): G42 en «Avisos nuevos» al dejar una escena empezando y acabando igual; mover una escena de episodio y ver «Estaba aquí» y las renumeradas; «Volver a como estaba» y Ctrl Z; «Nueva pieza» de una escena en un episodio con escenas.
2. Serie grande en un Mac Intel antiguo (Tauri): escribir en un campo no se nota lento; la cifra y el resaltado llegan enseguida.
3. «y N más» con más de 20 entradas (mover una escena en un episodio con muchas).
4. Canon bloqueado al volver: el pie dice cuál y por qué.
5. Mac (WebKit) y Tauri en Windows: la pestaña, «Ir al campo» a una tarjeta de Tramas y el foco tras «Lo sé».
6. Abrir en la v1.0 la carpeta `_prueba` tras «Volver a como estaba».
