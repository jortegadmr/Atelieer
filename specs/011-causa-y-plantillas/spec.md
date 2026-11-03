# Spec 011 — Análisis: causa y efecto y plantillas de estructura (entrega 6, parte 2)

> Solo el QUÉ y el POR QUÉ. Nada de tecnología, archivos ni esquemas: eso va en plan.md.
> Estado: aprobada por el autor el 2026-10-23 («tienes mi aprobación, continúa; elige lo más recomendado»). Revisada por un QA independiente (30 puntos, recogidos aquí con la opción recomendada).

## Contexto y objetivo
Segunda parte de G10 (ver spec 010). Quedan dos piezas: causa y efecto entre escenas, y plantillas de estructura superpuestas.

Decisiones del autor (2026-10-23):
1. Causa y efecto une **escena con escena**: cada escena dice de qué escenas viene; lo que provoca se calcula.
2. Se ve en el panel de la escena y en una pestaña nueva de «Análisis», «Causa y efecto».
3. Una causa que se emite después de su efecto se permite, con marca visible (flashback o revelación).
4. Plantillas: guía superpuesta en la rejilla **y** momentos que se atan a un episodio (y, si se quiere, a una escena), con texto.
5. Cuatro plantillas fijas: Tres actos, Story Circle, Save the Cat y Viaje del héroe.
6. Cada momento se ata a un episodio; la escena es opcional.
7. Se pueden rellenar las cuatro; en la rejilla se ve una (o ninguna), y la elección se recuerda por temporada.
8. Un momento lejos de su sitio previsto solo se ve; no hay aviso.

**Por qué.** Hoy el autor ordena escenas, pero no puede decir qué escena provoca cuál ni ver cadenas rotas o escenas que no llevan a nada. Y tiene Tres actos y Story Circle como texto, sin poder ver si la temporada respeta el ritmo de una estructura conocida.

## Usuarios
El autor, en su PC con Windows y en su Mac Intel.

## Historias de usuario
- H1: Como autor quiero apuntar en una escena de qué escenas viene, para que la historia sea una cadena de causas y no una lista de hechos.
- H2: Como autor quiero ver qué provoca cada escena y saltar a ella.
- H3: Como autor quiero ver las cadenas de una temporada y las escenas que no vienen de nada ni llevan a nada.
- H4: Como autor quiero elegir una estructura conocida y verla sobre los episodios, para comprobar el ritmo.
- H5: Como autor quiero atar cada momento de esa estructura a un episodio o una escena, con una frase.

## Definiciones
- **Escena:** pieza «evento» de la serie. **Escena viva:** como en la spec 010 (ni aparcada ni descartada).
- **Orden de emisión:** el de la spec 009: temporada, episodio y número de escena; la bandeja detrás de los episodios de su temporada; «Sin temporada» al final.
- **Dónde se emite:** el texto de la spec 009 (RF-8): «T01E03 · 2», «Bandeja T01» o «Sin temporada». Es también el código por el que se busca una escena.
- **Viene de:** lista de escenas que causan esta escena. Dato nuevo en la escena, que apunta a cada causa de forma que reordenar o renombrar (también en la v1.0) no rompa el enlace.
- **Provoca:** escenas cuyo «Viene de» incluye esta. Se calcula; no se guarda.
- **Enlace activo:** causa o efecto que existe y no está descartado.
- **Causa tardía:** causa con episodio que va después de su efecto con episodio, en orden de emisión.
- **Causa sin sitio:** causa sin episodio (bandeja o «Sin temporada») de un efecto con episodio.
- **Escena de la pestaña:** escena viva con episodio de la temporada elegida.
- **Escena suelta:** escena de la pestaña sin ningún enlace activo, ni de causa ni de efecto. Un enlace a otra temporada, a la bandeja o a una aparcada es activo; uno a una escena descartada o que ya no está, no.
- **Plantilla:** lista fija de momentos (ver C), cada uno con nombre, explicación corta y sitio previsto: un punto (un %) o un tramo (de % a %).
- **Momento rellenado:** momento con texto, episodio o escena. **Momento atado:** el que tiene episodio.
- **Plantilla a la vista:** la elegida en la rejilla de la temporada, o ninguna.
- **N de la temporada:** el mayor entre los episodios creados y los previstos.

## Requisitos funcionales (EARS)

### A. Viene de y Provoca
- RF-1: EL SISTEMA mostrará en el panel de la escena, en «Editar», el campo «Viene de» con las escenas que la causan, en orden de emisión, cada una con su título y dónde se emite.
- RF-2: CUANDO el autor añada una causa, EL SISTEMA ofrecerá un buscador con las escenas no descartadas de toda la serie (otras temporadas, bandeja, aparcadas y «Sin temporada»), por título y por dónde se emite, sin la propia escena ni las que ya están.
- RF-3: CUANDO el autor quite una causa, EL SISTEMA la quitará solo de esta escena.
- RF-4: EL SISTEMA mostrará en el panel de la escena «Provoca»: las escenas que la tienen en «Viene de», en orden de emisión. No se edita ahí.
- RF-5: CUANDO el autor pulse una escena de «Viene de» o «Provoca», EL SISTEMA la abrirá en el panel.
- RF-6: EL SISTEMA marcará con texto, sin bloquear:
  - en «Viene de», una causa tardía con «se ve después» y una causa sin sitio con «sin sitio todavía»;
  - en «Provoca», el efecto de una causa tardía con «se ve antes»;
  - una escena aparcada con «(aparcada)», en los dos campos.
- RF-7: SI una causa está descartada o ya no existe, ENTONCES EL SISTEMA la enseñará como «(descartada)» o «(ya no está)», la conservará y dejará quitarla.
- RF-8: SI una escena descartada tiene «Viene de», ENTONCES EL SISTEMA lo conservará, y la escena saldrá en el «Provoca» de sus causas con la marca «(descartada)».
- RF-9: SI «Viene de» está escrito en disco de una forma que la app no entiende (un texto suelto, un enlace, un código, algo que no apunta a ninguna escena), ENTONCES EL SISTEMA enseñará esas entradas como «(no se entiende)», las conservará tal cual y no las reescribirá mientras el autor no las quite. Si el campo entero no es una lista, se enseña sin dejar cambiarlo, con el motivo.
- RF-10: SI la escena está en canon bloqueado, ENTONCES EL SISTEMA enseñará «Viene de» sin dejar cambiarlo, como el resto de sus campos. Dentro de una variante sí se cambia, y al aplicar se pide desbloquear (spec 006, RF-34).
- RF-11: CUANDO el autor cambie «Viene de», EL SISTEMA lo guardará como cualquier otro campo de la escena: un paso de Ctrl Z, y dentro de la variante si hay una activa.
- RF-12: SI una causa crearía un círculo (A viene de B y B, directa o indirectamente, de A), ENTONCES EL SISTEMA lo permitirá y marcará las escenas del círculo con «círculo» en el panel y en la pestaña.
- RF-13: EL SISTEMA tratará «Viene de» como un campo más en diferencias, choques, «Lado a lado» y «Si lo dejas así…» (specs 005 y 006), con el título de cada escena, sin avisos nuevos.
- RF-14: EL SISTEMA no tratará una causa que ya no existe como referencia rota que impida aplicar una variante: al aplicar, se conserva y se enseña «(ya no está)» (RF-7).

### B. Pestaña «Causa y efecto»
- RF-15: EL SISTEMA añadirá a la vista «Análisis» una cuarta pestaña, «Causa y efecto», con el mismo selector de temporada.
- RF-16: EL SISTEMA mostrará las cadenas de la temporada elegida. Inicio de cadena es cada escena de la pestaña sin causas activas entre las escenas de la pestaña, que provoca alguna escena de la pestaña o tiene alguna causa activa fuera de ella.
- RF-17: EL SISTEMA ordenará los inicios en orden de emisión y bajará por cada uno en profundidad: debajo de cada escena, sangradas, las escenas de la pestaña que provoca, en orden de emisión.
- RF-18: SI una escena sale más de una vez al recorrer las cadenas, ENTONCES EL SISTEMA la enseñará entera la primera vez y como «ver arriba» las siguientes, sin bajar de nuevo por ella. Así un círculo no entra en bucle.
- RF-19: SI un círculo no tiene inicio (todas sus escenas vienen de otras del círculo), ENTONCES EL SISTEMA empezará su cadena por su escena más temprana en orden de emisión, tras los demás inicios, marcada «círculo».
- RF-19b: SI tras RF-16 a RF-19 queda alguna escena de la pestaña sin enseñar que no es suelta (por ejemplo, una que solo provoca escenas de fuera, o un círculo al que entra una causa de fuera), ENTONCES EL SISTEMA le abrirá su propia cadena, en orden de emisión. Toda escena de la pestaña sale en una cadena o en las sueltas.
- RF-19c: SI una escena tiene su propio id en «Viene de» (escrito a mano), ENTONCES EL SISTEMA lo tratará como «(no se entiende)» (RF-9): no cuenta como causa ni como círculo.
- RF-20: EL SISTEMA enseñará junto a cada escena sus enlaces activos fuera de la pestaña, como referencia y sin bajar por ellos, con dónde se emite y su marca: «viene de T01E04 · 2», «viene de Bandeja T02 (sin sitio todavía)», «viene de T02E01 · 3 (aparcada)», «provoca T03E02 · 1».
- RF-21: EL SISTEMA mostrará aparte, debajo, las escenas sueltas de la temporada, en orden de emisión, como información y sin aviso.
- RF-22: EL SISTEMA marcará en la pestaña las causas tardías y los círculos con texto, nunca solo color.
- RF-23: CUANDO el autor pulse una escena de la pestaña, EL SISTEMA la abrirá en el panel, en «Editar».
- RF-24: MIENTRAS haya lente, EL SISTEMA atenuará cada escena no relacionada por sí sola, como en la spec 010 (RF-4).
- RF-25: SI la temporada no tiene escenas con causa ni efecto, ENTONCES EL SISTEMA dirá «Aún no hay causas en esta temporada» y que se apuntan en «Viene de» del panel de la escena.

### C. Plantillas
- RF-26: EL SISTEMA tendrá cuatro plantillas fijas, con estos momentos y sitios previstos:

  **Tres actos** (los cuatro momentos de la «Estructura» §17 de hoy)
  | Momento | Sitio | Explicación |
  |---|---|---|
  | Detonante | 10-15 % | Lo que rompe la normalidad y pone la temporada en marcha |
  | Punto medio | 50 % | Giro que cambia lo que está en juego |
  | Crisis | 75 % | El peor momento; todo parece perdido |
  | Clímax | 85-95 % | El enfrentamiento final que resuelve la pregunta dramática |

  **Story Circle** (los 8 pasos de hoy; cada uno, un octavo)
  | Paso | Sitio |
  |---|---|
  | 1 · Tú | 0-12,5 % |
  | 2 · Necesidad | 12,5-25 % |
  | 3 · Ir | 25-37,5 % |
  | 4 · Buscar | 37,5-50 % |
  | 5 · Encontrar | 50-62,5 % |
  | 6 · Pagar | 62,5-75 % |
  | 7 · Volver | 75-87,5 % |
  | 8 · Cambiar | 87,5-100 % |

  **Save the Cat** (Blake Snyder)
  | Momento | Sitio | Explicación |
  |---|---|---|
  | Imagen de apertura | 1 % | Cómo está el protagonista antes del cambio |
  | Tema expuesto | 5 % | Alguien dice de qué va la historia |
  | Planteamiento | 1-10 % | Su mundo, lo que le falta y quién le rodea |
  | Catalizador | 10 % | Lo que lo cambia todo |
  | Debate | 10-20 % | Duda: ¿va o no va? |
  | Paso al segundo acto | 20 % | Decide y entra en el mundo nuevo |
  | Trama B | 22 % | Llega la historia secundaria, a menudo de amor o amistad |
  | Diversión y juegos | 20-50 % | La promesa de la premisa |
  | Punto medio | 50 % | Falsa victoria o falsa derrota; sube lo que está en juego |
  | Los malos estrechan el cerco | 50-75 % | Presión de fuera y dudas de dentro |
  | Todo está perdido | 75 % | El golpe más bajo; algo muere |
  | Noche oscura del alma | 75-80 % | Toca fondo |
  | Paso al tercer acto | 80 % | Encuentra la solución, a menudo gracias a la trama B |
  | Final | 80-99 % | Aplica lo aprendido y vence |
  | Imagen final | 100 % | El reflejo de la imagen de apertura: el cambio |

  **Viaje del héroe** (Christopher Vogler)
  | Etapa | Sitio | Explicación |
  |---|---|---|
  | Mundo ordinario | 0-10 % | El héroe en su vida de siempre |
  | Llamada a la aventura | 10 % | Aparece el problema o el reto |
  | Rechazo de la llamada | 12 % | Miedo o duda |
  | Encuentro con el mentor | 15-20 % | Alguien le da consejo, ayuda o un objeto |
  | Cruce del primer umbral | 25 % | Entra en el mundo especial |
  | Pruebas, aliados y enemigos | 25-50 % | Aprende las reglas del mundo nuevo |
  | Acercamiento a la caverna | 50-60 % | Se prepara para la prueba mayor |
  | Odisea | 60 % | La prueba suprema; roza la muerte |
  | Recompensa | 65-75 % | Consigue lo que buscaba |
  | El camino de vuelta | 75 % | Las consecuencias le persiguen |
  | Resurrección | 90 % | Última prueba; renace cambiado |
  | Regreso con el elixir | 95-100 % | Vuelve con algo que cambia su mundo |

- RF-27: EL SISTEMA convertirá un sitio en episodios con N de la temporada:
  - un punto de p % va en el episodio techo(p × N / 100), con mínimo 1;
  - un tramo de a % a b % va desde el episodio piso(a × N / 100) + 1 (como mucho N) hasta techo(b × N / 100) (como poco el de inicio).
  - Ejemplos: N = 1, todo en E01. N = 6: 50 % → E03; 75 % → E05; 85-95 % → E06; 0-12,5 % → E01. N = 10: 50 % → E05; 50-60 % → E06; 0-10 % → E01; 100 % → E10.
- RF-28: EL SISTEMA mostrará en el panel de la temporada, en «Editar», un apartado por plantilla. «Estructura (tres actos)» y «Story Circle» sustituyen a los bloques de hoy y mantienen sus guías (§17, §12, G29). Save the Cat y Viaje del héroe van plegados mientras no tengan nada. La caja «Estructura» de la vista de temporada no cambia.
- RF-29: EL SISTEMA mostrará en cada momento: su nombre, su sitio previsto, su explicación junto al campo, un texto, un episodio de la temporada y una escena. El buscador de escena ofrece las escenas no descartadas de la temporada que tienen episodio; elegir una pone su episodio en el momento.
- RF-30: SI el autor cambia el episodio de un momento y su escena es de otro episodio, ENTONCES EL SISTEMA quitará la escena del momento.
- RF-31: CUANDO el autor cambie un momento, EL SISTEMA lo guardará como cualquier campo de la temporada: un solo paso de Ctrl Z también cuando poner la escena cambia el episodio o cambiar el episodio quita la escena; dentro de la variante si hay una activa; bloqueado en canon como RF-10.
- RF-32: EL SISTEMA guardará el texto y el episodio de Tres actos y el texto del Story Circle donde ya están hoy, para que la v1.0 los siga viendo igual. Lo nuevo (escena de Tres actos, episodio y escena del Story Circle, Save the Cat y Viaje del héroe) irá donde la v1.0 lo conserve sin tocarlo.
- RF-33: SI la escena de un momento ya no está en su episodio (se movió, el episodio se borró o la v1.0 cambió el episodio del momento), ENTONCES manda el episodio del momento: EL SISTEMA conservará la escena y la enseñará «(en otro episodio)», «(descartada)» o «(ya no está)».
- RF-34: SI el episodio de un momento ya no existe o es de otra temporada, ENTONCES EL SISTEMA lo enseñará «(ya no está)» en el panel, lo conservará y no lo marcará en la rejilla.
- RF-35: EL SISTEMA tratará los momentos como campos en diferencias, choques, «Lado a lado» y «Si lo dejas así…», con el nombre del momento, sin avisos nuevos; un episodio o escena nuevos (no el episodio de Tres actos, que sigue como en la spec 006) que ya no está no impide aplicar una variante (como RF-14).
- RF-36: EL SISTEMA mostrará en la rejilla de la temporada un selector «Plantilla»: Ninguna, Tres actos, Story Circle, Save the Cat, Viaje del héroe.
- RF-37: MIENTRAS haya plantilla a la vista, EL SISTEMA dibujará sobre las columnas de los episodios una franja por momento, en los episodios de RF-27, con su nombre.
- RF-38: SI N es mayor que los episodios creados, ENTONCES EL SISTEMA añadirá al final de la rejilla una columna «Previstos: E04-E10» (con los números que tocan) con las franjas que caen ahí. Si no hay ningún episodio creado, la rejilla enseña solo esa columna. Para poder cambiar N, el campo «Episodios previstos» del panel de la temporada se ve también cuando ya hay episodios.
- RF-39: SI hay más de 4 franjas en una columna, ENTONCES EL SISTEMA enseñará 4 y «+N más», que al pulsarlo o enfocarlo enseña todas.
- RF-40: MIENTRAS haya plantilla a la vista, EL SISTEMA marcará en la columna de su episodio cada momento atado de esa plantilla, con su nombre (y su texto, si lo tiene, al pasar el ratón o enfocarlo con el teclado).
- RF-41: CUANDO el autor pulse una franja o un momento atado, EL SISTEMA abrirá la temporada en el panel, en el apartado de esa plantilla.
- RF-42: EL SISTEMA recordará la plantilla a la vista de cada temporada en este equipo, entre sesiones y sin escribirlo en las notas. Una temporada nueva empieza en «Ninguna»; si la temporada ya no existe, se olvida.
- RF-43: SI la temporada no tiene episodios ni previstos, ENTONCES EL SISTEMA dirá en el selector «Añade episodios para ver la plantilla».
- RF-44: EL SISTEMA no dará avisos por momentos lejos de su sitio o desordenados.

## Requisitos no funcionales
- Rendimiento: con 300 escenas y 600 causas, abrir el panel de una escena o la pestaña tarda menos de 200 ms; cambiar de plantilla a la vista se ve en menos de 100 ms.
- Integridad: lo único que se escribe es «Viene de» en la escena y los momentos en la temporada, con la escritura segura de siempre y conservando lo que la app no entiende. Sin dato nuevo, la nota queda idéntica a la de antes.
- Compatibilidad con la v1.0:
  - la v1.0 abre la serie y ve escenas, Estructura y Story Circle igual que antes;
  - editar una escena o una temporada en la v1.0 no hace perder lo nuevo (si no se puede garantizar, se para y se pregunta);
  - reordenar o renombrar en la v1.0 no rompe «Viene de» ni los momentos;
  - lo que la v1.0 borra o mueve se trata como RF-7, RF-33 y RF-34.
- Accesibilidad:
  - todo con teclado;
  - la pestaña es una lista anidada con el nivel anunciado; «ver arriba» es un enlace que lleva el foco a la primera aparición;
  - en la rejilla, las franjas y marcas de una columna se enfocan justo después de la cabecera de su episodio, y tienen nombre para el lector de pantalla;
  - marcas («se ve después», «sin sitio todavía», «círculo», «ya no está», «en otro episodio») con texto, nunca solo color.
- Plataformas e idioma: Windows y Mac Intel, en español, estética de la v1. Sin desplazamiento a lo ancho de la página desde 900 px.

## Datos personales
Ninguno nuevo. Todo es ficción.

## Casos límite
- Escena que viene de sí misma: no se ofrece (RF-2).
- Causa repetida: no se ofrece (RF-2); si llega repetida desde el disco, se enseña una vez y se conserva.
- Causa en la bandeja de T01 y efecto en T01E03: «sin sitio todavía». Causa en la bandeja de T01 y efecto en T02E01: también «sin sitio todavía» (no tiene episodio).
- Causa y efecto en el mismo episodio, causa con número mayor: tardía.
- Causa aparcada con episodio anterior: no tardía, marcada «(aparcada)».
- A → B (aparcada) → C en la misma temporada: A y C son inicios distintos; junto a A, «provoca … (aparcada)»; junto a C, «viene de … (aparcada)».
- Círculo de tres escenas sin entrada de fuera: empieza por la más temprana, las tres marcadas «círculo»; no hay bucle.
- Escena de T02 que solo viene de una de T01 y no provoca nada: inicio de cadena en T02, con «viene de T01…» (RF-16).
- Escena cuyos únicos enlaces son escenas descartadas o que ya no están: suelta.
- Escena que va a la papelera: sus efectos la enseñan «(ya no está)»; deshacer o recuperarla de la papelera devuelve los enlaces, porque se conservan en los efectos.
- «Viene de» con un texto suelto, `[[T01E03]]` o un id desconocido: RF-9.
- Variante que mueve la causa de episodio: las marcas según «ver ahora / cómo quedaría».
- La v1.0 borra un episodio (sus escenas van a la bandeja): «Viene de» se conserva y pasa a «sin sitio todavía»; un momento atado a ese episodio sale «(ya no está)».
- La v1.0 borra una temporada (sus escenas van a la papelera): los efectos en otras temporadas enseñan «(ya no está)».
- La v1.0 cambia el episodio del detonante: la escena del detonante sale «(en otro episodio)», conservada.
- Temporada con 1 episodio y Save the Cat: 15 franjas en E01; se ven 4 y «+11 más».
- Temporada con 3 episodios y 10 previstos: E01-E03 y una columna «Previstos: E04-E10».
- Momento con texto y sin episodio: en el panel sí; en la rejilla no. Con episodio y sin texto: en la rejilla, solo el nombre.
- Escena del momento descartada: «(descartada)», conservada.
- Story Circle con menos de 8 textos guardados por la v1.0: los que faltan, vacíos.
- Título de escena con `|`, `]]` o salto de línea: se enseña limpio en buscador, panel, pestaña y rejilla.

## Fuera de alcance
- Pizarra libre y llevar a la sala (spec 012).
- Flechas de causa dibujadas en la rejilla o la línea.
- Causas entre episodios, arcos o secretos; frase en cada enlace de causa.
- Plantillas propias del autor, plantillas por episodio, dos plantillas a la vista a la vez.
- Avisos en «Comprobar» o en «Si lo dejas así…» por causas, escenas sueltas o momentos fuera de sitio.
- Decir cuántas escenas vienen de una escena al mandarla a la papelera.
- Llevar los momentos nuevos a la ficha de la temporada en la wiki.
- Cambios en Esquema y Copiar (spec 010): no llevan «Viene de» ni momentos.
- Que el PC y el Mac recuerden la misma plantilla a la vista.

## Criterios de finalización
- Tests en verde de lo que escribe en disco y de lo que lee la v1.0:
  - «Viene de»: guardar por id, quitar, Ctrl Z, variante (también aplicar con causas que ya no están), canon bloqueado, valores raros conservados (RF-9);
  - momentos nuevos: guardar, cambiar de episodio quita la escena y poner escena pone el episodio en un paso de Ctrl Z, variante, canon;
  - el lector congelado de la v1.0 con lo nuevo guardado: lo ve igual, y lo nuevo sobrevive a editar la escena y la temporada, reordenar escenas, borrar un episodio, borrar una temporada y cambiar el episodio de un momento de Tres actos;
  - Tres actos y Story Circle siguen en su sitio de siempre; sin dato nuevo la nota es idéntica.
- Tests del cálculo de «Provoca», causas tardías y sin sitio, círculos, inicios y recorrido de cadenas, enlaces de fuera, escenas sueltas, conversión de sitio a episodios (los ejemplos de RF-27) y columna de previstos.
- «Viene de» y los momentos en diferencias y «Si lo dejas así…» (RF-13, RF-35).
- La interfaz (panel, pestaña, selector, franjas, «+N más») se comprueba en el navegador.
- RF uno a uno en `validacion.md`, con revisión independiente y de seguridad.
- `npm run verificar` en verde.
- PRD, inventario, `docs/diseno.md` al día.

## Decidido sin preguntar (se puede vetar)
1. El buscador de causas abarca toda la serie (RF-2): las causas cruzan temporadas.
2. Los círculos se permiten con marca (RF-12).
3. Las escenas sueltas son información, no aviso (RF-21).
4. Tres actos y Story Circle reutilizan los campos de hoy; lo nuevo va aparte (RF-32).
5. La plantilla a la vista se recuerda en el equipo, no en la nota (RF-42).
6. Los sitios y textos de las plantillas (RF-26), redondeados a lo habitual de cada autor.
7. Tras el QA: la pestaña enseña solo escenas vivas con episodio de la temporada; lo de fuera va como referencia junto a la escena (RF-16, RF-20).
8. Tras el QA: tardía solo por orden de emisión; bandeja y «Sin temporada» son «sin sitio todavía» (definiciones, RF-6).
9. Tras el QA: el episodio del momento manda sobre su escena (RF-33).
10. Tras el QA: causas, episodios o escenas que ya no están no impiden aplicar una variante (RF-14, RF-35).
11. Tras el QA: N es el mayor entre creados y previstos, con columna «Previstos» (RF-38); como mucho 4 franjas por columna (RF-39).
12. Tras el QA: Save the Cat y Viaje del héroe plegados mientras estén vacíos (RF-28).
13. Tras la revisión del plan: ninguna escena de la pestaña se queda fuera (RF-19b); la autorreferencia no cuenta (RF-19c); «Episodios previstos» siempre a la vista (RF-38).

## Dudas abiertas
Ninguna.
