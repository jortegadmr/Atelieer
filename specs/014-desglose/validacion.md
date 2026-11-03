# Validación — Spec 014 «Desglose del guion»

> 2026-10-29 · rama `014-desglose-impl`. La interfaz se comprueba en el navegador (`npm run dev`, serie de prueba en memoria; decisión de la spec 003); los tests cubren lógica, disco, canon y compatibilidad con la v1.0.

| RF | Prueba | Resultado |
|---|---|---|
| 1, 2 | `tests/desglose-analisis.test.ts` (INT/EXT, momento tras `-`, `–`, `—`; primer encabezado da interior/exterior y momento); navegador: tabla de escenas | ✅ |
| 3, 4, 8 | `tests/desglose-filas.test.ts` (filtros alguno/todos, grupos por locación, episodio y personaje, «Sin locación» al final); navegador: «Quitar filtros» con 0 resultados | ✅ |
| 5 | `tests/desglose-filas.test.ts` (origen «guion», «escena» y «ninguno»; marca de origen) | ✅ |
| 6 | Navegador: pinchar una fila abre la escena en Guion; sin guion, en el panel | ✅ |
| 7 | `tests/desglose-filas.test.ts` (escape de `\|`, tope de 100000 con aviso «Recortada»); navegador: «Copiar tabla» | ✅ |
| 9, 10, 11, 14 | `tests/desglose-datos.test.ts` (por personaje, lugar y serie; ordenar por columna) | ✅ |
| 12, 13 | `tests/desglose-objetivo.test.ts` (`_desglose/objetivo.md`, campos ajenos conservados, solo lectura y valores raros rechazados); navegador: «Previsto… Faltan…», cifras como estimación | ✅ |
| 15 | Ningún análisis escribe: `tests/desglose-lectura.test.ts` (`leerCrudo` no marca lo conocido) | ✅ |
| 16, 17, 18 | `tests/desglose-cuadre.test.ts` (un solo `Cambio`, un paso del deshacer, canon bloqueado); navegador: cuadre en la pestaña y en el panel de la escena, «Añadir a la escena», «Deshacer» | ✅ |
| 19 | `tests/desglose-cuadre.test.ts` y `EstadoDesglose.anadir` (con variante: no añade, solo informa) | ✅ |
| RNF-2 | `tests/desglose-rendimiento.test.ts` (1500 escenas analizadas en menos de 500 ms) | ✅ |
| Compatibilidad v1.0 | Nada nuevo en `serie.md` ni en las notas: solo `<serie>/_desglose/objetivo.md` | ✅ |

## Decisiones de interpretación
- Un personaje cuenta en una escena si habla, si está citado con `[[…]]` (con ficha) o si aparece por nombre o alias, como palabra entera, en una línea de acción (mínimo 3 letras).
- Interior/exterior y momento salen del primer encabezado; las locaciones, de todos.
- Los nombres sin ficha se muestran limpios («Sótano Oscuro») y se marcan «sin ficha».
- La duración objetivo se guarda en minutos en `_desglose/objetivo.md`; los campos ajenos de ese fichero se conservan.

## A mano (pendiente del autor)
- Abrir Análisis › Desglose con la serie real (copia, no la vault real) y mirar si las filas, los personajes y las locaciones salen como esperas.
- Poner una duración objetivo y ver «Previsto / Faltan».
- Abrir una escena con guion y comprobar el bloque «Guion y escena» del panel; añadir un personaje y deshacer.
- Probar «Copiar tabla» y pegar en Obsidian.
- Pendientes heredados de la 013: patrón real de los ficheros «Name clash», fragmentos reales de guion, WebView2 y Safari.

## Revisión independiente (2026-10-29)
7 hallazgos, todos tratados con test (`tests/desglose-revision.test.ts`):
- Abrir Desglose o el panel ya no llama a `revisarFichas` (podía pasar piezas a canon y avisar sin fin): lector `leerWikiSoloLectura`.
- Guardar la duración objetivo comprueba que la serie sigue siendo la misma tras escribir.
- Un fichero de objetivo con valores que la app no entiende queda en solo lectura: no se pierde nada.
- Regex de encabezado y personaje: las rachas de espacios se compactan antes (sin coste cuadrático).
- La tabla Markdown escapa `<`, `>`, `[`, `]` y `!`.
- Sin arreglo, a propósito: `delGuion` se recalcula en cada versión (1500 escenas en menos de 500 ms, RNF-2 cumplido); el cuerpo de texto de `objetivo.md` lo fija la app.
