# Validación — Spec 011 «Análisis: causa y efecto y plantillas de estructura»

> 2026-10-23 · rama `011-causa-y-plantillas` · `npm run verificar`: 1054 tests en verde, 0 errores ni avisos de tipos, compilación correcta. La interfaz se comprueba en el navegador (decisión del autor en la 003), con la serie de prueba en memoria, en cada tarea (T6a-T7, T12a-T13c). Sin cambios en `src-tauri/` ni dependencias nuevas.

## A. Viene de y Provoca

| RF | Prueba | Resultado |
|---|---|---|
| 1 | Navegador: «Viene de» en Editar de la escena, en orden de emisión, con título y dónde se emite (T6a) | ✅ |
| 2 | Navegador: el buscador ofrece escenas no descartadas de toda la serie, sin la propia ni las que ya están; con teclado (T6a). `BuscarEscena` con `filtro` | ✅ |
| 3 | Tests «añadir y quitar deja las demás entradas igual», «quitar un id quita sus copias» | ✅ |
| 4 | Test «Provoca en orden de emisión»; navegador: «Provoca» sin editar (T6b) | ✅ |
| 5 | Navegador: clic en una escena de «Viene de» o «Provoca» la abre (T6a, T6b) | ✅ |
| 6 | Tests «tardía en el mismo episodio y entre temporadas», «orden repetido en disco…», «bandeja y Sin temporada: sin sitio», «aparcada anterior no es tardía»; navegador: marcas en texto (T6a, T6b) | ✅ |
| 7 | Test «causa descartada o que ya no está en Viene de, con su estado»; navegador: se quita | ✅ |
| 8 | Test «efecto descartado en Provoca, marcado» | ✅ |
| 9 | Tests «números, objetos y repetidas se conservan», «no lista: no editable, con el valor crudo…», «escena, ya no está o no se entiende», «un __proto__ de primer nivel…»; navegador: con valor raro no deja cambiar y dice por qué (T6a) | ✅ |
| 10 | Tests «canon bloqueado no cambia», «en la variante no escribe en la serie»; navegador: en canon no deja cambiar (T6a) | ✅ |
| 11 | Test «un paso de Ctrl Z» (con el reloj inyectado de `Historial`) | ✅ |
| 12 | Tests «círculo de 3 y de 2», «solo enlaces a descartadas no es círculo»; navegador: «círculo» en panel y pestaña (T6b, T7) | ✅ |
| 13 | Tests «Si lo dejas así dice Viene de», «cambiar viene_de no pisa otro campo desconocido cambiado fuera» | ✅ |
| 14 | Test «aplicar una variante con una causa que ya no está no choca» | ✅ |

## B. Pestaña «Causa y efecto»

| RF | Prueba | Resultado |
|---|---|---|
| 15 | Navegador: cuarta pestaña en Análisis con el mismo selector de temporada (T7) | ✅ |
| 16 | Test «inicio que solo viene de otra temporada» | ✅ |
| 17 | Test «orden de inicios y de hijos, y toda escena sale una vez entera» | ✅ |
| 18 | Test ««ver arriba» la segunda vez»; navegador: el enlace lleva el foco a la primera aparición (T7) | ✅ |
| 19 | Test «círculo sin inicio, tras los demás inicios» | ✅ |
| 19b | Tests «escena que solo provoca hacia fuera tiene su cadena», «círculo con una causa de fuera» | ✅ |
| 19c | Test «la autorreferencia no cuenta» | ✅ |
| 20 | Tests «enlaces de fuera con su marca», «A → B aparcada → C» | ✅ |
| 21 | Test «sueltas con solo enlaces descartados o que ya no están» | ✅ |
| 22 | Navegador: tardías y círculos con texto (T7) | ✅ |
| 23 | Navegador: clic abre la escena en Editar (T7) | ✅ |
| 24 | Navegador: con lente se atenúan las no relacionadas (T7) | ✅ |
| 25 | Navegador: «Aún no hay causas en esta temporada» con la indicación (T7) | ✅ |

## C. Plantillas

| RF | Prueba | Resultado |
|---|---|---|
| 26 | Test «hay cuatro plantillas con sus momentos» | ✅ |
| 27 | Tests «con un episodio, todo en E01», «los ejemplos con seis episodios», «… con diez episodios», «los 8 pasos del Story Circle con ocho episodios…» | ✅ |
| 28 | Navegador: Estructura (tres actos) y Story Circle con sus guías (§17, §12, G29); Save the Cat y Viaje del héroe plegados vacíos y abiertos con contenido (T12a, T12b) | ✅ |
| 29 | Test «poner escena pone su episodio»; navegador: nombre, sitio, explicación, texto, episodio y escena; el buscador solo ofrece escenas de la temporada con episodio (T12a) | ✅ |
| 30 | Test «cambiar de episodio quita la escena de otro episodio»; navegador (T12a) | ✅ |
| 31 | Tests «poner escena y episodio, un paso de Ctrl Z», «canon y variante»; navegador: un Ctrl Z devuelve las dos cosas (T12a) | ✅ |
| 32 | Tests «Tres actos escribe texto y episodio en estructura y la escena aparte», «Story Circle: texto en story_circle, sitio aparte», «la v1.0 ve Estructura y Story Circle igual», «lo nuevo sobrevive a cada edición de la v1.0», «sin plantillas, la nota es idéntica» | ✅ |
| 33 | Test «los momentos atados van en su episodio con el estado de su escena»; navegador: «(en otro episodio)» y «(ya no está)» (T12b) | ✅ |
| 34 | Mismo test (episodio que no es de la temporada no se marca); `SelectorPieza` enseña «(ya no está)» (T12a) | ✅ |
| 35 | Tests «Si lo dejas así dice Save the Cat (Catalizador)», «Estructura (Detonante) enseña texto, episodio y escena en Lado a lado», «choque por momento», «aplicar con una escena de momento que ya no está no choca», «los momentos … salen uno a uno» | ✅ |
| 36 | Navegador: selector «Plantilla» en la cabecera de la rejilla con las cinco opciones (T13b) | ✅ |
| 37 | Navegador: Save the Cat en T01 (8 episodios), cada franja en su columna, con nombre y «desde/sigue/hasta» (T13b). Test «un tramo que toca varias columnas…» | ✅ |
| 38 | Tests ««Previstos» con 3 creados y 10 previstos», «con 0 creados solo sale «Previstos»…», «un tramo que cruza a «Previstos»…»; navegador: T03 con 6 previstos enseña solo «Previstos E01-E06», con celdas vacías en los arcos; «Episodios previstos» siempre en el panel (T12a, T13b) | ✅ |
| 39 | Test «con un episodio y Save the Cat, 4 visibles y 11 más»; navegador: «+1 más» en T01E01 se abre al enfocarlo y el foco pasa a la primera nueva (T13b) | ✅ |
| 40 | Navegador: Catalizador con escena de E02 sale atado en E02; el texto se ve al pasar el ratón o con el foco (T13c) | ✅ |
| 41 | Navegador: clic en la franja «Catalizador» y en el momento atado abre T01 en Editar, despliega Save the Cat y enfoca su primer campo (T13c) | ✅ |
| 42 | Tests «JSON roto o valores extraños dan vacío», «solo plantillas de la lista», «limpiar olvida las que no existen en serie ni variante», «una clave por serie»; navegador: Save the Cat en T01 vuelve tras recargar (T13c). Solo en `localStorage`, nunca en las notas | ✅ |
| 43 | Navegador: T03 sin episodios ni previstos dice «Añade episodios para ver la plantilla» (T13b) | ✅ |
| 44 | No se tocó `comprobaciones/`: ningún aviso nuevo | ✅ |

## No funcionales

| Requisito | Prueba | Resultado |
|---|---|---|
| Rendimiento | Tests «300 escenas y 600 causas en menos de 200 ms», «cambiar de plantilla con 300 escenas tarda menos de 100 ms» | ✅ |
| Integridad | Tests «sin causas, la nota es idéntica…», «sin plantillas, la nota es idéntica», «valores raros y no objeto se conservan» | ✅ |
| Compatibilidad v1.0 | `tests/compat-viene-de.test.ts` y `tests/compat-plantillas.test.ts` con el lector congelado de la v1.0 | ✅ |
| Accesibilidad | Navegador: todo con teclado; en la rejilla cada celda de la plantilla va en el DOM justo detrás de su cabecera; marcas con texto | ✅ |
| 900 px | Navegador a 900 px: la página mide 900 con y sin plantilla (la cabecera se parte en dos líneas) | ✅ |
| Rejilla con colocación explícita | Navegador: el arrastre mueve una escena de E03 a E06; la de canon no se mueve, como antes; «Estaba aquí» de «Si lo dejas así…» en su celda; la lente atenúa las filas de los demás arcos | ✅ |

## Revisiones independientes

Dos revisiones independientes.

**Seguridad**: nada crítico, alto ni medio. Entradas de la nota, inyección, escrituras en disco, red y ciclos, limpios.

| Gravedad | Hallazgo | Qué se hizo |
|---|---|---|
| Baja | Quitar una causa «rara» por su posición podía quitar otra si la nota cambió desde que se pintó | Solo se quita si en esa posición sigue la misma; test |
| Baja | Un NUL escrito en la nota partía un momento en «Si lo dejas así…» | Se quita antes de juntar texto, episodio y escena; test |
| Baja | `buscar.ts` calcula dónde se emite cada escena antes de quedarse con 30 | Se deja: series pequeñas, sin coste visible |

**Código**: sin incumplimientos claros de la spec; compatibilidad con la v1.0 correcta.

| Gravedad | Hallazgo | Qué se hizo |
|---|---|---|
| Media | Save the Cat y Viaje del héroe se plegaban al vaciar el único campo mientras se escribía | Se decide abierto o plegado al abrir la temporada; probado en el navegador |
| Media | «ver arriba» podía apuntar a la escena equivocada al reutilizar una fila (clave por índice) | La acción se actualiza con el id nuevo |
| Baja | «+N más» seguía desplegado al cambiar de plantilla | La clave lleva temporada y plantilla |
| Baja | Una causa que ya no está salía como `ev-xxxx` en «Si lo dejas así…» | Sale «(ya no está)» (RF-13); test |
| Baja | Escribir y vaciar el paso 8 de un Story Circle corto dejaba huecos al final | Se quitan los vacíos del final; test |
| Baja | Con «Ninguna» y solo previstos, la rejilla dice «aún no tiene episodios» | Se deja: RF-38 pone la columna «Previstos» con la plantilla; a confirmar con el autor |
| Baja | Enlaces con `href="#id"` | Se dejan: el clic se cancela, y `href="#"` da aviso de accesibilidad |
| Baja | Sin `aria-level` en los `<li>` de las cadenas | Las listas anidadas ya dicen el nivel |

Huecos de test menores que se dejan: borrar la temporada de una causa se simula quitando la escena del modelo, y un momento atado a un episodio borrado se cubre en `vistas-plantillas`, no en `compat-plantillas`.

**Fuera de esta spec**: las pruebas a mano del autor, como en las anteriores.
