# PRD — Atelier (v2)

> Qué se construye y por qué. Sin tecnología: eso va en docs/decisiones/.

## Problema y objetivo
Antes de escribir el guion de una serie hay que ver, probar, descartar y editar todo lo que la compone. Las apps parecidas trabajan de abajo arriba (del episodio a la temporada). Atelier trabaja **de lo general a lo particular**: trama global → temporadas (tramas y arcos) → episodios → actos → escenas. Todo lo que se prueba queda en una vault de Obsidian, conectado con sus fichas y comprobado contra sus guías de escritura.

Es la evolución de la v1 sobre su mismo código (decisión 0002); la v1.0 sigue instalable al lado. La estructura y las piezas de la v1 eran correctas; lo que falló es que **no se veían las relaciones ni las consecuencias** de cada cambio, ni la serie entera. La v2 conserva todo lo de la v1 (ver `docs/inventario-v1.md`) y hace visible a qué afecta cada cambio.

## Usuarios
Una persona (el autor), en varios equipos: Windows y macOS (Intel).

## Tipo de proyecto y nivel de riesgo
- Tipo: aplicación de escritorio que lee y escribe notas Markdown en una vault de Obsidian.
- Nivel: **A — Personal.** Un solo usuario, en sus equipos, sin cuentas, sin servidor y sin datos personales de terceros (los personajes son ficción). Lo delicado es no perder ni romper notas de la vault.

## Principio de diseño
**Ver el efecto.** Rellenar un formulario está bien siempre que se vea a qué afecta y cómo quedaría. En todas las pantallas: la serie entera a la vista, «Si lo dejas así…» con lo que cambia y las reglas de las guías que dejan de cumplirse, y el modo «¿Y si…?» para comparar «Ahora» con «Cómo quedaría».

## Dónde vive cada pieza (modo mixto)
| Estado | Dónde | Notas |
|---|---|---|
| `idea`, `propuesta`, `aparcado` | Mesa de borradores: `appDatos/<serie>/` dentro de la vault, excluida en Obsidian | Pruebas y alternativas |
| `borrador`, `canon` | Wiki de la serie (p. ej. `MiSerie/01_Wiki/01_Narrativa/…`), con su plantilla | Pasar a `borrador` crea la ficha (plantilla, Fuentes, entrada en `Log.md`); desde ahí se edita en la wiki, sin copias |
| `descartado` | Donde estaba; en la wiki, en «Alternativas descartadas» de su arco | Nunca se borra; se ve y se recupera |

`canon` solo se edita desbloqueándolo a propósito (aviso de retcon). Pasar a canon o descartar es siempre un botón explícito. Los estados antiguos de la vault se muestran con una equivalencia propuesta que el autor confirma; nunca se reescriben solos.

## Funcionalidades del MVP, por entregas
El MVP incluye **todo** el inventario de la v1 (grupos G1-G10 de `docs/inventario-v1.md`) más lo nuevo de la v2. Se construye en entregas; cada una se puede usar sola.

| Entrega | Contenido | Ya sirve para |
|---|---|---|
| 1 · Esqueleto vivo | Conectar vault y serie; leer y escribir notas de forma segura y tolerante; estados y modo mixto; instantáneas, papelera, aviso de otro equipo y de conflicto (G8 parte) | Abrir una serie sin miedo a romper nada |
| 2 · De arriba abajo | G1 estructura, G2 serie, G3 tramas y arcos, G4 temporada; mapa de la serie siempre visible; captura rápida de ideas | Plantear la serie y sus temporadas |
| 3 · Hasta la escena | G5 episodio, actos y evento (bandeja, rejilla), G6 secretos | Bajar a episodio y escena |
| 4 · Consecuencias | G7 guía y comprobaciones; «Si lo dejas así…»; «¿Y si…?» con variantes y comparar; deshacer, Ctrl K (resto de G8) | Probar y ver qué rompe cada cambio |
| 5 · Wiki y vistas | G9 Obsidian y wiki (fichas de personajes, lugares, épocas y secretos); línea de la historia (el tablero, la línea de emisión y el mapa de arcos ya son el visor y la rejilla); editar fichas desde la app, «Alternativas descartadas» y estados antiguos de la wiki (spec 009) | Trabajar con fichas y todas las vistas |
| 6 · Análisis | G10: quién sabe qué, causa y efecto, lente, mapa de presencia, llevar a la sala, pizarra libre, vista esquema, plantillas de estructura. Parte 1 (spec 010): lente de personaje, arco o secreto; vista «Análisis» con Presencia, Quién sabe qué (con «Lo sabe desde» en el secreto) y Esquema para copiar. Parte 2 (spec 011, hecha): «Viene de» y «Provoca» en la escena, pestaña «Causa y efecto», y plantillas de estructura en el panel de la temporada y en la rejilla. Parte 3 (spec 012, hecha): pizarra libre (notas, tarjetas y flechas, en `_pizarra/pizarra.md`) y «Llevar a la sala» (planteamiento en Markdown al portapapeles desde el panel, la lente y la pizarra) | Analizar la serie a fondo |
| 7 · Guion | Escribir el guion de cada escena (Courier 12, una página ≈ un minuto), referencias a fichas de la wiki, código de escena, (spec 013, hecha; entrada del guion decidida por el autor el 2026-10-29). El desglose por locación y personaje con datos y análisis es la spec 014 (hecha) | Escribir y rodar |

Las comprobaciones (G7) **señalan qué está mal o no se cumple**, con la regla y la guía que lo piden (`appDatos/guia.md`, `Guia/Chuleta de escritura.md`, chuleta de magia, reglas de la wiki). El autor decide: corregir, cambiar o seguir así dejando constancia.

## Fuera de alcance (esta versión)
- Sincronización propia: la pone la vault (el servicio de sincronización de archivos que se use).
- Móvil o tablet.
- Generar ideas con IA dentro de la app.
- Exportar a PDF o a programas de guion.

## Para más adelante
- Generar variantes con IA.
- Exportar la estructura.
- Versión móvil.

## Requisitos no funcionales
- Plataformas: Windows y macOS (Intel).
- Idioma: español.
- Interfaz: **intuitiva sin manual** — las tareas básicas se hacen sin leer instrucciones (requisito principal, por el fallo de la versión 1).
- Libertad: escribir y probar nunca exige rellenar campos; las guías señalan qué no se cumple y por qué; decide el autor (corregir, cambiar o seguir dejando constancia).
- Rendimiento: capturar una idea y tenerla guardada en la vault en menos de 10 s; abrir una serie de la vault actual (~300 notas) en menos de 2 s.
- Integridad de la vault: la app no borra notas (usa papelera), conserva campos y texto que no entiende, tolera notas editadas a mano o reformateadas por Obsidian, y no rompe los enlaces `[[...]]`.
- Varios equipos: avisa si la serie está abierta en otro equipo y detecta conflictos de sincronización (p. ej. los archivos «Name clash» que crea Proton al sincronizar).
- Seguridad: nivel A. Nada sale del equipo (sin telemetría ni servicios externos).

## Datos que maneja
| Dato | ¿Personal? | Para qué | Cuánto tiempo se guarda |
|---|---|---|---|
| Notas de la serie (tramas, temporadas, episodios, actos, escenas, arcos) | No (ficción) | Desarrollar la serie | Lo que decida el autor; viven en su vault |
| Fichas (personajes, lugares, secretos) | No (ficción) | Enlazar con la historia | Ídem |
| Ruta de la vault y preferencias | No | Recordar dónde trabajar | En cada equipo, hasta desinstalar |

## Integraciones y costes
| Servicio | Para qué | Coste estimado / mes |
|---|---|---|
| Obsidian + un servicio de sincronización de archivos | Ver notas y sincronizar equipos | 0 € adicional |
| GitHub (repositorio y compilación de Mac con Actions) | Copia del código y compilar para Mac Intel | 0 € (plan gratuito) |

## Métricas de éxito
- Se desarrolla una serie completa de lo general a lo particular solo con Atelier v2.
- Una idea pasa de la cabeza a la vault en menos de 10 s, sin rellenar campos.
- Las tareas básicas se hacen sin manual (lista de pruebas del autor).
- Cero notas perdidas o pisadas usando PC y Mac durante un mes.

## Riesgos y dudas abiertas
- Resuelto: «tramas» = los arcos de la v1 (tipo trama · personaje · relación, A/B/C, de serie o de temporada, con tramos). Se confirma en la spec de la entrega 2.
- Resuelto: dónde se crean las notas, con el modo mixto (arriba). Carpetas de la wiki como en la v1: `01_Narrativa/Temporadas`, `Episodios`, `Arcos`, `Secretos`.
- Resuelto: la mesa de borradores es `appDatos/<serie>/` con el formato de la v1; la v2 lo amplía sin que la v1.0 deje de leerlo (constitución 9).
- Resuelto en la spec 003 (2026-10-20): escena = evento de la v1, sin campos nuevos. La interfaz dice «escena»; en disco y en la guía del autor sigue «evento». Los «eventos» de la Timeline de la wiki son otra cosa (Regla 13).
- Riesgo: editar la misma nota en PC y Mac antes de que sincronice el servicio de sincronización.
- Riesgo: **alcance muy grande** (v1 completa más sus fases 2 y 3). Mitigación: entregas usables por separado y en orden; se puede parar en cualquiera.
- Rendimiento heredado de la v1: 5 temporadas × 10 episodios × 300 eventos abren en menos de 1 s en un Mac Intel de 2017; las comprobaciones, en menos de 100 ms.
