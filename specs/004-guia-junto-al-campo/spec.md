# Spec 004 — Guía junto a cada campo (entrega 4, parte 1 de 3)

> Solo el QUÉ y el POR QUÉ. Nada de tecnología, archivos ni esquemas: eso va en plan.md.
> Estado: aprobada (2026-10-21). Revisada por QA independiente (35 puntos, recogidos).

## Contexto y objetivo
La entrega 4 (Consecuencias) se parte en tres specs: **004 guía junto a cada campo**, 005 «Si lo dejas así…» y 006 «¿Y si…?» con variantes.

Hoy las reglas de la guía del autor (G01-G49 y, con magia, M01-M02) solo se leen en la pestaña Guía del panel, para la pieza entera, con un icono que no distingue «la juzgas tú» de «lo sé». Los avisos están en Comprobar. Al rellenar un campo no se ve qué pide la guía para ese campo ni si se cumple. Esta spec pone **la regla al lado del campo, en el momento de escribirlo**, con su marca y, si no se cumple, «Lo sé» y «Ver en la Guía» ahí mismo. La pestaña Guía pasa a usar las mismas marcas, con texto. La ventana «Nueva pieza» enseña lo que pedirán las guías para la pieza que se va a crear.

## Usuarios
El autor, en su PC con Windows y en su Mac Intel.

## Historias de usuario
- H1: Como autor quiero ver qué regla de mis guías toca el campo que estoy escribiendo para no tener que buscarla en otra pestaña.
- H2: Como autor quiero saber al momento si esa regla se cumple para corregirlo mientras escribo.
- H3: Como autor quiero poder seguir así a propósito desde el mismo campo para no interrumpir lo que hago.
- H4: Como autor quiero saber, antes de crear una pieza, qué me pedirán mis guías para ella.

## Definiciones
- **Campo:** lo que lleva una etiqueta en el panel o en las tarjetas de Tramas: un texto, una botonera, un selector de la wiki, un par lado a lado (Empieza · Acaba), una lista (Pistas sembradas) o una rejilla (Estado por temporada). La regla sale debajo del campo entero.
- **Marca de una regla en una pieza:** una de estas cinco, siempre con icono y texto:
  - «Se cumple»: la comprobación de la regla mira esa pieza y no da aviso.
  - «No se cumple»: la comprobación da al menos un aviso (no sugerencia) en esa pieza.
  - «Sugerencia»: solo da sugerencias en esa pieza.
  - «Lo sé»: sus avisos o sugerencias en esa pieza están silenciados con «lo sé».
  - «La juzgas tú»: la regla no tiene comprobación, o faltan los datos para comprobarla.
- **Aviso de una regla:** cada aviso o sugerencia que da su comprobación en esa pieza. Varias reglas pueden compartir comprobación (G07, G08 y G10 comparten la de C03): comparten también sus avisos y su «lo sé».

## Requisitos funcionales (EARS)

### Qué reglas van con cada campo
- RF-1: EL SISTEMA asociará a cada campo las reglas de la tabla «Campos y reglas» (abajo), con su condición si la tiene; un campo que no está en la tabla no tiene reglas.
- RF-2: EL SISTEMA tomará el texto, la fuente y la comprobación de cada regla de la guía del autor tal como la lee hoy; el autor no tiene que cambiar su guía.
- RF-3: EL SISTEMA solo mostrará junto a un campo las reglas que la pestaña Guía mostraría para esa pieza: las que la guía pone en el tipo de esa pieza, las de subtrama solo en arcos B o C de trama o de relación, y las de magia solo si la guía tiene la magia activada.
- RF-4: SI una regla de la tabla no está en la guía del autor, o el autor la cambió a otro tipo de pieza, ENTONCES EL SISTEMA no la mostrará junto al campo, sin avisar.
- RF-5: EL SISTEMA mostrará las reglas que el autor añada a su guía (G50…) solo en la pestaña Guía, no junto a un campo.

### Cuándo se ve
- RF-6: CUANDO cualquier parte de un campo con reglas reciba el foco, EL SISTEMA mostrará debajo del campo sus reglas.
- RF-7: MIENTRAS el foco esté en el campo o en los botones de su regla (RF-14, RF-15), EL SISTEMA seguirá mostrando la regla; CUANDO el foco salga de los dos, la ocultará.
- RF-8: SI un campo tiene más de una regla, ENTONCES EL SISTEMA las mostrará todas, una debajo de otra, en el orden de la tabla.
- RF-9: MIENTRAS la pieza sea canon bloqueada, EL SISTEMA no mostrará reglas junto a sus campos (no se pueden editar); su pestaña Guía las sigue mostrando.

### Qué dice
- RF-10: EL SISTEMA mostrará de cada regla su código, su texto, su fuente y su marca.
- RF-11: SI la marca es «No se cumple», «Sugerencia» o «Lo sé», ENTONCES EL SISTEMA mostrará debajo de la regla todos sus avisos en esa pieza, con el mismo texto y en el mismo orden que en Comprobar.
- RF-12: MIENTRAS la pieza esté aparcada o descartada, EL SISTEMA dará a cada regla la marca «No se comprueba: está aparcada» o «… descartada», en lugar de las cinco marcas.
- RF-13: CUANDO cambie la pieza mientras la regla se ve (el autor escribe, deshace o llega un cambio de fuera), EL SISTEMA pondrá al día la marca y los avisos sin esperar a que el campo pierda el foco; en los campos que guardan al salir (protagonistas, selectores de la wiki) se ponen al día al guardarse.

### Qué se puede hacer
- RF-14: SI la marca es «No se cumple» o «Sugerencia», ENTONCES EL SISTEMA ofrecerá un botón «Lo sé» que silencia esos avisos en esa pieza, igual que en Comprobar; SI la comprobación la comparten otras reglas, ENTONCES el botón dirá cuáles quedan también en «Lo sé» («Lo sé · también G08, G10»).
- RF-15: SI la marca es «Lo sé», ENTONCES EL SISTEMA ofrecerá «Quitar «lo sé»», que los vuelve a activar.
- RF-16: SI la marca es «No se cumple», «Sugerencia» o «Lo sé», ENTONCES EL SISTEMA ofrecerá «Ver en la Guía», que elige la pieza en el panel si no lo estaba, abre su pestaña Guía, la desplaza hasta esa regla y la resalta.
- RF-17: CUANDO el autor pulse «Lo sé», EL SISTEMA dejará el foco en el botón «Quitar «lo sé»» que lo sustituye, con la regla todavía a la vista; CUANDO pulse «Quitar «lo sé»», lo dejará en el «Lo sé» que vuelve.
- RF-18: CUANDO el foco esté en un botón de la regla, EL SISTEMA tratará Ctrl Z como fuera de un campo: deshace el último paso. Cada «Lo sé» o «Quitar «lo sé»» es un paso propio de deshacer, aparte de lo escrito justo antes.

### La pestaña Guía
- RF-19: EL SISTEMA mostrará en la pestaña Guía la marca de cada regla con su icono y su texto, las mismas cinco marcas (y la de RF-12), en lugar de solo el icono.
- RF-20: SI la guía tiene dos reglas con el mismo código, ENTONCES EL SISTEMA usará solo la primera, en la pestaña Guía y junto a los campos, y lo dirá entre los avisos de la guía («Regla G07 repetida: se usa la primera»).

### «Nueva pieza»
- RF-21: MIENTRAS la ventana «Nueva pieza» esté abierta, EL SISTEMA mostrará a la derecha «Lo que te pedirán tus guías» con las reglas que aplican al tipo de pieza elegido (código, texto y fuente, sin marca).
- RF-22: DONDE la pieza nueva sea un arco de trama o de relación, EL SISTEMA añadirá aparte, bajo «Si es subtrama (B o C)», las reglas de subtrama; SI ya nace B o C (trama de temporada, o tramo de una trama B o C), ENTONCES las pondrá con las propias.
- RF-23: CUANDO el autor cambie en la ventana el tipo de pieza, EL SISTEMA pondrá al día esa lista.
- RF-24: SI el tipo elegido no tiene reglas en la guía, o la guía no se puede leer, ENTONCES EL SISTEMA dirá «Tus guías no piden nada para esta pieza: escribe libre».

### Lo que sigue igual
- RF-25: EL SISTEMA mantendrá sin cambios la pestaña Comprobar, los avisos de la pieza y la referencia corta que ya llevan algunos campos (§12, D7…).

## Campos y reglas
Propuesta para revisar. El código es el de la guía inicial. Los campos de arco están en las tarjetas de Tramas o en el panel; la regla sale donde esté el campo.

| Pieza | Campo | Reglas (condición) |
|---|---|---|
| Serie | Logline en 5 piezas | G05 |
| Serie | Pregunta de oro | G03 |
| Serie | Final decidido | G02 |
| Serie | Preguntas filosóficas | G04 |
| Serie | Dinámica de la historia | G06 |
| Arco de trama | Qué quiere y por qué | G07 |
| Arco de trama | Qué gana / qué pierde | G08, G09 |
| Arco de trama | Cómo cambia | G11 |
| Arco de trama | Nivel | G12 (tipo A, nivel serie), G13 (nivel temporada) |
| Arco de trama | Acaba (a mano) | G12 (tipo A, nivel serie), G13 (nivel temporada), G15, G17 |
| Arco de trama | Empieza (a mano) | G15, G17 |
| Arco de trama o de relación | Bomba de tiempo · Vence la bomba | G10, G20 |
| Arco de trama o de relación | Protagonista(s) de la trama · Protagonistas del vínculo | G16 |
| Arco de trama o de relación | Pegamento con la principal | G19 |
| Arco de personaje | Qué quiere | G21 |
| Arco de personaje | Qué necesita | G22 |
| Arco de personaje | Cómo cambia | G23, G24 |
| Arco de personaje | Estado por temporada | G25 |
| Arco de relación | Cómo cambia | G26, G27, G28 |
| Temporada | Pregunta dramática | G33 |
| Temporada | Trama principal | G35 |
| Temporada | Carga al empezar · Carga al acabar | G34 |
| Temporada | Story Circle | G29 |
| Temporada | Crisis | G30 |
| Temporada | Clímax | G31 |
| Temporada | Punto de llegada | G32 |
| Temporada | Cierre / cliffhanger | G33 |
| Episodio | Idea central en una frase | G36 |
| Episodio | Protagonista del capítulo · Qué quiere · Fuerza antagónica · Conflicto · Acción · Contexto | G37 |
| Episodio | Carga al empezar · Carga al acabar | G38 |
| Episodio | Desenlace | G39 |
| Episodio | Gancho final | G40 |
| Escena | Valor en juego · Empieza · Acaba | G42 |
| Escena | Qué gana · Qué pierde | G41 |
| Escena | Test de relleno | G43 |
| Escena | Cuándo ocurre en el mundo | G45 |
| Escena | Descripción | G44, M01 |
| Secreto | La verdad · solo autor | G49 |
| Secreto | Se revela en | G46 |
| Secreto | Pistas sembradas · Pistas falsas | G47, M02 |
| Secreto | Lo conocen · Qué cree la audiencia hasta entonces | G48 |

- Las reglas de subtrama (G16, G17, G19, G20) solo salen en arcos B o C (RF-3).
- Sin campo (solo en la pestaña Guía): G01, G14, G18 y las reglas de serie en un punto clave.

## Requisitos no funcionales
- Rendimiento: la regla aparece al enfocar el campo en menos de 50 ms, y la marca se pone al día en menos de 100 ms tras un cambio, también en la serie grande (1.500 escenas). Escribir no se nota más lento que hoy.
- Compatibilidad con la v1.0 (constitución 9): la guía del autor no cambia de formato. «Lo sé» escribe lo mismo que ya escribe Comprobar.
- Integridad de la vault (constitución 2): «Lo sé» pasa por el guardado de siempre. Si la nota cambió fuera, se aplica lo de la spec 002: no se pisa, se relee y se avisa.
- Seguridad: el texto, la fuente y los avisos se muestran como texto plano, sin interpretar HTML ni Markdown; los `[[enlaces]]` de la fuente salen tal cual.
- Estabilidad visual: pasar con Tab del campo a los botones de su regla no cambia el tamaño ni el sitio del campo.
- Accesibilidad: el lector de pantalla anuncia las reglas y su marca como descripción del campo al enfocarlo. Los botones de la regla se alcanzan con Tab justo después del campo. El texto llega a 4,5:1 en los dos temas. La marca lleva icono y texto.
- Intuitiva sin manual: al escribir en un campo se entiende qué pide la guía y si se cumple sin leer instrucciones.
- Idioma: español.

## Datos personales
Ninguno. Solo notas de ficción del autor.

## Casos límite
- Guía que no se puede leer o que no existe: los campos no muestran reglas; la pestaña Guía sigue como hoy (ofrece crear la guía).
- El autor cambia el texto de una regla: junto al campo sale el texto nuevo al recargarse la guía. Si reutiliza un código con otro sentido, la regla sale en el campo de la tabla igualmente: la app no puede saberlo.
- Marca que no depende del texto del campo (G17, G12, G40 se calculan con las escenas o la estructura): escribir en el campo no la cambia; los avisos dicen de dónde viene.
- Comprobación compartida: G07, junto a «Qué quiere y por qué», puede salir «No se cumple» por un aviso que habla de lo que gana. El aviso lo dice, y «Lo sé» avisa de qué otras reglas silencia (RF-14).
- Aviso de una comprobación sin regla para esa pieza (por ejemplo, C13 en un arco de personaje): solo sale en Comprobar y en los avisos de la pieza.
- Campos que se leen de la ficha del personaje (Qué quiere, Qué necesita y Herida y mentira, en solo lectura): no tienen foco ni regla al lado; la regla está en la pestaña Guía.
- Campo vacío: la regla sale igual; la marca depende de la comprobación.
- El botón con el foco desaparece porque la regla pasa a cumplirse (lo arregla un cambio de fuera o un deshacer): el foco vuelve al campo.
- El campo con foco desaparece (cambia la pieza elegida o se borra fuera): la regla se oculta con él.
- La pieza pasa a canon bloqueada con la regla a la vista: la regla se oculta (RF-9).
- Panel estrecho: el texto de la regla se parte en varias líneas, sin cortarse ni desplazar el panel en horizontal.

## Fuera de alcance
- Elegir desde la app qué reglas van con cada campo, o añadir la columna «campo» a la guía (la v1.0 dejaría de leer la guía).
- Comprobaciones nuevas, o separar en varias una comprobación compartida.
- «Qué se podría hacer» para cada aviso, el efecto en «Nueva pieza» y resaltar lo afectado en el visor (spec 005).
- «¿Y si…?» con variantes (spec 006).
- Editar la guía desde la app (se edita a mano, como en la v1).
- Cambiar la Captura (+ Idea, Ctrl I): sigue sin reglas.

## Criterios de finalización
- Cada RF con su test en verde (la lógica: reglas por campo y pieza con sus condiciones, las cinco marcas, aparcado y descartado, magia, subtramas, reglas repetidas) o con su prueba en la interfaz (lo visual), según la decisión de tests ligeros de la 003.
- Prueba a mano del autor, en `_prueba` y sin manual:
  - enfocar tres campos de piezas distintas y ver su regla y su marca;
  - dejar una escena empezando y acabando igual y ver G42 pasar a «No se cumple»;
  - marcar «Lo sé» desde el campo y deshacerlo con Ctrl Z (el foco queda en «Quitar «lo sé»»);
  - abrir «Nueva pieza» de una escena y de una trama.
- `npm run verificar` en verde y revisión de seguridad sin críticos.

## Dudas resueltas
1. Tres specs para la entrega 4; esta es la primera.
2. La regla sale al enfocar el campo (RF-6).
3. Con su marca y sus avisos (RF-10, RF-11).
4. También en «Nueva pieza» (RF-21).
5. Desde el campo, «Lo sé» y «Ver en la Guía» (RF-14, RF-16).
6. Tras «Lo sé», el foco queda en «Quitar «lo sé»», y Ctrl Z lo deshace (RF-17, RF-18; decidido tras la revisión del plan).
7. Decidido sin preguntar, tras la revisión QA:
   - la tabla campo → regla la fija la app (añadir una columna a la guía rompería la v1.0);
   - cinco marcas con texto, separando «Sugerencia» y «Lo sé», también en la pestaña Guía (RF-19);
   - en canon bloqueado no hay reglas junto al campo (RF-9);
   - una trama de temporada o un tramo de una trama B o C ya es subtrama: en «Nueva pieza» sus reglas de subtrama van con las propias (RF-22);
   - lo aparcado y lo descartado no se comprueban (RF-12, como en la spec 001);
   - «Lo sé» dice qué otras reglas silencia (RF-14);
   - regla repetida: la primera, con aviso (RF-20; hoy la pestaña Guía puede fallar con dos códigos iguales);
   - sin «idea suelta» en «Nueva pieza» (la idea va por la Captura).

## Dudas abiertas
- Ninguna. Tabla «Campos y reglas» aprobada tal cual.
