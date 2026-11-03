# Inventario de la v1 (Atelier)

> Qué tenía o planeaba la v1 (diseño, maqueta y código de la v1) y qué hacemos con cada cosa en la v2. Columna «v2»: **MVP**, **Después** o **No** (con motivo). Decidido el 2026-10-20: **todo entra en el MVP**, por entregas (E1-E6, ver `docs/prd.md`).

Leyenda de la columna «v1»: ✔ construido · ◐ diseñado en fase 1, a medias · ○ planeado para fases 2-3.

## G1. Estructura y pantallas
| Pieza | v1 | v2 |
|---|---|---|
| Pasos numerados Serie → Tramas → Temporada → Episodios | ✔ || MVP · E2 |
| Nivel de actos (teaser, inicio, desarrollo, desenlace) | ✔ || MVP · E3 · spec 003: columnas de acto en el nivel episodio del visor, con curva del cambio de valor |
| Escenas (= eventos de la v1) dentro de los episodios, con bandeja de escenas sin episodio | ◐ || MVP · E3 · spec 003: se mueven entre actos (ratón y Alt + flechas); bandeja en el visor de la temporada |
| Rejilla arcos × episodios con eventos como paradas de metro (abre · avanza · gira · cierra) | ◐ || MVP · E3 |
| Varias series con selector al abrir | ✔ || MVP · E2 |

## G2. Serie
| Pieza | v1 | v2 |
|---|---|---|
| Premisa, logline en 5 piezas, pregunta de oro, final decidido, tema, dinámica, preguntas filosóficas | ✔ || MVP · E2 |
| Las 10-11 preguntas con progreso («8/11») | ✔ || MVP · E2 |
| Puntos clave globales (inicio, detonante, giro, crisis, clímax, fin) | ✔ || MVP · E2 |
| Franja de temporadas con carga y temporadas previstas | ✔ || MVP · E2 |

## G3. Tramas y arcos
| Pieza | v1 | v2 |
|---|---|---|
| Tres tipos: trama · personaje · relación; A/B/C; color | ✔ || MVP · E2 |
| Nivel serie o temporada, y **tramos** de un arco de serie por temporada | ✔ || MVP · E2 |
| Cinco beats (planteamiento, complicación, punto medio, crisis, resolución) | ✔ || MVP · E2 |
| Campos guiados: quiere/por qué, impide, gana/pierde, bomba de tiempo, cambia, pegamento; en personaje: quiere/necesita, herida, mentira, estado por temporada | ✔ || MVP · E2 |
| Siembras y recogidas, con «Sugerir» desde los secretos | ✔ || MVP · E2 |
| Inicio/fin manual frente al calculado por eventos | ✔ || MVP · E2 |

## G4. Temporada
| Pieza | v1 | v2 |
|---|---|---|
| Cuatro cajas: punto de partida · estructura · punto de llegada · cierre/cliffhanger; logline, pregunta dramática, tema | ✔ || MVP · E2 |
| Story Circle de la temporada | ◐ || MVP · E2 (fuera de la spec 002; spec propia) |
| Trama principal de la temporada | ✔ || MVP · E2 |
| Curva de carga + / − | ✔ || MVP · E2 |

## G5. Episodio y escena (evento en disco)
| Pieza | v1 | v2 |
|---|---|---|
| Episodio: idea central, protagonista, deseo, fuerza antagónica, conflicto, acción, contexto, gancho, carga, estado de escritura (idea · escaleta · guion) | ✔ || MVP · E3 |
| Trama dominante calculada | ✔ || MVP · E3 |
| Escena (evento de la v1; «escena» en la interfaz desde la spec 003): arcos con papel, personajes, lugares, valor + / −, microconflicto, test de relleno, test de eliminación | ◐ || MVP · E3 |
| «Cuándo ocurre en el mundo» y «cómo se cuenta» (escena · flashback · leyenda) | ◐ || MVP · E3 |

## G6. Secretos
| Pieza | v1 | v2 |
|---|---|---|
| Nivel (menor · mayor · central), la verdad (solo autor), qué cree el público, quién lo conoce | ✔ || MVP · E3 |
| Pistas (obvia · sutil), pistas falsas, dónde se revela | ✔ || MVP · E3 |
| Regla de spoilers: la verdad no se copia antes de revelarse | ✔ || MVP · E3 |

## G7. Guía y comprobaciones
| Pieza | v1 | v2 |
|---|---|---|
| `guia.md` editable con reglas G01-G49 y juego de magia M01-M02 | ✔ || MVP · E4 |
| 19 comprobaciones (carga, subtramas, arcos olvidados, secretos sin pistas, relleno…) | ◐ || MVP · E4 |
| Panel derecho: Editar · Guía · Comprobar; «lo sé» para silenciar | ◐ || MVP · E4 · spec 004: la pestaña Guía marca cada regla con texto (se cumple, no se cumple, sugerencia, lo sé, la juzgas tú). Spec 005: pestaña «Si lo dejas así…» entre Editar y Guía |
| «Si lo dejas así…»: avisos nuevos con sus reglas, otras piezas afectadas, lo cambiado y lo que ya no avisa; «Volver a como estaba» entero; resaltado y «antes» en el visor; «Si la creas así…» en «Nueva pieza» | — || MVP · E4 · spec 005, hecho |
| Regla de la guía junto a cada campo, con su marca, «Lo sé» y «Ver en la Guía»; «Lo que te pedirán tus guías» en «Nueva pieza» | — || MVP · E4 · spec 004, hecho |

## G8. Probar y seguridad de datos
| Pieza | v1 | v2 |
|---|---|---|
| Madurez idea · borrador · canon · descartado, con «por qué se descartó» | ✔ || MVP · E1/E4 |
| Instantáneas (.zip automáticas y con nombre) y papelera | ✔ || MVP · E1/E4 |
| Deshacer / rehacer, buscar o crear (Ctrl K) | ◐ || MVP · E1/E4 |
| Aviso de «abierta en otro equipo» y de conflicto de Proton | ✔ || MVP · E1/E4 |
| Variantes «¿Y si…?» y comparar lado a lado | ○ || MVP · E4 · spec 006, hecho: variantes guardadas en `appDatos/<serie>/_variantes/`, «Probar otra versión» y «Versiones», ver ahora / cómo quedaría, marcas de acento en el visor, pestaña «¿Y si…?», choques, aplicar entero (canon, wiki, instantánea, un paso de deshacer), descartar y recuperar |

## G9. Obsidian y la wiki
| Pieza | v1 | v2 |
|---|---|---|
| Personajes, lugares y épocas leídos de la wiki, con autocompletado y «Crear ficha» | ✔ || MVP · E5 |
| Ver el motor del personaje al pasar el ratón; abrir en Obsidian | ✔ || MVP · E5 |
| «Pasar a la wiki» con plantillas, Fuentes y entrada en `Log.md`; detectar desfase | ✔ || MVP · E5 |
| Editar la ficha desde la app (pestaña «Ficha», por apartados, con copia en `_fichas/` y entrada en el Log) | — || MVP · E5 · spec 009, hecho |
| «Alternativas descartadas» en la ficha del arco al descartar o recuperar una escena o un tramo | — || MVP · E5 · spec 009, hecho |
| Estados antiguos de la wiki (`estado_canon` de antes de la regla 9): aviso, propuesta, «Confirmar» y «Dejarlo así» | — || MVP · E5 · spec 009, hecho |
| Marcas de «antes» y de variante en Tramas, la rejilla y la línea; arcos y secretos con variante en el visor | — || MVP · E5 · spec 009, hecho |

## G10. Análisis (planeado para fases 2 y 3 de la v1)
| Pieza | v1 | v2 |
|---|---|---|
| Quién sabe qué (personajes y público por episodio) | ○ || MVP · E6 · spec 010, hecho: pestaña de «Análisis» con el público (pistas acumuladas, revelado) y quién lo sabe por episodio, con «Lo sabe desde» en «Lo conocen» |
| Causa y efecto entre eventos | ○ || MVP · E6 · spec 011, hecho: «Viene de» en la escena (guardado por id) y «Provoca» calculado, con marcas «se ve después», «sin sitio todavía» y «círculo»; pestaña «Causa y efecto» en Análisis con cadenas, enlaces de fuera y escenas sueltas |
| Lente (atenuar todo menos un personaje o arco) | ○ || MVP · E6 · spec 010, hecho: también de secretos; botón «Lente» y «Enfocar» con clic derecho; atenúa el visor, la rejilla, la línea y Análisis; no se guarda |
| Mapa de presencia de personajes | ○ || MVP · E6 · spec 010, hecho: personajes × episodios con escenas por casilla, totales y ausencias largas |
| Escribir el guion de cada escena | ○ || MVP · E7 · spec 013, hecho: vista «Guion» a pantalla completa con la hoja centrada (Courier, 1 página ≈ 1 minuto), tipos de línea y Tab/Enter como los programas de guion, referencias `@` a personajes y lugares de la wiki con ficha de lectura, código de escena `T01E06-S03` calculado, páginas por escena, episodio, temporada y serie; un fichero por escena en `_guion/` que la v1.0 ignora |
| Llevar a la sala de guionistas | ○ || MVP · E6 · spec 012, hecho: «Llevar a la sala» en el panel de un episodio, una escena, un arco o un secreto, en la lente y en la tarjeta de la pizarra; copia un planteamiento en Markdown (qué es, ficha, avisos, causas, quién sabe qué, «Si lo dejas así…», alternativas, notas unidas y «Quiero decidir:»), con el texto del autor como texto, recorte a 100 000 caracteres y sin escribir nada |
| Pizarra libre de ideas | ○ || MVP · E6 · spec 012, hecho: vista «Pizarra» con notas de colores, tarjetas de piezas y flechas con etiqueta, zoom y encuadre, teclado, «Ver como lista», «Pasar a idea», deshacer y guardado automático en `_pizarra/pizarra.md` (decisión 0003) |
| Vista esquema (la temporada como texto) | ○ || MVP · E6 · spec 010, hecho: episodio → acto → escena, con «Copiar» como Markdown escapado |
| Vista cronológica (orden del mundo, Timeline) | ○ || MVP · E5 · spec 009, hecho: la línea de la historia, por épocas de la Timeline, con filtro de temporada y mover de época (solo cambia `mundo`) |
| Plantillas de estructura superpuestas (Story Circle, tres actos, Save the Cat…) | ○ || MVP · E6 · spec 011, hecho: Tres actos, Story Circle, Save the Cat y Viaje del héroe; cada momento con texto, episodio y escena en el panel de la temporada; en la rejilla, franjas por episodio, columna «Previstos» y momentos atados; la plantilla a la vista se recuerda en el equipo |

## Choques con lo decidido en la v2
- **Dónde se guarda.** La v1 tenía su carpeta (`appDatos`) y un paso «Pasar a la wiki». En la v2, la vault es la única verdad (constitución 1): las piezas son notas de la wiki desde el principio y Resuelto: **modo mixto** (ver `docs/prd.md`). idea/propuesta/aparcado en la mesa; borrador/canon en la wiki; pasar a borrador = «Pasar a la wiki».
- **Estados.** La regla 9 de la wiki usa `estado_canon`: idea · borrador · canon · descartado. La v2 añade `propuesta` y `aparcado`. Resuelto con el modo mixto: los estados nuevos solo viven en la mesa, la wiki sigue con los de su regla 9.
