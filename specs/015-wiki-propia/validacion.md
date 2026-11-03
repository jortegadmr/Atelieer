# Validación — Spec 015 «La app crea y edita todo»

Fecha: 2026-10-29. `npm run verificar`: tipos, 1547 tests y compilación del frontal, todo bien.

| RF | Cómo se cumple | Prueba |
|---|---|---|
| RF-1, RF-7, RF-14 | Rejilla de categorías con conteo, listado y buscador (`Mundo.svelte`, `mundo.ts`) | `tests/wiki-mundo.test.ts`; comprobado en el navegador con la serie de prueba |
| RF-2 | «Nueva ficha» con solo el nombre; plantilla de la vault o propuesta | `wiki-mundo.test.ts` |
| RF-3 | Editor a ancho completo (`EditorFicha.svelte`) | navegador |
| RF-4 | Renombrar con plan previo, enlaces de la serie reescritos, copias | `wiki-mundo.test.ts` |
| RF-5 | Mover dentro de la categoría; quitar a `_papelera/_wiki` | `wiki-mundo.test.ts` |
| RF-6 | «Quién la usa» | `wiki-mundo.test.ts` |
| RF-8 | Canon bloqueado hasta desbloquear a propósito; el estado no se cambia con la ficha bloqueada | `wiki-mundo.test.ts` |
| RF-9 | Avisos de las guías de los arcos del personaje sobre su ficha | `tests/wiki-guias-ficha.test.ts` |
| RF-10 | «Editar la ficha» desde la ficha de lectura del guion | a mano |
| RF-11 | Bloc de ideas por ficha | `wiki-mundo.test.ts` |
| RF-12 | Cambio por fuera: tres salidas con copia a la papelera | `wiki-mundo.test.ts` |
| RF-13 | Lo que la app no entiende se conserva; si no se puede aplicar un cambio, se dice | `wiki-mundo.test.ts` |
| RF-14b | Atajos en el menú (Mundo, Glosario, Notas y documentos) | a mano |
| RF-14c | Relaciones como campo `relaciones` de la ficha | `wiki-mundo.test.ts` |

## Revisión independiente (código y seguridad)
12 puntos. Arreglados: renombrar sigue con los enlaces aunque falle el título y relee antes de escribir; el nombre intermedio se devuelve si falla; guardados, mover, quitar y renombrar van en cola; un guardado tardío no toca otra ficha abierta; nombres de solo puntos, reservados de Windows y arranques que rompen el YAML se rechazan; las relaciones que no se pueden guardar avisan; el estado no cambia con canon bloqueado.
Pendientes y aceptados: mover a otra subcarpeta no reescribe enlaces con carpeta (`[[Personajes/Ana]]`); las notas de `_variantes`, `_pizarra` e `_instantaneas` no se tocan al renombrar (a propósito); carreras mínimas entre comprobar y escribir al crear, mover y quitar.

## A mano (Windows y Mac)
- [ ] Crear una ficha en cada categoría y verla en Obsidian.
- [ ] Renombrar una ficha con enlaces y mirar que Obsidian los ve bien.
- [ ] Editar una ficha en Obsidian con la app abierta: aviso con las tres salidas.
- [ ] Quitar una ficha: está en la papelera de la serie.
