# 0005 · El mundo se crea y se edita en la app

**Fecha:** 2026-10-29 · **Spec:** 015

## Decisión
La app crea y edita las fichas del mundo (personajes, lugares, épocas, glosario, grupos, poderes y reglas, eventos del mundo, especies y documentos). Cada ficha es una nota de la vault; Obsidian queda como copia y visor.

## Cómo
- Las categorías nuevas son carpetas con nombre fijo bajo la raíz de la wiki (`<raíz>/Glosario`, etc.). No se añade ninguna clave a `serie.md`: la v1.0 sigue leyendo todo.
- Escribir una ficha pasa por `escribirFicha`: compara el texto completo antes de escribir, guarda copia en `appDatos/<serie>/_fichas` y escribe de forma segura. Lo que la app no entiende (campos, comentarios, formato) se conserva.
- Quitar una ficha la manda a `_papelera/_wiki` de la serie; nunca se borra una nota.
- Renombrar enseña antes un plan con las notas que se tocarán, renombra la nota y reescribe los enlaces `[[…]]` de la wiki, la mesa y el guion, con copia previa.
- Relaciones: campo `relaciones` en el frontmatter de la ficha. Ideas: apartado `## Ideas`.
- Una ficha de canon no se edita hasta desbloquearla. Si cambia por fuera, tres salidas (quedarme con la mía, usar la de fuera, copiar la mía).
- Las guías (G7) no tienen reglas nuevas: la ficha de un personaje enseña los avisos de los arcos donde es protagonista.

## Alternativas descartadas
- Una clave nueva por categoría en `serie.md`: rompería la lectura de la v1.0.
- Editar las fichas dentro de un panel lateral: el autor pidió a ancho completo.
