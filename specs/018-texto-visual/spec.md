# Spec 018 — Texto visual: escribir sin saber Markdown

> Estado: **aprobada por el autor el 2026-10-29** («sí» a la propuesta). Se hace antes que la 014.

## Contexto y objetivo
Los apartados de las fichas se ven y se editan como Markdown crudo (`###`, `**`, `| --- |`): difícil y poco atractivo. El autor quiere escribir sin conocer Markdown. El fichero sigue siendo Markdown normal, así que Obsidian lo ve igual.

## Requisitos
- RF-1: LOS apartados de una ficha se mostrarán **formateados** por defecto: títulos, negrita, cursiva, listas, citas, líneas, enlaces `[[…]]` como enlaces y `[PENDIENTE]` resaltado. Los comentarios `<!-- -->` no se ven (se conservan).
- RF-2: UN clic en el texto (o Intro con el foco) lo pasa a edición; al salir del campo, con «Listo» o con Escape se guarda por el camino de siempre (spec 015; la app guarda sola, Escape no descarta) y vuelve a verse formateado. Con teclado, el botón «Editar» hace lo mismo que el clic.
- RF-3: AL editar habrá una **barra de botones**: Negrita, Cursiva, Título, Lista, Cita y Enlace a ficha. Actúan sobre la selección o, en título, lista y cita, sobre la línea; sin selección, negrita, cursiva y enlace ponen un texto de ejemplo seleccionado. Se se pueden deshacer con el deshacer del campo.
- RF-4: LAS **tablas** (p. ej. el Núcleo) se rellenan como formulario: cada celda es un campo; al salir de una celda se guarda la tabla entera con su formato. Las columnas y filas existentes no se pierden.
- RF-5: UN clic en un enlace `[[Nombre]]` abre esa ficha si existe.
- RF-6: HABRÁ una ayuda «Cómo se escribe» siempre a mano, con cinco líneas de ejemplo.
- RF-7: LO que no se entienda se conserva tal cual al guardar (spec 015, RF-13). Nunca se interpreta HTML ni se ejecuta nada del texto del autor.
- RF-8: CON una variante abierta, o si la ficha es canon bloqueada, el texto se ve formateado y no se edita.
- RF-9: ACCESIBLE con teclado; los botones llevan nombre; contraste AA.

## No funcionales
Sin dependencias nuevas (intérprete propio de un subconjunto); sin `{@html}`; nada sale del equipo; estética de la v1.

## Fuera de alcance
Editor de imágenes o adjuntos; Markdown completo (HTML, notas al pie, código en bloque con resaltado); aplicarlo al editor del guion (tiene el suyo).
