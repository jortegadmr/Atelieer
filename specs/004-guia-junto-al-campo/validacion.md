# Validación — Spec 004 Guía junto a cada campo

> 2026-10-21, rama `004-guia-junto-al-campo`. `npm run verificar` (tras los arreglos de la revisión): 53 archivos de tests, 540 tests en verde; `svelte-check` 0 errores y 0 avisos; compilación del frontal correcta. Sin cambios en `src-tauri/`, en el formato de las notas ni en el de `guia.md`.
> Navegador: `npm run dev` (serie de prueba en memoria), temas claro y oscuro. Tests ligeros (decisión del autor en la 003): la lógica y lo que escribe en disco, con tests; la interfaz, en el navegador.

## Requisito → prueba → resultado
| RF | Prueba | Resultado |
|---|---|---|
| 1, 8 | `campos-guia.test.ts` › cada regla de la tabla existe con la pieza esperada; G12 y G13 según nivel. Navegador: cada fila de la tabla enseña su regla en el panel (serie, temporada, episodio, escena, secreto, arco) y en Tramas (trama, personaje, relación), en el orden de la tabla | ✅ |
| 2 | Las reglas salen de la guía leída (`reglasDeCampo` filtra `reglasDe(guia, p)`); el texto es el de la guía | ✅ |
| 3 | `campos-guia.test.ts` › arco.quiere y arco.cambia por tipo; subtrama solo en B y C; magia solo activada | ✅ |
| 4 | `campos-guia.test.ts` › regla borrada o cambiada de pieza no sale | ✅ |
| 5 | `campos-guia.test.ts` › G50 nueva no va a ningún campo | ✅ |
| 6, 7 | Navegador: la regla sale al enfocar y se oculta al salir; Tab a «Lo sé» la mantiene; el clic con el ratón en «Lo sé» no se pierde | ✅ |
| 9 | Navegador: El eco y escenas de E02 (canon bloqueadas) sin reglas, en el panel y en Tramas; al desbloquear, salen | ✅ |
| 10, 11 | `marcas.test.ts` › no se cumple con sus avisos en el orden de Comprobar. Navegador: código, texto, fuente, marca y avisos | ✅ |
| 12 | `marcas.test.ts` › aparcada y descartada no se comprueban. Navegador: «Nando se va en E05» (descartada) en la pestaña Guía | ✅ |
| 13 | Navegador: la marca cambia al escribir (G02 al vaciar «Final decidido») y al deshacer | ✅ |
| 14 | `marcas.test.ts` › G07 comparte con G08 y G10; el botón dice «Lo sé · también …» | ✅ |
| 15 | `sesion.test.ts` › quitar «lo sé» vuelve a activar todas las variantes. Navegador: «Quitar «lo sé»» | ✅ |
| 16 | Navegador: «Ver en la Guía» desde el panel y desde Tramas elige la pieza, abre Guía, señala, desplaza y enfoca la regla | ✅ |
| 17 | Navegador: tras «Lo sé» (teclado y ratón) el foco queda en «Quitar «lo sé»»; tras deshacer, vuelve al campo | ✅ |
| 18 | `sesion.test.ts` › escribir y «Lo sé» enseguida son dos pasos de deshacer. Navegador: Ctrl Z con el foco en el botón deshace el «Lo sé» | ✅ |
| 19 | `marcas.test.ts` › siete marcas. Navegador: la pestaña Guía enseña la marca con icono y texto | ✅ |
| 20 | `guia-md.test.ts` › repetida (también entre Reglas y Magia, y en minúsculas): la primera y un aviso | ✅ |
| 21-24 | `campos-guia.test.ts` › «Nueva pieza» por tipo, subtrama aparte o con las propias, tramo. Navegador: temporada, secreto, episodio, escena, trama (trama, relación, personaje), trama de temporada y tramo de una trama A; el foco no sale de la ventana | ✅ |
| 25 | Comprobar, avisos de la pieza y referencias cortas sin cambios (sin diferencias en esos archivos salvo la clave de deshacer de «Lo sé») | ✅ |

| RNF | Prueba | Resultado |
|---|---|---|
| Rendimiento | `campos-guia.test.ts` › reglas y estado de un campo sobre 1.500 escenas en menos de 50 ms; las comprobaciones, en `rendimiento.test.ts` | ✅ |
| Compatibilidad v1.0 | `sesion.test.ts` › la v1.0 lee `avisos_silenciados` tras «Lo sé»; `guia.md` sin cambios de formato | ✅ |
| Seguridad | Sin `{@html}` (`sin-html.test.ts`); la regla señalada se busca por `dataset` | ✅ |
| Estabilidad visual | Navegador: Tab de una tarjeta de Tramas a «Lo sé» no la cierra; las rejillas `.f2` y `.gp` no se descolocan | ✅ |
| Accesibilidad | Navegador: `aria-describedby` del control apunta a la zona de reglas; marca con icono y texto; botones de 28 px | ✅ |

## A mano (pendiente del autor)
1. **Mac (WebKit):** pulsar con el ratón un campo que solo tiene botones (carga, Nivel, Test de relleno) enseña su regla; pulsar «Lo sé» no se pierde y deja el foco en «Quitar «lo sé»».
2. Windows con el instalador nuevo: lo mismo, y Tab por un episodio entero sin saltos.
3. Lector de pantalla (Narrador o VoiceOver): al enfocar «Final decidido» se lee la regla.
4. Abrir `_prueba` en la v1.0 tras marcar «Lo sé» desde un campo: el aviso sigue silenciado.
5. Sin manual: enfocar tres campos de piezas distintas, dejar una escena empezando y acabando igual (G42), «Lo sé» y Ctrl Z, «Nueva pieza» de una escena y de una trama.

## Riesgo apuntado
- `rendimiento.test.ts` › columnas del visor (spec 002) dio 124 ms dos veces en esta sesión con la verificación en paralelo y el servidor de desarrollo abierto; solo y en las siguientes verificaciones, en verde. No lo toca esta spec.

## Revisión independiente (código y seguridad)
Revisión independiente, sobre `git diff main...HEAD`. **0 críticos**, 5 importantes y 8 menores. Seguridad: sin hallazgos (sin `{@html}` ni `innerHTML`; texto de `guia.md` como texto; regla señalada por `dataset`; nada sale del equipo). Integridad y v1.0: sin hallazgos (`loSe` escribe `avisos_silenciados` con el id base y pasa por `aplicar`).

| # | Hallazgo | Arreglo | Prueba |
|---|---|---|---|
| 🟡1 | Un arrastre acaba en `pointercancel`: `pulsado` se quedaba en `true` y las reglas de los campos dejados no se ocultaban | `pulsado` vuelve a `false` con `pointerup`, `pointercancel`, `dragstart`, `dragend` y `blur`; una sola espera por campo | Lectura de código (el arrastre no se puede simular en el panel) |
| 🟡2 | Tramas: «Lo sé» (al sustituirse por «Quitar») o Ctrl Z (al desaparecer «Quitar») cerraban la tarjeta y el foco se perdía | La tarjeta ignora el `focusout` de un botón ya quitado y decide después del evento, mirando dónde está el foco | Navegador: «Bomba de tiempo» de «La cinta oculta»: Enter en «Lo sé» deja la tarjeta abierta y el foco en «Quitar»; Ctrl Z devuelve el foco al texto con las reglas visibles |
| 🟡3 | En la rejilla `.gp` la tarjeta encogía al salir las reglas y el primer clic podía perderse | Al entrar, la tarjeta fija su alto mínimo hasta que el foco sale | Navegador: `min-height` fijado solo en la tarjeta con el foco y liberado al salir |
| 🟡4 | Avisos de `guia.md` con el texto como clave: una regla repetida tres veces daba claves duplicadas | Clave por índice | `svelte-check` |
| 🟡5 | Contraste bajo 4,5:1: regla señalada (oscuro) y código de la regla sobre `--surface` (oscuro, 4,38) | Regla señalada solo con el borde; zona de reglas y «Lo que te pedirán tus guías» sobre `--surface-2` (4,84 claro, 4,56 oscuro) | `contraste.test.ts` › reglas de la guía |
| ⚪6 | `revisar` no miraba si el foco volvía al campo (pieza bloqueada desde fuera) | Si no entra, se ocultan las reglas | Lectura de código |
| ⚪7 | `enfocarLuego` caducado podía robar el foco más tarde | Se limpia al ocultar las reglas | Lectura de código |
| ⚪8 | El resaltado de «Ver en la Guía» se iba con la primera tecla | Se quita el efecto: `{#key pieza.id}` ya lo reinicia | Lectura de código |
| ⚪9 | Pulsar la cabecera de una tarjeta abierta dejaba el texto sin foco | Vuelve a enfocar el texto | Lectura de código |
| ⚪10 | Pegamento y «Por trama / Por tema» en dos cajas | Los botones van en la caja de la tarjeta | Navegador: un solo `[data-con-guia]` |
| ⚪11 | Tramo sin trama madre: reglas del botón de tipo oculto | Sin madre, «Elige la trama de la que es tramo para ver lo que te pedirán.» | Lectura de código |
| ⚪12 | Lector de pantalla: botones iguales en cada regla; la descripción leía los botones | Código de la regla en texto solo para lector; `aria-describedby` apunta al texto de cada regla | Navegador: `aria-describedby="reglas-…-0"`, botones «Lo sé (G20)» |
| ⚪13 | Tests | Añadidos los de contraste; el resto no, por la decisión de tests ligeros (interfaz en el navegador) | — |

Encontrado al comprobar: con una tarjeta de Tramas abierta, si se quitaba de la página con el foco dentro, `terminar` cambiaba estado durante el desmontaje (`state_unsafe_mutation`) y podía guardar en la pieza nueva. Arreglado con el mismo cambio que 🟡2: si la tarjeta ya no está en la página, no se toca ni se guarda. Navegador: sin errores nuevos en la consola.
