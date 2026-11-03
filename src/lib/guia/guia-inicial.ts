// Primer juego de reglas de appDatos/guia.md (T6.1): las máximas de la maqueta
// (objeto GUIA, sacadas de la chuleta de escritura y de las reglas del vault)
// y una regla por cada comprobación de la tabla 3.6 que no tenía máxima.
// Si guia.md no existe, Atelier puede crearlo con este texto.

export const GUIA_INICIAL = `---
tipo: guia
magia: false
---
# Guía de Atelier

Las máximas que Atelier enseña en la pestaña Guía. Se pueden editar a mano: una fila por regla. La columna «comprobación» dice qué aviso la vigila (ver la tabla 3.6 del plan); vacía, la regla solo se lee.

Piezas válidas: serie · arco de trama · arco de personaje · arco de relación · subtrama · temporada · episodio · evento · secreto.

## Reglas

| id | pieza | texto | fuente | comprobación |
| --- | --- | --- | --- | --- |
| G01 | serie | Las 10-11 preguntas, como lista antes de dar la historia por planeada. | §29 | |
| G02 | serie | Decide el final antes de escribir, aunque sea en una línea. | §18 · F1.6 | C18 |
| G03 | serie | La pregunta de oro nace al inicio; el final la responde. | §18 | |
| G04 | serie | Todo nace de los personajes enfrentándose a sus creencias: conflicto externo, interno y filosófico. | §3 | |
| G05 | serie | Logline: protagonista, objetivo, problema, acción y catalizador. Si no cabe en un párrafo, es pronto. | §4 | |
| G06 | serie | Define la dinámica de la historia y repítela: siempre conflicto, cada vez más difícil, y cada capítulo acerca a la meta. | §25 | |
| G07 | arco de trama | Deja muy claro qué quiere y por qué lo quiere. | §10 | C03 |
| G08 | arco de trama | Todo conflicto trae algo que ganar y algo que perder. | §10 | C03 |
| G09 | arco de trama | El riesgo es relativo a la situación del personaje, no absoluto. | §10 | |
| G10 | arco de trama | Bomba de tiempo: una cuenta atrás que, al llegar a cero, hace estallar la consecuencia. | §10 | C03 |
| G11 | arco de trama | Usa las consecuencias como motor: dos pasos adelante, uno atrás. | §3 | |
| G12 | arco de trama | La trama principal llega hasta el final de la serie: no la cierres antes del último episodio. | §12 | C12 |
| G13 | arco de trama | Un arco de temporada se cierra dentro de su temporada. | §12 | C10 |
| G14 | arco de trama | Que ningún arco desaparezca demasiados episodios seguidos: el público lo olvida. | §25 | C11 |
| G15 | arco de trama | Si fijas a mano dónde empieza o acaba, que coincida con los eventos que lo abren y lo cierran. | Diseño 4.4 | C13 |
| G16 | subtrama | Dale su propio protagonista y su propio conflicto. | §13 | C05 |
| G17 | subtrama | Arranca después de presentar la principal y se resuelve antes. | §13 | C06 |
| G18 | subtrama | Proporción 70/30 entre la principal y la subtrama. | §13 | C07 |
| G19 | subtrama | Únela a la principal por trama o, mejor, por tema. | §13 | |
| G20 | subtrama | En B y C la bomba de tiempo no es obligatoria, pero ayuda. | §10 | C04 |
| G21 | arco de personaje | Separa la razón que se da a sí mismo de su razón real. | §3 | |
| G22 | arco de personaje | El choque entre lo que quiere y lo que necesita es su arco. | Met. 1.6 | C17 |
| G23 | arco de personaje | El cambio es gradual: creencias que se traducen en acciones. | §3 | |
| G24 | arco de personaje | Su final llega cuando aprende la lección sobre su defecto inicial. | §18 | |
| G25 | arco de personaje | Anota cómo está al empezar y al terminar cada temporada. | Plantilla Temporada | C17 |
| G26 | arco de relación | Un arco de relación cuenta cómo cambia un vínculo: de dónde parte y a dónde llega. | Plantilla Arco | |
| G27 | arco de relación | Usa las consecuencias como motor: dos pasos adelante, uno atrás. | §3 | |
| G28 | arco de relación | Si es romance: tal vez sí, tal vez no, y una separación que parece irreversible antes de resolverse. | §26 | |
| G29 | temporada | Cada temporada recorre su propio Story Circle y deja un gancho. | §12 | |
| G30 | temporada | Punto de crisis: lo peor que le puede pasar, justo antes del clímax. | §17 | |
| G31 | temporada | Antes del clímax: quién es, qué quiere, qué pasa si falla y quién se opone. | §17 | |
| G32 | temporada | No resuelvas el conflicto general salvo en la última temporada. | §12 | |
| G33 | temporada | Siempre una incógnita abierta: antes de resolver una pregunta, planta otra. | §11 | |
| G34 | temporada | La carga cambia: si empieza en +, acaba en −, y empieza como acabó la anterior. | §12 | C01 |
| G35 | temporada | Elige su trama principal: con ella se comprueban las subtramas. | Decisión D7 | C19 |
| G36 | episodio | Resume la idea central en una frase. Varias ideas a la vez lo vuelven confuso. | §12 | |
| G37 | episodio | Protagonista del capítulo, deseo, fuerza antagónica, conflicto, acción y contexto. | §12 | |
| G38 | episodio | Si acaba en +, el siguiente empieza en + y acaba en −. | §12 | C01 |
| G39 | episodio | Nunca resuelvas el conflicto general dentro de un episodio, salvo en el último. | §12 | |
| G40 | episodio | Que cada episodio acabe con alguna incógnita abierta. | §11 | C16 |
| G41 | evento | Cada escena tiene su microconflicto: algo que ganar y algo que perder. | §10 | C09 |
| G42 | evento | Toda escena cambia un valor. Si empieza y acaba igual, sobra o se fusiona. | Escena 1.3 · F5 | C02 |
| G43 | evento | Test de relleno: ¿hace avanzar a algún protagonista? ¿Da información o desarrolla a alguien? | §25 | C08 |
| G44 | evento | Los problemas los resuelve el propio protagonista, nunca otro por él. | §16 | |
| G45 | evento | Si ocurre en otro tiempo del mundo, márcalo: no mezcles la Timeline con el orden de emisión. | Regla 13 | |
| G46 | secreto | Constrúyelo desde el final: decide la revelación y luego siembra las pistas. | §15 · F4 | C14 |
| G47 | secreto | Inesperado pero coherente: las pistas tienen que encajar con la revelación. | §15 | C15 |
| G48 | secreto | Intriga, suspenso o misterio: decide quién lo sabe, el personaje o el público. | §11 | |
| G49 | secreto | La verdad no se copia en resúmenes ni loglines antes de revelado_en. | Regla 10 | |

## Magia

Se activa poniendo \`magia: true\` arriba, cuando esté cerrada la sesión de magia.

| id | pieza | texto | fuente | comprobación |
| --- | --- | --- | --- | --- |
| M01 | evento | No resuelvas un conflicto con magia que el público no entiende. | Magia §1 · Ley 1 | |
| M02 | secreto | Siembra las excepciones antes de usarlas: si la revelación o la solución usa magia, el público tiene que entender antes esa regla. | Magia §6 | |
`;
