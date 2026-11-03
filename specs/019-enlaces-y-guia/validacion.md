# Validación — Spec 019

Probado en el navegador con la serie de prueba en memoria (`npm run dev`) y con `npm run verificar` (1673 tests).

| RF | Cómo se comprobó | Resultado |
|---|---|---|
| RF-1 | Serie: pinchar título y «Final decidido» deja el foco en su campo del panel | ok |
| RF-2 | Serie nueva: «La premisa» en el paso a paso enfoca el campo Premisa | ok |
| RF-3 | `buscarPorNombre` recorre todas las categorías del mundo antes de decir que no hay ficha | ok (código) |
| RF-4 | Guion: `[[Nadie Conocido]]` saca la tarjeta «No tiene ficha»; «Crear lugar» crea la ficha y la abre en Mundo | ok |
| RF-5 | Tarjeta con la lista de candidatas si hay varias | ok (código) |
| RF-6, RF-7 | «Guía de escritura» abre la vista; 9 grupos; buscar «ORO» deja G03 | ok; tests `guia-chuleta` |
| RF-8, RF-9 | «§18» abre el apartado de la chuleta formateado; sin chuleta, lo dice | ok; tests `guia-chuleta` |
| RF-10, RF-11 | «Leer la chuleta entera», «guia.md en Obsidian», «Crear guia.md» | ok |
| RF-12 | `leerChuleta` solo lee | test |

## Revisión independiente (arreglado)
- Guion: una búsqueda lenta ya no pisa a otra más reciente ni salta de vista; sin ficha con ruta (`[[Guia/x]]`) no se ofrece crear; varias fichas con el mismo nombre en distintas categorías salen como candidatas; al cerrar la tarjeta el foco vuelve donde estaba; si falla crear, lo dice en la tarjeta.
- Crear ficha desde el guion no cambia de vista si el nombre no vale o el Mundo es de solo lectura.
- Chuleta: los títulos dentro de bloques de código y del frontmatter no cuentan; acepta `## 18.1 Título` y quita los `#` del final.
- Guía: vuelve a leer la chuleta al cambiar de vault; `aria-pressed` en los «§N»; el foco va al apartado abierto y Escape lo cierra; «Abrir en Obsidian» activo aunque la chuleta no esté.

## Tras probar el instalador
- Pinchar una referencia del guion no hacía nada en la app: si el editor se repinta entre apretar y soltar (se mueve el cursor, se guarda, se relee la wiki), el clic llega al editor y no a la referencia. Ahora la referencia se apunta al apretar y se abre al soltar sin moverse; arrastrar para seleccionar no abre nada. Y el editor ya no se repinta cuando la lista de fichas se rehace igual. Comprobado en el navegador simulando el clic perdido.
- Seguía sin abrirse: la causa de fondo era que, con el cursor en el guion, el editor se repintaba sin parar (unas 1.400 veces por segundo): mover el cursor avisaba al documento, repintar recolocaba el cursor y volvía a avisar. Ahora solo se repinta si cambian de verdad el documento o las fichas. Comprobado con el guion real copiado en la demo: tras el arreglo, un aviso y ningún repintado; escribir, deshacer y pinchar NANDO abren lo que deben. No tenía que ver con la pantalla completa: en el guion la ficha sale dentro del propio guion, no en el panel derecho.
- El desplegable de fichas (`@`, línea de personaje) se cortaba al final de la ventana: ahora sale encima del cursor si debajo no cabe, y no se sale por la derecha. Comprobado con la ventana baja.

## A mano (autor, en la app)
- [ ] Con la chuleta real del vault: los `§N` encuentran su apartado (si el título usa otro formato, avisar).
- [ ] «Abrir en Obsidian» abre la chuleta y guia.md.
- [ ] Pinchar NANDO, EL PADRE o un lugar en el guion abre su ficha a la derecha.
- [ ] Con `@` en la última línea visible, la lista se ve entera.
