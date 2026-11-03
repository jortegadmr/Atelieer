# 0001 — Stack: app de escritorio con Tauri 2 + Svelte 5

- **Fecha:** 2026-10-20
- **Estado:** aceptada; ver también 0002 (se construye sobre el código de la v1, que ya usa este stack)

## Contexto
Atelier es una app de escritorio de nivel A (personal) que lee y escribe notas Markdown con frontmatter YAML en una vault de Obsidian sincronizada entre equipos. Tiene que funcionar en Windows y en macOS (Intel). Se eligió app independiente frente a plugin de Obsidian y se dejó la tecnología a criterio técnico. La v1 usó este mismo stack y llegó a funcionar en los dos sistemas, incluida la compilación de Mac Intel desde GitHub.

## Decisión
| Pieza | Elección | Por qué |
|---|---|---|
| Contenedor de escritorio | Tauri 2 | Ejecutables pequeños, probado en los dos equipos en la v1, compilación de Mac Intel resuelta |
| Interfaz | Svelte 5 + TypeScript + Vite | Poco código para interfaces reactivas; la v1 ya demostró que encaja |
| Datos | Las propias notas `.md` de la vault (frontmatter YAML con la librería `yaml`) | La vault es la fuente de verdad (PRD); sin base de datos que sincronizar |
| Acceso a disco | Plugins oficiales de Tauri (`fs`, `dialog`) y Rust solo donde haga falta (vigilar cambios, escrituras seguras) | Lo mínimo de Rust; la lógica vive en TypeScript, que es más fácil de probar |
| Preferencias por equipo | Almacenamiento local de la app | La ruta de la vault no se sincroniza entre equipos |
| Tests | Vitest (lógica) + svelte-check (tipos) | Rápidos, sin navegador; la lógica de modelo y comprobaciones se prueba sin Tauri |
| Código y compilación | GitHub + GitHub Actions (tests en cada push; compilación de Windows y de Mac Intel) | Gratis; el Mac se compila sin tener que programar en él |

Versiones al 2026-10-20: Tauri CLI 2.12, Svelte 5.57, Vitest 5.0, Rust 1.99. TypeScript se fija en la rama 6.x (la 7.0 es reciente y se comprobará la compatibilidad con svelte-check antes de subir).

## Alternativas descartadas
- **Plugin de Obsidian:** se sincronizaba solo y resolvía los enlaces, pero el autor prefiere una app independiente de Obsidian.
- **Electron:** más popular, pero ejecutables de ~150 MB frente a ~10 MB y más memoria; no aporta nada que Tauri no cubra aquí.
- **Python + PySide:** buena opción de escritorio, pero hacer una interfaz moderna y fluida (tablero, líneas temporales, mapas) es más costoso que con web.
- **Base de datos (SQLite):** duplicaría la vault y crearía dos verdades que sincronizar.

## Consecuencias
- Coste: 0 €/mes.
- Hay que compilar e instalar en cada equipo; en el Mac, la app sin firmar se autoriza una vez en Ajustes › Privacidad y seguridad › Abrir igualmente.
- La app escribe en archivos que Obsidian también puede tener abiertos: escrituras seguras, lectura tolerante, vigilancia de cambios externos y aviso de conflicto son obligatorias (PRD, «Integridad de la vault»).
- Renombrar una nota desde la app no actualiza los enlaces como lo hace Obsidian: lo debe resolver la propia app o evitarse (se decide en la spec correspondiente).
- Se reutilizan ideas de la v1, no su código: proyecto desde cero.
