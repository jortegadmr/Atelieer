# Spec 013 — Guion: escribir las escenas y desglosar por locación (entrega 7)

> Solo el QUÉ y el POR QUÉ. Nada de tecnología, archivos ni esquemas: eso va en plan.md.
> Estado: **aprobada por el autor el 2026-10-29** (aceptó todas las opciones recomendadas de D1-D10 y Q1-Q11). Revisada por un QA independiente (40 puntos, recogidos aquí). Las marcas «[depende de D#]» quedan resueltas con la opción recomendada (apartado «Decisiones cerradas»).

## Decisiones cerradas (2026-10-29)
- **Alcance (D10 = sí):** la 013 implementa los apartados A (escribir), B (referencias), C (código), D (páginas) y E (guardar). Los apartados F (desglose), G (datos y análisis) y H (cuadre guion–escena) **pasan a la spec 014**, que se escribirá con el guion real delante; se dejan aquí como referencia y no se implementan en la 013.
- **D1 / Q1:** código `T01E06-S03` (dentro del episodio, `S03`; 2 dígitos, 3 si hay más de 99 escenas).
- **D2:** sin números congelados. **D3 / Q2:** una nota por escena en una carpeta con guion bajo de la mesa de borradores; Obsidian no la ve. **D4 / Q3:** referencia `[[Vera]]` (con alias o ruta si hace falta). **D5 / Q4:** un clic en el nombre abre la ficha (ver el ajuste de abajo). **D6 / Q5:** el canon no bloquea el guion. **D7:** texto plano inspirado en Fountain. **D8 / Q7:** exportar, fuera. **D9 / Q11:** editor propio.
- **Para la 014:** Q6, duración objetivo en un fichero propio (no en las notas de los episodios); Q8, cuadre guion–escena sí; Q9, presencia y habla; Q10, como dice RF-39.
- **Ajuste descubierto al planificar (a confirmar por el autor):** las fichas de personajes y lugares **no se abren dentro de la app** (la vista Wiki solo las lee y las abre en Obsidian; la pestaña «Ficha» de la spec 009 edita las fichas de piezas). Por eso RF-14 queda así: un clic en una referencia abre una **ficha de lectura** en el panel (nombre, tipo, resumen y motor, lo que la app ya lee) con el botón «Abrir en Obsidian»; Ctrl/Cmd + clic abre Obsidian directamente. Editar fichas de personajes y lugares desde la app queda fuera de alcance.

## Contexto y objetivo
Hasta ahora Atelier llega a la escena como pieza: qué pasa, quién está, dónde, qué cambia. El autor pide el paso siguiente: **escribir el guion** cuando el borrador y la idea ya están definidos, y **desglosarlo** para rodar.

Decisión del autor (2026-10-29): **escribir el guion entra en el PRD** (entrega 7). Sale de «Fuera de alcance» la línea «Escribir el guion». Sigue fuera «Exportar a PDF o a programas de guion» (D8).

Referencias de la petición: Trelby (trelby.org) y Slugline (slugline.co). De Slugline se toma escribir texto corrido que se formatea solo, la lista de escenas que se reordena y el texto plano. De Trelby, los tipos de elemento explícitos, Courier 12 y los informes de personajes, lugares y páginas. El manual de Trelby no se ha revisado; se completará antes del plan.

**Por qué.** La serie se piensa de lo general a lo particular y termina en la escena. Escribir el guion en la misma app evita copiar la escaleta a otro programa y permite lo que ningún programa de guion hace: el guion ya sabe qué escena de qué episodio es y quién es cada personaje (sus fichas de la wiki).

**Tamaño.** Es una spec grande (editor, código de escena, desglose, análisis). D10 propone partirla en dos (013 escribir; 014 desglose, datos y cuadre).

## Usuarios
El autor, en su PC con Windows y en su Mac Intel.

## Historias de usuario
- H1: Como autor quiero escribir cada escena en formato de guion estándar, sin pelearme con el formato.
- H2: Como autor quiero nombrar personajes y lugares de la wiki mientras escribo y llegar a su ficha con un clic.
- H3: Como autor quiero que cada escena tenga un código claro, sin numerar a mano.
- H4: Como autor quiero saber cuánto dura lo que escribo (una página ≈ un minuto).
- H5: Como autor quiero elegir una o varias locaciones (o personajes) y ver qué hay que grabar allí.
- H6: Como autor quiero datos de cada personaje y lugar: cuánto aparece, cuánto habla, con quién coincide.
- H7: Como autor quiero que los personajes y lugares del guion no se desmarquen de los de la escena sin que yo lo vea.

## Definiciones
- **Guion de una escena:** el texto en formato de guion de una escena. Una escena (evento de la v1; la interfaz dice «escena») tiene como mucho uno. **Con guion** = tiene algún carácter que no sea blanco; si el autor lo deja todo en blanco, vuelve a «sin guion» y el fichero se conserva vacío.
- **Documento del episodio:** la vista continua de los guiones de las escenas del episodio en el orden de las escenas (con los actos de la spec 003). No es un fichero aparte: reordenar las escenas reordena el documento. No pagina ni numera páginas.
- **Elementos del guion:** encabezado de escena (`INT.`/`EXT.`/`INT./EXT.`, lugar y momento: `INT. TALLER – NOCHE`), acción, personaje (el nombre sobre su diálogo), paréntesis, diálogo y transición (`CORTE A:`).
- **Referencia:** mención de una ficha de la wiki (personaje, lugar o época) dentro del texto. Es un enlace a la ficha, no solo texto.
- **Aparece** un personaje en una escena si tiene una línea de personaje (con diálogo) o una referencia en una acción o en el encabezado. Una mención dentro de un diálogo o un paréntesis no cuenta como aparecer. **Está solo** si es el único que aparece.
- **Locación** (desglose): el lugar del encabezado del guion, resuelto contra la ficha de lugar si su nombre o alias coincide (sin tildes ni mayúsculas); si no coincide, el texto literal del encabezado. Una escena sin guion usa el primer lugar de su ficha de escena. Una escena con varios lugares sale en cada uno de sus grupos: los totales de los grupos se solapan y no suman el total.
- **Código de escena:** el nombre visible de la escena (D1). Es calculado: no se escribe en ninguna nota (ni en el guion ni en la wiki).
- **Página de guion** y **minuto estimado:** una página de formato estándar en Courier 12 (RF-8) ≈ un minuto.
- **Presencia de un personaje:** minutos estimados de las escenas con guion en las que aparece (cota alta). **Habla:** minutos estimados de sus propias líneas (personaje, paréntesis y diálogo).
- **Desglose:** la vista de análisis que agrupa y filtra las escenas por locación y por personaje.

## Requisitos funcionales (EARS)

### A. Escribir el guion
- RF-1: EL SISTEMA ofrecerá una vista «Guion» en el menú izquierdo con el documento del episodio en marcha (o el que elija el autor). Incluirá las escenas del episodio salvo las descartadas; las descartadas se listan aparte, atenuadas, y no suman en los totales (las demás, idea, propuesta, aparcada, borrador y canon, sí suman). SI el episodio no tiene escenas, ENTONCES invitará a crearlas.
- RF-2: EL SISTEMA mostrará el guion en la familia Courier del sistema (sin dependencias nuevas), 12 pt por defecto, con las sangrías y anchos del formato estándar (RF-8), con un único aspecto de papel y tinta que cumple contraste AA en claro y oscuro (RNF-6). **Aspecto (petición del autor, 2026-10-29):** como las apps de Slugline, no como un formulario: una hoja de papel centrada con sus márgenes sobre un fondo neutro, el texto en Courier a ancho de página, casi sin marcos ni cajas alrededor, y los controles (lista de escenas, páginas, avisos) discretos y fuera de la hoja.
- RF-3: EL SISTEMA reconocerá el tipo de cada línea al escribir, sin que el autor lo elija, y lo mostrará formateado:
  - empieza por `INT.`, `EXT.`, `INT./EXT.`, `INT/EXT.` o `I/E.` (y sus inversos), sin distinguir mayúsculas, seguido de espacio y texto → encabezado, mostrado en mayúsculas;
  - línea en mayúsculas, precedida de línea en blanco y seguida de texto → personaje (se admiten extensiones entre paréntesis como `(V.O.)`, tildes y dígitos);
  - línea entre paréntesis dentro de un diálogo → paréntesis;
  - texto bajo un personaje o un paréntesis → diálogo;
  - línea en mayúsculas que termina en `:` o empieza por `>` → transición;
  - el resto → acción.
  El autor podrá forzar el tipo de una línea; el tipo forzado se conserva al guardar y reabrir. Tab y Mayús + Tab cambian el tipo; para salir del editor con el teclado, Esc y luego Tab (se anuncia). Los casos límite (por ejemplo «INTENTA SALIR» o «UN GOLPE.») se fijan en el plan como tabla de entradas y tipos y se prueban.
- RF-4: CUANDO el autor pulse Enter, EL SISTEMA pasará al tipo siguiente más probable (al final de un personaje, un diálogo; al final de un diálogo, una línea nueva; dos Enter seguidos, un nuevo personaje). Las transiciones por tipo (encabezado, acción, paréntesis, transición, línea vacía) se fijan en el plan como tabla. Valen igual en Mac.
- RF-5: EL SISTEMA dejará escribir, pegar, deshacer y rehacer dentro del documento (Ctrl Z / Ctrl Y; Cmd en Mac), con un deshacer del texto que no se mezcla con el global de la app (spec 002). Hace falta un editor propio (D9).
- RF-6: EL SISTEMA ofrecerá una lista lateral con el código, el título y el lugar de cada escena, para saltar a ella, marcando las que no tienen guion. Incluirá una sección «Bandeja de la temporada» con las escenas sin episodio, cuyo guion se puede escribir. Dejará ocultar el panel y cambiar el tamaño de letra entre 10 y 16 pt solo como ayuda de lectura: el recuento de páginas siempre es por caracteres y no cambia.
- RF-7: CUANDO el autor abra una escena sin guion, EL SISTEMA propondrá un encabezado con el primer lugar de la escena, como texto editable, sin guardar nada hasta que el autor escriba. SI la escena no tiene lugar, ENTONCES dejará `INT. ` como sugerencia.
- RF-8: **Medidas de página** (formato estándar sobre papel Letter, Courier 12: 10 caracteres y 6 líneas por pulgada): acción y encabezado, 60 caracteres por línea; diálogo, 35, con sangría de 10; paréntesis, 25, con sangría de 16; personaje, sangría de 22; transición, alineada a la derecha; 55 líneas por página, con una línea en blanco entre elementos. Se cuenta sobre el texto mostrado (una referencia ocupa lo que mide su nombre, no su enlace). Las medidas se confirmarán contra el estándar en el plan.
- RF-9: EL SISTEMA reconocerá el tipo y la estructura de un guion pegado como texto plano, sin interpretar nada raro.
- RF-10: SI el guion de una escena supera el tope de tamaño (RNF-12), ENTONCES EL SISTEMA lo abrirá en solo lectura y lo dirá.

### B. Referencias a la wiki
- RF-11: CUANDO el autor escriba `@` al principio de línea o tras un espacio, EL SISTEMA abrirá un selector con las fichas de personajes, lugares y épocas de la wiki (por nombre y alias, sin tildes ni mayúsculas), con su tipo. Enter inserta la referencia; Esc cierra el selector y deja la `@` como texto. SI no hay ficha que coincida, ENTONCES lo dirá y no insertará nada.
- RF-12: EL SISTEMA ofrecerá también las fichas al escribir en una línea de personaje, sin que haga falta `@`.
- RF-13: UNA referencia se verá con el nombre de la ficha (o el alias escrito), subrayada y de otro color, con su tipo anunciado a un lector de pantalla («personaje», «lugar»). El color nunca es la única señal. Se borra con retroceso como una sola unidad.
- RF-14: CUANDO el autor pinche una referencia, EL SISTEMA abrirá en el panel de la app una ficha de lectura (nombre, tipo, resumen y motor) con el botón «Abrir en Obsidian». Con Ctrl + clic (Cmd en Mac), abrirá Obsidian directamente. Con el teclado: el cursor sobre la referencia y Alt + Enter. El cursor se coloca junto a una referencia con las flechas o pinchando fuera del nombre [depende de D5].
- RF-15: SI una referencia apunta a una ficha que ya no existe, ENTONCES EL SISTEMA la mostrará marcada «(sin ficha)», la conservará y no impedirá guardar. SI el nombre coincide con una ficha nueva, volverá a apuntarla sola.
- RF-16: EL SISTEMA no creará ni cambiará fichas de la wiki desde el guion.
- RF-17: EL SISTEMA resolverá cada referencia solo contra las fichas leídas de la wiki de la serie. Nunca construirá rutas ni direcciones a partir del texto, y una referencia con rutas relativas o que salga de la wiki no abre nada. Si hay dos fichas con el mismo nombre, el selector las distingue por tipo y ruta y la referencia guarda lo necesario para distinguirlas [depende de D4].
- RF-18: LAS referencias se guardan como un enlace que se resuelve a la ficha [depende de D4]. Que Obsidian las muestre depende de dónde viva el guion [depende de D3].
- RF-19: EL SISTEMA agrupará a un personaje por su ficha si hay referencia, y si no, por el nombre normalizado (sin tildes, caja ni extensiones `(V.O.)`, `(O.S.)`, `(CONT'D)`). La línea de personaje se muestra siempre en mayúsculas.

### C. Código de las escenas
- RF-20: EL SISTEMA dará a cada escena un **código visible** calculado por su posición (temporada, episodio, escena), sin que el autor numere nada, y lo recalculará siempre desde el orden como los códigos T01 y T01E06 existentes (`src/lib/modelo/codigos.ts`). El formato es D1 [depende de D1].
- RF-21: EL SISTEMA enseñará el código en la lista de escenas, en el encabezado de cada escena del documento, en el desglose y en las tarjetas del visor. Una escena en la bandeja no tiene código.
- RF-22: CUANDO se reordene una escena (arrastre o Alt + flechas, spec 003), EL SISTEMA actualizará los códigos del episodio entero. El guion de cada escena viaja con su escena. La interfaz dirá que el código es calculado y cambia al reordenar [depende de D2].

### D. Páginas y duración
- RF-23: EL SISTEMA contará las páginas de cada escena con guion con las medidas de RF-8 y las enseñará con una decimal (`2,4 págs ≈ 2 min 24 s`), en la lista y bajo cada escena. Dará totales por episodio, temporada y serie como suma de escenas. Los minutos de la bandeja cuentan en temporada y serie, no en episodio.
- RF-24: LAS escenas sin guion no sumarán ni se estimarán; el total dirá cuántas faltan («12 de 31 escenas con guion»). Una escena con guion de solo el encabezado cuenta aproximadamente 0 págs.
- RF-25: EL SISTEMA marcará siempre la duración como **estimación** («≈»). No la usa para avisos de las guías.
- RF-26: LA estimación se recalculará al escribir, sin pausas perceptibles (RNF-4).

### E. Guardar, comprobar y no perder texto
- RF-27: EL SISTEMA guardará el guion al escribir, sin botón: un guardado poco después del último cambio, uno cada vez en orden, y uno forzado al salir de la vista, de la escena o al cerrar la app. SI un guardado falla, ENTONCES lo dirá de forma visible, mantendrá el texto en pantalla y reintentará al siguiente cambio o con un botón.
- RF-28: SI el guion cambió por fuera desde que se leyó (Obsidian, el otro equipo), ENTONCES EL SISTEMA no lo pisará: avisará, mostrará las dos versiones y dejará elegir cuál conservar o copiar la local al portapapeles. Nunca descartará en silencio texto escrito.
- RF-29: SI en la carpeta de guiones aparece un fichero de conflicto de sincronización (archivos «Name clash» de Proton) o un fichero que no es de ninguna escena, ENTONCES EL SISTEMA lo avisará, no lo tocará ni lo contará en los cálculos, y conservará los guiones sin escena (huérfanos) sin borrarlos.
- RF-30: EL SISTEMA guardará una copia del guion anterior en la papelera de la serie (en un sitio aparte de las piezas) antes de un cambio que borre más de 500 caracteres de golpe y antes de restaurar otra versión, y no borrará nada de la papelera (spec 007).
- RF-31: EL SISTEMA conservará tal cual lo que no entienda (caracteres raros, marcas desconocidas, comentarios), los finales de línea que ya tenga el fichero (LF o CRLF) y los blancos. SI un cambio de blancos hecho por fuera cambia el tipo de una línea, ENTONCES lo avisará. Los caracteres de control y de dirección se muestran y guardan sin efecto en la interfaz.
- RF-32: SI la escena está bloqueada por canon, ENTONCES el guion **no** se bloquea [depende de D6]. Cambiar desde el guion quién está o dónde en una escena canon (RF-50) sigue el camino de desbloqueo de la spec 002.
- RF-33: SI hay una variante abierta (spec 006), ENTONCES el guion se verá en solo lectura, con aviso, y nada se escribe. El guion de una escena creada dentro de una variante no se crea hasta aplicarla; al aplicar, se crea con la escena; al descartar, no queda nada. El desglose y los análisis, con una variante abierta, leen la serie principal y lo dicen.
- RF-34: CUANDO una escena se mueva a otro episodio o a la bandeja, EL SISTEMA conservará su guion. CUANDO una escena se descarte, su guion se queda con ella. CUANDO una escena vaya a la papelera, borrar, deshacer y rehacer moverán también su guion (a un sitio aparte de la papelera, sin borrar nada, con «(2)» si coincide el nombre).

### F. Desglose [pasa a la spec 014; no se implementa en la 013]
- RF-35: EL SISTEMA ofrecerá una vista «Desglose» con una fila por escena (código, título, episodio, locación, interior/exterior, momento del día, personajes, minutos estimados, estado y si tiene guion), de la serie, una temporada o un episodio.
- RF-36: EL SISTEMA obtendrá interior/exterior y momento del día **solo del encabezado** del guion (la escena no tiene esos campos, spec 003). Se interpretarán los momentos DÍA, NOCHE, AMANECER, ATARDECER y CONTINUO tras un guion (`-`, `–` o `—`); si no se reconocen, la celda queda en «—», y la escena no entra en ese filtro.
- RF-37: EL SISTEMA dejará **filtrar por locaciones** y **por personajes**, uno o varios, y combinarlos. El filtro de personajes dirá si pide **alguno** o **todos**. También por interior/exterior, momento, temporada, episodio y estado (por defecto sin descartadas). Los filtros activos se ven siempre y se quitan de uno en uno o todos a la vez.
- RF-38: EL SISTEMA agrupará por locación (por defecto), por episodio o por personaje. Cada grupo dirá cuántas escenas tiene, los minutos estimados, los personajes y cuántas escenas no tienen guion.
- RF-39: Los personajes y la locación de una escena se tomarán del guion; **si el guion no tiene ninguna referencia de ese tipo**, de los campos de la escena (spec 003), y se dirá de cuál sale cada dato con una marca. Una escena sin guion usa solo la ficha de escena [depende de Q10].
- RF-40: CUANDO el autor pinche una fila, EL SISTEMA abrirá la escena en la vista «Guion» (o en el panel si no tiene guion). El desglose no cambia ninguna pieza.
- RF-41: EL SISTEMA copiará el desglose filtrado al portapapeles como tabla Markdown (con el componente y aviso de «Copiado» de las specs 010 y 012), con las columnas visibles. El texto del autor irá escapado como en la spec 012 (RF-26 y RF-27) y el tope serán 100 000 caracteres, recortando con aviso. No escribe nada en la vault.
- RF-42: SI no hay escenas que cumplan los filtros, ENTONCES lo dirá y ofrecerá quitarlos.

### G. Datos y análisis [pasa a la spec 014; no se implementa en la 013]
- RF-43: EL SISTEMA enseñará, por **personaje**: escenas (con o sin guion) y episodios en los que aparece; **presencia** y **habla** en minutos (solo escenas con guion) y su porcentaje del total; primera y última aparición (código de escena); escenas en las que está solo; y los cinco personajes con los que más coincide (a igualdad, por orden alfabético).
- RF-44: EL SISTEMA enseñará, por **lugar**: escenas, minutos estimados, porcentaje, interior/exterior y momento más habituales, y los personajes que pasan por él.
- RF-45: EL SISTEMA enseñará, de la serie o del filtro: minutos con guion (y, si hay duración objetivo, contra la prevista [depende de Q6]), escenas con y sin guion, lugares y personajes con una sola escena, y personajes que hablan sin ficha en la wiki.
- RF-46: LAS cifras de presencia y habla dirán qué son (estimación sobre el guion escrito) y cuántas escenas se han dejado fuera por no tener guion.
- RF-47: LOS datos se podrán ordenar por cualquier columna y abrir desde cada fila (su lista de escenas, con los filtros puestos).
- RF-48: LOS análisis no escriben nada en disco.

### H. Función extra: cuadre entre guion y escena [pasa a la spec 014; no se implementa en la 013]
- RF-49: CUANDO una escena tenga guion, EL SISTEMA comparará los personajes y lugares del guion con los de la escena y enseñará, en la escena y en el desglose, dos listas: «En el guion y no en la escena» y «En la escena y no en el guion». No es un aviso de las guías: es información. No se hace con escenas sin guion.
- RF-50: PARA «En el guion y no en la escena», EL SISTEMA ofrecerá «Añadir a la escena» (uno por uno o todos), por el camino normal de la spec 002 (un paso del deshacer global, entero o nada). SI la escena está bloqueada por canon, ENTONCES lo dirá con su porqué y ofrecerá el mismo camino de desbloqueo de la spec 002. Nunca añade ni quita nada por sí mismo.
- RF-51: «En la escena y no en el guion» solo informa.

**Por qué esta y no otras.** Los análisis de las specs 010 y 011 leen los campos de la escena. Con el guion escrito, los nombres pasan a vivir en el texto y la escena se queda atrás. El cuadre evita mantenerlos a mano en dos sitios, sin cambiar nada solo. Otras ideas (modo sin distracciones, revisiones por colores, contador de palabras en vivo) se descartan: son adornos o ya están (instantáneas, deshacer).

## Requisitos no funcionales
- RNF-1: **La vault es la única verdad.** El guion de cada escena es una nota Markdown en la vault, no una base de datos. Dónde vive es D3. La mesa de borradores (`appDatos/`) no es visible en Obsidian (PRD): si se queda allí, Obsidian no mostrará el guion ni sus enlaces. Un guion de una escena canon en la mesa no contradice «Dónde vive cada pieza» del PRD, porque el guion no es una pieza sino un texto de la escena.
- RNF-2: **Compatibilidad con la v1.0.** La v1.0 abre la serie con guiones presentes sin cambios, sin avisos y sin perder nada. Una prueba de compatibilidad con el lector congelado de la v1 (`tests/compat/v1/`) lo comprueba.
- RNF-3: Lectura tolerante: lo que no se entienda se conserva. Un fichero ilegible se aparta con su fecha (nunca se borra) y se avisa. El fichero lleva la versión de su formato; uno de versión más nueva se abre en solo lectura (como la spec 012).
- RNF-4: Rendimiento, con el disco en memoria: abrir el documento de un episodio realista (15 escenas, 45 págs) en menos de 100 ms y uno de estrés (40 escenas × 3 págs) en menos de 300 ms; recalcular páginas al teclear en menos de 50 ms por pulsación; el desglose de 5 temporadas × 10 episodios × 30 escenas en menos de 500 ms. Con disco real (copia de `_prueba`) abrir una serie con guiones sigue en menos de 2 s (PRD): los totales de serie y el desglose se calculan en segundo plano y dicen «calculando». No hay cachés que solo vivan en la app; si hay, son descartables y se reconstruyen.
- RNF-5: El guion entra en las instantáneas de la serie y se restaura con ella [depende de D3].
- RNF-6: Accesibilidad: todo se escribe y navega con teclado; los tipos de línea, las referencias y los cambios importantes se anuncian a un lector de pantalla; contraste AA.
- RNF-7: Se reutiliza la estética de la v1 (`src/estilo/`). Courier solo en el texto del guion.
- RNF-8: Sin dependencias nuevas. Si el editor las necesita, se para y se pregunta.
- RNF-9: Nada sale del equipo. Sin servicios externos.
- RNF-10: Windows y Mac Intel. El recuento de páginas no depende de la fuente instalada.
- RNF-11: Cada tarea sigue el flujo del proyecto: tests de lo que escribe en disco, toca canon o lee la v1.0; la interfaz se comprueba en el navegador (decisión del autor en la spec 003).
- RNF-12: Topes: un guion de escena, hasta 500 págs o 1 MB (lo que llegue antes); al pasarlo se abre en solo lectura. Un fichero binario o enorme en la carpeta de guiones se avisa y se ignora.

## Criterios de finalización
- Validación RF a RF en `validacion.md`, con la lista «A mano» para Windows y Mac.
- Prueba de compatibilidad con el lector de la v1.0; pruebas de guion roto, de versión futura, de cambio por fuera, de guardado fallido, de papelera y de conflicto.
- `npm run verificar` en verde y revisiones independientes de código y seguridad.

## Decidido sin preguntar
- Cuadre guion–escena como función extra (se quita si Q8 = no).
- Que el guion se guarde solo, sin botón, como la pizarra.
- Que el código de escena no se escriba nunca en las notas.

## Datos personales
El guion es texto de ficción del autor. Nada sale del equipo. Se añadirá `docs/decisiones/0004-guion.md` con la decisión de dónde vive.

## Casos límite
- Escena sin guion en un episodio con guion en las demás: sale en la lista como «sin guion»; el documento la muestra como hueco con su encabezado propuesto.
- Escena en la bandeja: se escribe desde su sección de la lista; no tiene código.
- Cambiar el nombre de una ficha por fuera: la referencia vuelve a apuntarla solo si el nombre o un alias coincide.
- Pegar 50 páginas de otro programa: se acepta como texto, hasta el tope (RNF-12).
- Una línea de 200 caracteres sin espacios: se parte por la medida de página.
- `INT./EXT.` en una escena: se cuenta como interior y exterior.
- Episodio sin temporada o escena sin episodio: sin código; no rompe la vista.
- Todo el texto borrado: la escena vuelve a «sin guion»; el fichero se conserva.

## Fuera de alcance
- Exportar a PDF, Final Draft o Fountain e importar de otros programas (D8).
- Números de escena congelados y revisiones por colores (D2).
- Diálogo doble, notas estilo Final Draft, colaboración.
- Corrector propio (vale el del sistema), plantillas de formato.
- Crear o cambiar fichas de la wiki desde el guion; escribir en la wiki.
- Calendarios de rodaje y presupuestos.

---

## Decisiones abiertas (el autor decide; la recomendada va primero)

### D1. Código de las escenas
Los códigos de la app ya son `T01` y `T01E06`, calculados.

| Opción | Ejemplo | Ventajas | Inconvenientes |
|---|---|---|---|
| A | `010101` | Cortísimo, solo dígitos | Ambiguo: no dice qué es cada par; se rompe con 100 escenas; se confunde con una cifra; no encaja con `T01E06` |
| B | `ESC001` | Corta | No dice el episodio; global (se renumera todo al insertar) o por episodio (se repite) |
| C | `ESC010101` | Única y con prefijo | Larga; `ESC` dice poco; ambigua como A |
| **D (recomendada)** | **`T01E06-S03`** | Coincide con los códigos de la app; legible; única en la serie; la escena cuenta dentro de su episodio, como habla un equipo de rodaje | 10 caracteres |
| D′ | `T01E06-03` | Más corta | Menos clara sola |

Con D, dentro del episodio se muestra la forma corta `S03`; 2 dígitos, 3 si hay más de 99 escenas.

### D2. ¿Números de escena congelados?
Recomendada: **no en esta spec.** El código siempre se calcula. Congelar (para escenas nuevas `12A`) añade estado y reglas que no hacen falta hasta rodar; se puede añadir después sin romper nada.

### D3. Dónde vive el guion
- **Recomendada: una nota por escena** en una carpeta con guion bajo dentro de la mesa de borradores (`appDatos/<serie>/`). Viaja con la escena; un conflicto afecta a una escena; la v1.0 no la recorre; entra en las instantáneas. Obsidian no la ve (mesa excluida).
- Una nota por episodio: menos ficheros, pero mover una escena toca dos notas y un conflicto afecta a todo el episodio.
- **En una carpeta visible de la vault** (junto a la wiki): Obsidian la ve y cuenta los enlaces, pero la app escribe en la wiki, lo que el PRD limita al paso a `borrador` y obliga a tratar cada guion como ficha con su canon y Log.
- En el cuerpo de la nota de la escena: la v1.0 lo conserva, pero mezcla guion y notas del autor.

### D4. Cómo se guarda una referencia
- **Recomendada: enlace de Obsidian `[[Vera]]`** (con alias `[[Vera|la Gaviota]]`; con ruta si hay dos fichas iguales). Coherente con el resto de la vault. Pega: en Fountain `[[ ]]` es una nota oculta, así que otros programas de guion no lo mostrarán. Con D3 recomendada, Obsidian no lo mostrará.
- `@Vera`: legible y es el formato Fountain para forzar un personaje (choca con el uso de `@` aquí como disparador); no distingue fichas duplicadas ni sobrevive a renombrar la ficha.
- Ambas: se escribe `@`, se guarda `[[ ]]`.

### D5. Qué hace «pinchar» una referencia
Recomendada: **un clic en el nombre abre la ficha en el panel** (lo pedido); el cursor se coloca con las flechas o pinchando fuera del nombre. Pega: pinchar para colocar el cursor junto a una referencia la abre sin querer. Alternativa: Ctrl/Cmd + clic abre; el clic solo coloca el cursor.

### D6. ¿Bloquea el canon el guion?
Recomendada: **no**. Con el borrador cerrado casi todas las escenas serán canon; bloquear impediría escribir. El canon sigue bloqueando los campos de la escena. Alternativa: bloquear y desbloquear escena a escena.

### D7. Formato del texto en disco
Recomendada: **texto plano inspirado en Fountain** (encabezados `INT.`, personajes en mayúsculas, paréntesis, transición con `>`, tipo forzado con el prefijo de Fountain), legible en cualquier editor. No se promete compatibilidad total con Fountain: las referencias `[[ ]]` y el uso de `@` difieren (D4). Alternativa: formato propio con el tipo en cada línea (más exacto, ilegible fuera de la app). Sin bibliotecas de Fountain.

### D8. Exportar
Recomendada: **mantenerlo fuera.** Para PDF con paginación real o Fountain/FDX, una spec posterior, probablemente con una dependencia nueva que necesita aprobación.

### D9. El editor
Las exigencias (formato por tipo de línea, referencias como unidad que se borra de una vez, ancho por caracteres, deshacer propio) implican un **editor propio** sin dependencias; un campo de texto normal no las da. Recomendada: editor propio sencillo, con la referencia como bloque atómico y su propio deshacer. Alternativa: la referencia como texto `[[…]]` visible al editar y resaltado, con un campo de texto nativo (más simple, menos agradable).

### D10. Partir la spec
Recomendada: **sí.** 013: escribir, referencias, código, páginas y guardado. 014: desglose, datos y cuadre (se decide con el guion real delante). 015: exportar si se quiere. Cada una sirve sola, como pide el PRD.

---

## Preguntas al autor
- **Q1.** ¿Código de escena: D, A, B o C? ¿2 o 3 dígitos?
- **Q2.** ¿El guion en una nota por escena (D3) en la mesa de borradores, o en una carpeta visible de la vault?
- **Q3.** ¿Referencia como `[[Vera]]` o como `@Vera` (D4)?
- **Q4.** ¿Un clic abre la ficha (D5) o Ctrl/Cmd + clic?
- **Q5.** ¿El canon bloquea el guion (D6)?
- **Q6.** ¿Quieres una duración objetivo por episodio? Necesita un campo nuevo, con aprobación del cambio de formato y un test con el lector de la v1 que lo conserve. Alternativa: guardarlo en un fichero propio. Si no, solo se enseña lo escrito.
- **Q7.** ¿Exportar fuera (D8) o dentro? Si dentro, ¿PDF, Fountain o ambos?
- **Q8.** ¿Aceptas el cuadre guion–escena (sección H) o lo quitamos?
- **Q9.** ¿«Presencia» y «habla» te sirven, o solo uno?
- **Q10.** ¿Las escenas sin guion cuentan en el desglose con los datos de su ficha de escena (RF-39), o solo las que tienen guion?
- **Q11.** ¿Se parte en 013/014 (D10) y se acepta el editor propio (D9)?

## Después de aprobar
1. El autor cierra las decisiones D1-D10 y las preguntas Q1-Q11.
2. Se escribe `plan.md` (formato en disco, editor, medidas, tabla de tipos de línea) y `tasks.md`, revisados por un revisor independiente.
3. Se implementa tarea a tarea, con `npm run verificar` en verde en cada una.
