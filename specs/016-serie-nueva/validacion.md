# Validación — Spec 016

`npm run verificar` bien (tipos, tests, compilación).

| RF | Cómo | Prueba |
|---|---|---|
| RF-1, RF-2 | `prepararVaultNueva`, `crearSerieEnVaultNueva`, selector en Inicio | `tests/serie-nueva.test.ts` |
| RF-3 | `crearCarpetasWiki` al crear la serie | `tests/serie-nueva.test.ts` |
| RF-4, RF-5 | `recorrido()` y `Recorrido.svelte` | `tests/serie-nueva.test.ts` |
| RF-6 | sin cambios en `serie.md` | revisión del diff |

## A mano
- [ ] Crear una serie en una vault nueva y abrirla en Obsidian.
- [ ] Crear una serie dentro de la vault actual y ver las carpetas.
- [ ] Recorrer los pasos hasta el guion.
