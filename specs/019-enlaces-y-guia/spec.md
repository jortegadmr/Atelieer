# Spec 019 — Enlaces que llevan a algún sitio y la guía a mano

> Estado: **aprobada por el autor el 2026-10-29** («sí, spec y adelante»; para la guía, «vista propia con todo»).

## Contexto y objetivo
El autor encuentra cosas con puntero de mano que, al pincharlas, no hacen nada visible:
1. «Tu serie, paso a paso»: «La premisa» lleva a Serie, donde ya está.
2. En el guion, una referencia `[[…]]` sin ficha (o con una ficha que no es personaje, lugar ni época) solo deja un aviso para el lector de pantalla.
3. En Serie, el título, la premisa vacía y las tarjetas Pregunta de oro, Final decidido y Pregunta filosófica eligen la serie en el panel, que ya estaba elegida.

Además quiere las guías más a mano: «Guía de escritura» del menú abre hoy la pestaña Guía de la serie, no las guías.

## Requisitos
### Enlaces
- RF-1: EN Serie, el título, la premisa vacía y las tres tarjetas llevarán el foco a **su campo** en la pestaña Editar del panel (Título, Premisa, Pregunta de oro, Final decidido, Preguntas filosóficas), con el campo a la vista.
- RF-2: EN «Tu serie, paso a paso», «La premisa» llevará el foco al campo Premisa del panel. Los demás pasos siguen como están (ya cambian de vista).
- RF-3: EN el guion, pinchar una referencia sin ficha de personaje, lugar o época la buscará en **todas** las categorías del mundo (spec 015); si la encuentra, abre su ficha en Mundo.
- RF-4: SI no hay ninguna ficha con ese nombre, saldrá una **tarjeta visible** junto al guion: «“Nombre” no tiene ficha», con «Crear personaje», «Crear lugar» y «Cerrar». Crear abre la ficha nueva en Mundo. Con una variante abierta, solo «Cerrar».
- RF-5: SI el nombre es ambiguo (dos fichas), la tarjeta lo dice y deja elegir cuál abrir.

### Guía de escritura
- RF-6: «Guía de escritura» del menú abrirá una **vista propia** con todas las reglas de `appDatos/guia.md`, agrupadas por pieza (serie, arcos, subtrama, temporada, episodio, evento, secreto) en ese orden, con su id, texto y fuente.
- RF-7: UN buscador filtra las reglas por texto, id o fuente (sin tildes ni caja).
- RF-8: LA fuente que empieza por `§` (p. ej. «§18 · F1.6») tendrá cada `§N` como enlace: abre al lado ese apartado de la **chuleta de escritura** (`Guia/Chuleta de escritura.md` del vault), formateado y de solo lectura (spec 018), con «Abrir en Obsidian».
- RF-9: UN apartado es el título de la chuleta que empieza por `§N`, `N.` o `N)` (cualquier nivel), hasta el siguiente título de su nivel o superior. Si no está, o la chuleta no existe, se dice así y se ofrece abrir la chuleta en Obsidian.
- RF-10: LA vista tendrá también «Leer la chuleta entera» y «Abrir guia.md en Obsidian».
- RF-11: SI no hay `guia.md`, la vista lo dice y ofrece crearla con la guía inicial (como hoy en la pestaña Guía).
- RF-12: LA vista solo lee: no escribe en la chuleta ni en `guia.md` (salvo RF-11).

## No funcionales
Sin dependencias nuevas; nada sale del equipo; estética de la v1; accesible con teclado; la chuleta se lee como texto, sin interpretar HTML. Compatible con la v1: no cambia nada de lo que se escribe en `appDatos/`.

## Fuera de alcance
Editar reglas desde la vista; hacer enlaces de los nombres en los diálogos del guion (solo las referencias `[[…]]`/`@` son enlaces); otras guías aparte de la chuleta (magia, plantillas).
