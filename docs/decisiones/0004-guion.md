# 0004 — Cada escena guarda su guion en `_guion/<id>.md`, junto a la serie

- **Fecha:** 2026-10-29
- **Estado:** aceptada (spec 013, «Guion»)

## Contexto
El guion de una escena es texto largo, con formato propio (encabezados, personajes, diálogos), que el autor escribe a ratos y que puede pasar de cientos de líneas. No es una pieza de la serie (sin estado ni comprobaciones) ni una ficha de la wiki. Había que guardarlo sin romper que la vault sea la única verdad (constitución 1), que la v1.0 siga abriendo la serie sin avisos ni pérdidas, y que no se pierda ni una letra escrita.

## Decisión
- Un fichero Markdown por escena: `appDatos/<serie>/_guion/<ev-id>.md`, con cabecera `atelier_guion: 1` y `escena`. El guion **viaja con su escena** (el id), no con su posición.
- La v1.0 no recorre carpetas que empiezan por `_` (igual que `_variantes` y `_pizarra`); lo comprueba `tests/compat-guion.test.ts` con el lector de la v1.
- Texto plano inspirado en Fountain; el tipo de cada línea sale de la línea y su contexto, y los prefijos `.` `!` `@` `>` lo fuerzan. Lo que la app no entiende (cabecera ajena, caracteres de control) se conserva tal cual.
- Referencias a personajes y lugares: `[[Vera]]`, `[[Vera|alias]]`, `[[ruta|Nombre]]`; se escriben con `@` desde un selector.
- El código de escena (`T01E06-S03`, `S03`) se **calcula por posición**, no se guarda; cambia al reordenar.
- Guardado diferido por escena. Si el fichero cambia por fuera mientras hay texto local, **nunca se descarta lo local**: se mantiene y se ofrecen tres salidas (quedarme con la mía, usar la de fuera, copiar la mía), cada una con copia en `_papelera/_guion/`.
- Al borrar o restaurar una escena su guion se mueve a/de la papelera; si falla, se avisa y el cambio se mantiene. Las sesiones de variantes no tocan `_guion/`.
- Una copia previa a la papelera se hace antes de borrar más de 500 caracteres de un golpe. Topes: 1 MB y 500 páginas por escena; un fichero de más de 2 000 000 de caracteres se ignora.
- El guion entra en las instantáneas (`_guion/ev-*.md`) y se restaura con ellas.
- El editor es propio (contenteditable controlado: todo cambio pasa por `beforeinput`), con historial por escena. Sin dependencias nuevas y sin cambios en `src-tauri/`.
- Las fichas de personajes y lugares no se editan en la app: «pinchar» una referencia abre una ficha de lectura con «Abrir en Obsidian» (Ctrl/Cmd + clic va directo a Obsidian).
- El desglose por locación y personaje pasa a la spec 014.

## Alternativas descartadas
- **El guion dentro de la nota de la escena (evento):** la v1.0 reescribiría el cuerpo o lo perdería, y cada pulsación tocaría una pieza con canon y comprobaciones.
- **Un solo fichero por episodio o por serie:** conflictos de sincronización entre escenas y un fallo de un trozo afectaría a todo.
- **Un editor de terceros (CodeMirror, ProseMirror):** añade dependencia (prohibida sin aprobación) y no encaja con la pérdida cero de texto exigida.
- **Guardar el código de escena:** se desincroniza al reordenar y obligaría a reescribir notas ajenas.
