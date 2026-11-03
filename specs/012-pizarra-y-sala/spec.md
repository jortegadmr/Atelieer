# Spec 012 — Análisis: pizarra libre y llevar a la sala (entrega 6, parte 3)

> Solo el QUÉ y el POR QUÉ. Nada de tecnología, archivos ni esquemas: eso va en plan.md.
> Estado: borrador, pendiente de aprobación del autor (diseño aprobado en conversación el 2026-10-29). Revisada por un QA independiente (35 puntos, recogidos aquí con la opción recomendada).

## Contexto y objetivo
Última parte de G10 (ver specs 010 y 011). Quedan dos piezas del inventario: la **pizarra libre de ideas** y **llevar a la sala de guionistas**.

Decisiones del autor (2026-10-29):
1. «Llevar a la sala» **copia un planteamiento** listo para pegar en la sala de guionistas. La app no escribe nada en la vault por ello.
2. La pizarra es **una por serie**.
3. En la pizarra hay **notas libres** y **tarjetas de piezas** de la serie, unidas por **flechas** (nota-nota, nota-pieza, pieza-pieza).
4. Una nota se puede convertir en una idea de la mesa.

**Por qué.** Hoy una idea a medio formar no tiene dónde vivir hasta ser una pieza, y no se puede ver cómo se relacionan ideas y piezas a la vez. Y cuando una decisión se atasca, el autor tiene que reunir a mano en la sala la información que la app ya conoce (ficha, avisos, causas, quién sabe qué).

## Usuarios
El autor, en su PC con Windows y en su Mac Intel.

## Historias de usuario
- H1: Como autor quiero soltar ideas en un lienzo sin que sean piezas, para pensar antes de comprometerme.
- H2: Como autor quiero poner piezas de la serie en el lienzo y unirlas con flechas entre sí y con mis notas, para ver las relaciones.
- H3: Como autor quiero convertir una nota madura en una idea de la mesa.
- H4: Como autor quiero llevar una pieza (o lo que enfoca la lente) a la sala con todo su contexto sin reunirlo a mano.

## Definiciones
- **Pizarra:** el lienzo único de una serie. Contiene notas, tarjetas y flechas. Es un dato de la serie, como las variantes (spec 006): vive junto a ella en `appDatos/` y viaja con ella; no es una preferencia del equipo.
- **Nota:** texto libre con posición y color. No es una pieza de la serie y no aparece en ninguna otra vista.
- **Tarjeta:** referencia visual a una pieza de la serie (episodio, escena, arco o secreto), con posición. Sigue a la pieza por su identidad, no por su título. Como mucho hay una tarjeta por pieza.
- **Flecha:** unión dirigida entre dos elementos de la pizarra, con una etiqueta opcional. A→B y B→A son flechas distintas.
- **Elemento:** nota o tarjeta.
- **Pieza ausente:** la que una tarjeta apunta y no se encuentra.
- **Planteamiento:** el texto que compone «Llevar a la sala».
- **Origen de la sala:** episodio, escena, arco o secreto (desde su panel o su tarjeta), o el enfoque de la lente de la spec 010 (personaje, arco o secreto).
- **Pieza abierta:** la que está en el panel con su punto de partida de «Si lo dejas así…» (spec 005).
- **Orden de lectura:** de arriba abajo y, a igual altura, de izquierda a derecha, por la posición de cada elemento.

## Requisitos funcionales (EARS)

### A. Pizarra
- RF-1: EL SISTEMA ofrecerá una vista «Pizarra» en el menú izquierdo, con el lienzo de la serie abierta. Abrirla sin cambiar nada no escribe nada en disco: el fichero nace con el primer cambio, y una pizarra vacía no se guarda.
- RF-2: CUANDO el autor cree una nota, EL SISTEMA la pondrá en el lienzo con el texto vacío en edición, en el sitio indicado (o en el centro visible si se crea desde el botón). SI se sale del campo con la nota vacía, ENTONCES EL SISTEMA la quitará sola, sin copia ni paso de deshacer.
- RF-3: EL SISTEMA dejará editar el texto de una nota (hasta 5000 caracteres; si se pega más, se corta a ese tope y se dice), cambiar su color y moverla. La paleta es fija, de seis colores; cada color tiene nombre en texto, el color nunca es la única señal y todos cumplen contraste AA en claro y oscuro.
- RF-4: CUANDO el autor añada una tarjeta, EL SISTEMA reutilizará el buscador de piezas de la spec 011 (por título y por dónde se emite, sin tildes ni mayúsculas), con las piezas de la serie que no tienen ya tarjeta; las descartadas salen marcadas «(descartada)». SI no hay resultados, ENTONCES lo dirá.
- RF-5: CUANDO el autor abra una tarjeta (doble clic o Enter), EL SISTEMA abrirá la pieza en el panel. La pizarra nunca cambia una pieza: solo la abre, y su edición se rige por la spec 002 (también el bloqueo del canon).
- RF-6: EL SISTEMA dejará mover cualquier elemento con el ratón y con el teclado (RF-12).
- RF-7: CUANDO el autor una dos elementos, EL SISTEMA creará una flecha dirigida del primero al segundo, con etiqueta opcional editable (hasta 60 caracteres). SI es de un elemento a sí mismo o repite una existente (misma dirección y mismos extremos), ENTONCES EL SISTEMA no la creará y dirá por qué.
- RF-8: EL SISTEMA dejará quitar una nota, una tarjeta o una flecha, sin confirmación (se puede deshacer y queda copia, RNF-2), diciendo cuántas flechas se han quitado con ello. Quitar una tarjeta no toca la pieza.
- RF-9: SI la pieza de una tarjeta no se encuentra, ENTONCES EL SISTEMA enseñará la tarjeta como «(pieza no encontrada)», conservará sus flechas y dejará quitarla. SI la pieza vuelve (por ejemplo, se recupera de la papelera), ENTONCES la tarjeta volverá a apuntarla sola.
- RF-10: EL SISTEMA dejará deshacer y rehacer los cambios de la pizarra con Ctrl Z / Ctrl Y (Cmd en Mac). Un paso es un movimiento completo (de soltar a soltar), una edición de texto terminada, una unión o un quitado. Dentro de un campo de texto manda el deshacer del campo. El historial vive en memoria y sobrevive a cambiar de vista, pero no a cerrar la app.
- RF-11: EL SISTEMA dejará mover el encuadre y acercar o alejar el lienzo (de 25 % a 200 %) con rueda, con Ctrl + rueda, con pellizco del trackpad y con botones, y encajar todo en pantalla (con un solo elemento, lo centra; con ninguno, no hace nada). El encuadre se recuerda mientras la app está abierta.
- RF-12: Todo lo anterior se podrá hacer con el teclado:
  - Tab recorre los elementos en orden de lectura; Enter edita una nota o abre una tarjeta; Esc sale de la edición o quita la selección.
  - Las flechas mueven el elemento seleccionado 10 px (Mayús: 50 px); dentro de una nota en edición son del campo.
  - Alt + L empieza una unión desde el elemento seleccionado; después Tab elige el destino y Enter la crea; Esc la cancela.
  - Supr quita lo seleccionado (elemento o flecha).
  - Las flechas, sus extremos y su etiqueta se pueden recorrer y editar desde «Ver como lista», una vista alternativa en texto de todos los elementos y flechas.
  - Cada cambio se anuncia a un lector de pantalla (región de estado).
- RF-13: EL SISTEMA guardará la pizarra al cambiarla, sin botón: un guardado poco después del último cambio, uno cada vez en orden, y uno forzado al salir de la vista o cerrar la app. SI un guardado falla (disco lleno, sin permiso, solo lectura), ENTONCES lo dirá de forma visible, mantendrá los cambios en pantalla y reintentará al siguiente cambio o con un botón.
- RF-14: SI hay una variante abierta (spec 006), ENTONCES la pizarra se verá en solo lectura, con aviso, y las tarjetas se resolverán contra la serie principal; nada se escribe.
- RF-15: Una pizarra aguanta como mucho 200 elementos y 400 flechas; al llegar al tope, EL SISTEMA dirá que no caben más.

### B. Convertir una nota en idea
- RF-16: CUANDO el autor pulse «Pasar a idea» en una nota con texto, EL SISTEMA creará un **evento en estado idea** (la «idea» de la spec 002), con el título propuesto por la primera línea de la nota, limpio como el de «Ctrl I» (una línea, sin controles, hasta 300 caracteres) y editable antes de crear. Irá a la bandeja de la temporada en marcha, o de la última si ninguna lo está, con la regla de destino de la spec 002.
- RF-17: SI la serie no tiene ninguna temporada, ENTONCES EL SISTEMA dirá «Crea primero una temporada» y no creará nada. SI el destino está bloqueado por canon, ENTONCES lo dirá con su porqué (spec 002) y no cambiará la pizarra.
- RF-18: CUANDO se cree la pieza, EL SISTEMA pondrá junto a la nota una tarjeta de la pieza nueva, unida a la nota con una flecha, y conservará la nota. La creación de la pieza es un paso del deshacer global de la app; la tarjeta y la flecha, uno de la pizarra.
- RF-19: SI la nota ya tiene una tarjeta nacida de ella, ENTONCES EL SISTEMA ofrecerá abrir esa pieza en lugar de crear otra. Una doble pulsación seguida no crea dos piezas.
- RF-20: SI la pieza se crea y la pizarra no se puede guardar, ENTONCES EL SISTEMA lo dirá, la pieza se quedará creada y la pizarra seguirá en pantalla con lo pendiente de guardar (RF-13).

### C. Llevar a la sala
- RF-21: EL SISTEMA ofrecerá «Llevar a la sala» en el panel de un episodio, una escena, un arco o un secreto, en la lente de la spec 010 y en una tarjeta de la pizarra.
- RF-22: CUANDO el autor lo pulse, EL SISTEMA copiará al portapapeles un planteamiento en Markdown (con el mismo componente y aviso de «Copiado» que el esquema de la spec 010, en región de estado) diciendo cuántos caracteres tiene (unidades de texto, no grafemas).
- RF-23: EL PLANTEAMIENTO contendrá, en este orden y omitiendo lo que no haya:
  1. qué es el origen y su estado;
  2. su ficha: la de la wiki para un arco o un secreto, y los campos que la app entiende para un episodio o una escena, sin el encabezado de la nota;
  3. los avisos activos con su regla;
  4. de qué viene y qué provoca (escena);
  5. qué sabe quién (secreto);
  6. lo que cambió desde que se abrió («Si lo dejas así…»), solo si es la pieza abierta con punto de partida; si no, se omite;
  7. las alternativas descartadas (solo arcos);
  8. las notas de la pizarra unidas a la pieza por una flecha directa, en cualquier sentido, con la etiqueta de la flecha y por orden de posición;
  9. una última línea «Quiero decidir:» vacía para que el autor la rellene.
- RF-24: PARA un personaje de la lente, EL PLANTEAMIENTO llevará su nombre, su ficha de la wiki si existe, los arcos y secretos con los que se relaciona, las escenas en las que aparece y lo que sabe (spec 010), y la última línea.
- RF-25: SI una sección no se puede leer (la wiki no está, la ficha está en conflicto o rota), ENTONCES EL SISTEMA pondrá en su lugar una línea «(no se pudo leer: motivo)» y seguirá con el resto. SI la pizarra no carga, se omiten las notas con una línea que lo diga.
- RF-26: EL SISTEMA tratará todo el texto del autor que copie (fichas, notas, etiquetas) como texto, no como Markdown: lo meterá en citas o vallas que no se puedan cerrar desde dentro, y quitará los caracteres de control y de dirección.
- RF-27: SI el planteamiento supera los 100 000 caracteres, ENTONCES EL SISTEMA lo recortará quitando de menos a más importante: notas de la pizarra, alternativas descartadas, ficha (por el final), y lo dirá en una línea de aviso. Se conservan siempre el título, el estado, los avisos y la última línea, y no se corta a mitad de una fila ni de un carácter.
- RF-28: SI el origen ya no existe (pieza borrada, lente que desaparece por un cambio por fuera) al pulsar, ENTONCES EL SISTEMA no copiará nada y dirá por qué.
- RF-29: SI el portapapeles no está disponible, ENTONCES EL SISTEMA enseñará el planteamiento en una caja de texto seleccionable para copiarlo a mano.
- RF-30: Llevar a la sala no escribe nada en disco.

## Requisitos no funcionales
- RNF-1: La pizarra vive solo en el equipo, junto a la serie, en un sitio que la v1.0 no lee (carpeta con guion bajo, como `_variantes`). La v1.0 abre la serie con la pizarra presente sin cambios, sin avisos y sin perder nada.
- RNF-2: Antes de quitar una nota con texto, una tarjeta o una flecha, EL SISTEMA guardará una copia de la pizarra anterior en la papelera de la serie, en un sitio aparte de las piezas para que la papelera de piezas no las confunda. La app no borra nada de la papelera (spec 007).
- RNF-3: Guardar es entero o nada. SI el fichero cambió por fuera desde que se leyó (comparándolo antes de guardar, al volver a la ventana y al vigilar la carpeta), ENTONCES no se pisa: se relee, se avisa y lo local sin guardar se descarta, igual que en la spec 002. Un fichero borrado por fuera se avisa y la pizarra sigue en pantalla hasta el siguiente guardado.
- RNF-4: Lectura tolerante: el fichero lleva su versión del formato; lo mal formado (posiciones no numéricas o enormes, ids repetidos, colores fuera de la paleta, flechas a elementos que no existen, textos pasados del tope) se descarta o se normaliza con aviso, sin perder el resto. Los campos que la app no entiende se conservan. Un fichero de una versión más nueva se abre en solo lectura. Un fichero ilegible se aparta junto a la pizarra con su fecha (nunca se borra) y se empieza con una vacía, avisando.
- RNF-5: Una pizarra con 200 elementos y 400 flechas se lee y se guarda en menos de 100 ms con el disco en memoria.
- RNF-6: Texto de notas con caracteres de control o de dirección se muestra y se guarda como texto, sin interpretarlo.
- RNF-7: Se reutiliza la estética de la v1 (`src/estilo/`).
- RNF-8: Sin dependencias nuevas.
- RNF-9: La pizarra entra en las instantáneas de la serie y se restaura con ella. Una tarjeta cuya pieza no esté tras restaurar se ve como «(pieza no encontrada)» (RF-9).
- RNF-10: Dos notas en el mismo punto se apilan por un orden que se guarda; sube al crear, mover o tocar una nota.

## Datos personales
Las notas son texto del autor sobre su serie. Nada sale del equipo (constitución). La decisión de que la pizarra sea un dato de la serie fuera de las notas de la vault queda en `docs/decisiones/`.

## Casos límite
- Pizarra vacía: invita a crear una nota o añadir una tarjeta.
- Serie renombrada o pieza renombrada: la tarjeta sigue a la pieza por su identidad.
- Pieza movida de temporada o descartada: la tarjeta sigue, con «(descartada)» si lo está.
- Dos ventanas con la misma serie: la que guarda después relee y avisa (RNF-3).
- Llevar a la sala con una pieza sin ficha, sin avisos ni causas: el planteamiento solo lleva título, estado y la última línea.
- Nota de 5000 caracteres: se corta visualmente con «…» y se ve entera al editar.
- Elemento puesto muy lejos: el lienzo llega a ±20 000 px y «encajar» lo trae a la vista.

## Fuera de alcance
- Varias pizarras por serie.
- Escribir actas o notas en `00_Raw` o en la vault desde «Llevar a la sala».
- Imágenes, dibujo libre, formas, texto con formato dentro de las notas.
- Colaboración y varios usuarios.
- Crear arcos, secretos o episodios desde «Pasar a idea» (solo ideas de escena).
- Que la sala (`/sala-de-guionistas`) lea la pizarra por sí sola.
- Llevar un personaje a la sala si no está enfocado por la lente.

## Criterios de finalización
- Todos los RF validados uno a uno en `validacion.md`.
- Test con el lector congelado de la v1.0 (`tests/compat/v1/`): la serie con pizarra presente se abre sin problemas ni avisos.
- Pruebas con el disco en memoria de: pizarra rota, versión futura, cambio por fuera, guardado fallido, papelera y 200/400 dentro del umbral. Ninguna prueba toca la vault real (Vault).
- Lienzo y teclado comprobados en el navegador, y los gestos en Windows y Mac (criterio de la 003).
- Revisión independiente de código y de seguridad hecha y arreglada.
- `npm run verificar` en verde.

## Decidido sin preguntar (se puede vetar)
- Piezas de tarjeta: episodio, escena, arco y secreto. Los personajes no son piezas, así que solo se llevan a la sala desde la lente.
- «Pasar a idea» crea solo ideas de escena, en la bandeja de la temporada.
- Seis colores fijos; sin tipos de flecha, solo etiqueta.
- Zoom y encuadre solo mientras la app está abierta.
- Topes: nota 5000 caracteres, etiqueta 60, 200 elementos y 400 flechas.
- Copias de la pizarra al quitar: sin tope; la papelera la vacía el autor.
- Con una variante abierta, «Llevar a la sala» lleva la serie principal y lo dice en una línea.
- La pizarra se guarda como nota Markdown con un bloque `json` (constitución 1), en una carpeta que la v1.0 no recorre.

## Dudas abiertas
- Ninguna que bloquee.
