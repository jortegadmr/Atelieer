# Tareas — Spec 011 «Análisis: causa y efecto y plantillas de estructura»

> Tareas de 20-30 min, en orden. Una cada vez: tests primero (solo disco, wiki, canon, variante, v1.0 y los cálculos que deciden lo que se ve), `npm run verificar`, marcar, commit.
> Rama `011-causa-y-plantillas`; al acabar se junta en `main`. Sin cambios en `src-tauri/` ni dependencias nuevas.
> La interfaz se comprueba en el navegador (`npm run dev`, serie de prueba en memoria).
> Partidas de nuevo tras la revisión independiente del plan.

## Bloque 1 · «Viene de»
- [x] T1. `modelo/viene-de.ts`: `leerVieneDe`, `anadirCausa`, `quitarCausa`, `queEs` (RF-3, RF-9, RF-19c).
      Hecho cuando están en verde: «añadir y quitar deja las demás entradas igual»; «sin causas se borra la propiedad»; «números, objetos y repetidas se conservan»; «no lista: no editable, con el valor crudo en una línea, y no se toca»; «quitar un id quita sus copias»; «escena / ya no está / no se entiende (otro tipo de pieza, `[[T01E03]]`, el propio id)»; «`__proto__` de primer nivel no da un viene_de heredado».
- [x] T2. Compatibilidad v1.0 de `viene_de` en `tests/compat`, con las simulaciones del plan (editar, reordenar escenas, borrar un episodio, borrar una temporada).
      Hecho cuando están en verde: «la v1.0 ve la escena igual»; «viene_de sobrevive a cada edición de la v1.0»; «sin causas, la nota es idéntica a la de antes».
- [x] T3. `vistas/causas.ts`: `posiciones`, `indiceCausas` (con caché por versión), `marca`, `circulos` (RF-4, RF-6 a RF-8, RF-12).
      Hecho cuando están en verde: «Provoca en orden de emisión»; «tardía en el mismo episodio y entre temporadas»; «orden repetido en disco: la marca sigue a dónde se emite»; «bandeja y Sin temporada: sin sitio»; «aparcada anterior no es tardía»; «causa descartada o que ya no está en Viene de, con su estado» (RF-7); «efecto descartado en Provoca, marcado» (RF-8); «círculo de 3 y de 2»; «solo enlaces a descartadas no es círculo»; «la autorreferencia no cuenta»; «tras editar, el índice cambia (misma instancia de Modelo)».
- [x] T4. `cadenas` (RF-16 a RF-21) y rendimiento de T3-T4 con 300 escenas y 600 causas < 200 ms.
      Hecho cuando están en verde: inicio que solo viene de otra temporada; escena que solo provoca hacia fuera (RF-19b); A → B aparcada → C; círculo sin inicio; círculo con una causa de fuera (RF-19b); «ver arriba» la segunda vez; enlaces de fuera con su marca; sueltas con solo enlaces descartados; orden de inicios y de hijos; toda escena de la pestaña sale una vez entera.
- [x] T5. «Viene de» en `campos-vistos.ts` y sesión (RF-10, RF-11, RF-13, RF-14).
      Hecho cuando están en verde, con la sesión, el disco en memoria y el reloj inyectado de `Historial`: «un paso de Ctrl Z»; «canon bloqueado no cambia»; «en la variante no escribe en la serie»; «aplicar una variante con una causa que ya no está no choca»; «Si lo dejas así dice Viene de»; «cambiar viene_de no pisa otro campo desconocido cambiado fuera».
- [x] T6a. `comunes/BuscarEscena.svelte` (con `filtro`) y bloque «Viene de» en `EditarEvento` (RF-1 a RF-3, RF-5 a RF-7, RF-9, RF-10).
      Hecho cuando en el navegador se añade y quita con teclado, las marcas salen en texto, clic abre la escena y en canon o con valor raro no deja cambiar y dice por qué.
- [x] T6b. «Provoca» en `EditarEvento` (RF-4, RF-6, RF-8, RF-12).
      Hecho cuando en el navegador «Provoca» sale en orden con sus marcas («se ve antes», «(descartada)», «círculo») y clic abre.
- [x] T7. Pestaña «Causa y efecto» (RF-15 a RF-25).
      Hecho cuando en el navegador se ven cadenas, referencias de fuera, círculos y sueltas; «ver arriba» lleva el foco; clic abre en Editar; la lente atenúa; sin causas lo dice.

## Bloque 2 · Plantillas
- [x] T8. `modelo/plantillas.ts`: `PLANTILLAS` (RF-26), `momento`, `ponerMomento` (RF-29 a RF-32).
      Hecho cuando están en verde: «Tres actos escribe texto y episodio en estructura y la escena aparte»; «Story Circle: texto en story_circle, sitio aparte»; «poner escena pone su episodio»; «cambiar de episodio quita la escena de otro episodio»; «vaciar borra la clave y la propiedad»; «valores raros y no objeto se conservan»; «ni `__proto__` en disco ni claves extrañas en el cambio se leen o escriben».
- [x] T9. Compatibilidad v1.0 de las propiedades de plantilla, con las simulaciones del plan (editar la temporada, reordenar episodios, borrar un episodio, cambiar el episodio del detonante).
      Hecho cuando están en verde: «la v1.0 ve Estructura y Story Circle igual»; «lo nuevo sobrevive»; «sin plantillas, la nota es idéntica».
- [x] T10. `vistas/plantillas.ts`: `enEpisodios`, `columnasPlantilla`, `atados` (RF-27, RF-33, RF-34, RF-37 a RF-40).
      Hecho cuando están en verde: los ejemplos de RF-27 para N = 1, 6 y 10; punto en múltiplo exacto (50 %, N = 6 → E03); los 8 pasos con N = 8; «Previstos» con 3 creados y 10 previstos, y sola con 0 creados; un tramo que cruza a «Previstos»; un tramo en cada columna que toca con «desde/sigue/hasta»; 4 visibles y «+11» con 1 episodio y Save the Cat; estados de la escena del momento.
- [x] T11. Momentos en `campos-vistos.ts` con `partes` y sesión (RF-31, RF-35).
      Hecho cuando están en verde, con el reloj inyectado: «poner escena y episodio, un paso de Ctrl Z»; «canon y variante»; «Si lo dejas así dice Save the Cat (Catalizador)»; «Estructura (Detonante) enseña texto, episodio y escena en Lado a lado»; «choque por momento»; «aplicar con una escena de momento que ya no está no choca».
- [x] T12a. `ApartadoPlantilla.svelte`; Estructura y Story Circle de `EditarTemporada` pasan a él; `SelectorPieza` con «(ya no está)»; «Episodios previstos» siempre (RF-28, RF-29, RF-34, RF-38).
      Hecho cuando en el navegador Estructura y Story Circle guardan como antes, con sus guías, y la escena se elige y pone el episodio.
- [x] T12b. Save the Cat y Viaje del héroe en `EditarTemporada`, plegados vacíos; `estado.apartadoTemporada` (RF-28, RF-41).
      Hecho cuando en el navegador se rellenan, se pliegan vacíos y los estados «(en otro episodio)» y «(ya no está)» salen.
- [x] T13a. `app/plantilla-vista.ts` (puro) y su uso en `estado` (RF-42).
      Hecho cuando están en verde: «JSON roto o valores extraños dan vacío»; «solo plantillas de la lista»; «limpiar olvida las que no existen en serie ni variante»; «una clave por serie».
- [x] T13b. Rejilla: colocación explícita, selector, fila «Plantilla», columna «Previstos», «+N más» (RF-36 a RF-40, RF-43).
      Hecho cuando en el navegador las franjas caen en su sitio, se enfocan tras la cabecera con nombre, con 0 creados sale solo «Previstos», y el arrastre, «Sin trama», la lente y las marcas siguen igual; a 900 px la página no se ensancha.
- [x] T13c. Clic en franja o momento abre el apartado; recordar la plantilla al recargar (RF-41, RF-42).
      Hecho cuando en el navegador el clic abre y enfoca el apartado, y la elección vuelve al recargar.

## Bloque 3 · Cierre
- [x] T14. `validacion.md` RF a RF, revisión independiente de código y de seguridad, arreglos con test; PRD, inventario, `docs/diseno.md` al día.
      Hecho cuando `npm run verificar` en verde, revisiones recogidas y la rama lista para juntar en `main`.
