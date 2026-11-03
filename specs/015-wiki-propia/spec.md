# Spec 015 — La app crea y edita todo: wiki propia, serie nueva guiada y conexiones (entrega 8)

> Solo el QUÉ y el POR QUÉ. Nada de tecnología, archivos ni esquemas: eso va en plan.md.
> Estado: **borrador con las 7 preguntas contestadas (2026-10-29)**. Pendiente de que el autor la apruebe. Nada se implementa hasta entonces (constitución 5).

## Decisiones cerradas (2026-10-29)
- **Giro de la app:** hasta ahora Atelier lee la wiki de Obsidian y solo edita las fichas de las piezas (temporada, episodio, arco, secreto). Ahora debe permitir **crear y editar todo dentro de la app**, para no tener que abrir Obsidian. **Obsidian pasa a ser la copia de seguridad y el visor**: todo lo que la app escribe sigue siendo una nota Markdown de la vault, legible y editable en Obsidian.
- **Constitución:** no cambia. El principio 1 («la vault es la única verdad») ya dice que todo vive en notas de la vault; este giro lo cumple más, no menos. La v1.0 sigue leyendo lo que la v2 escribe en `appDatos/` (principio 9).
- **Dónde vive una serie nueva («nueva bóveda»):** **ambas opciones**. Al crear, el autor elige: una bóveda de Obsidian nueva en una carpeta que escoja, o una serie dentro de una bóveda que ya existe (como Vault).
- **Formato de las fichas:** el de la wiki actual (mismas carpetas, plantillas y campos que ya usa el autor), para que Obsidian y la comprobación de guías sigan funcionando. Las categorías nuevas se añaden como carpetas con plantilla propia.
- **Orden de trabajo (tres specs):** 015 fichas editables · 016 serie nueva guiada · 017 conexiones, portada y documentos. El desglose del guion (spec 014) queda detrás de estas tres.
- **Respuestas a las preguntas (2026-10-29):** Q1 categorías las del listado (con el nombre «Eventos del mundo»); Q2 las plantillas las propone la app y **tienen que cumplir lo que piden las guías del autor**; Q3 las relaciones entre personajes se guardan **como campo en la ficha**; Q4 **sí**: renombrar actualiza los enlaces de toda la serie; Q5 el bloc de ideas es **por ficha**; Q6 el orden del recorrido guiado se queda como está; Q7 la barra lateral por niveles (capítulos, personajes y notas) entra como **atajo extra**.
- **Se mantiene:** la comprobación de guías (G7), «Si lo dejas así…», «¿Y si…?», el visor con zoom, la pizarra y el guion.

## Contexto y objetivo
Referencia: otras apps de gestión de mundos de ficción. De ella se toma: un menú de **categorías del mundo como carpetas** (Personajes, Glosario, Lugares, Grupos, Poderes y reglas, Eventos, Especies, Conexiones, Documentos), cada una con su listado y su pantalla de edición; un mapa de **Conexiones** entre personajes y grupos con filtros por tipo de relación (romántica, amistad, rivalidad); un **inicio con la serie y su portada**; y una **barra lateral por niveles** (capítulos, personajes, notas) que ayuda a moverse pero no es el único sitio donde se escribe.

**Por qué.** El autor piensa y escribe su serie en una sola app: ideas, mundo, estructura, guion. Obsidian le sirve como copia y como lector. Hoy tiene que saltar a Obsidian para crear un personaje o un lugar, y la app solo le deja escribir en un panel estrecho.

**Tamaño.** Muy grande. Por eso son tres specs. Esta (015) cubre **lo que bloquea todo lo demás**: poder crear, editar, renombrar, mover y quitar fichas de todas las categorías desde pantallas propias.

## Usuarios
El autor, en su PC con Windows y en su Mac Intel. Una persona.

## Historias de usuario
- H1: Como autor quiero crear un personaje, un lugar, un grupo, un poder o regla, una especie, un término del glosario o un evento del mundo desde la app, sin abrir Obsidian.
- H2: Como autor quiero editar cada ficha en una **pantalla propia a ancho completo**, no solo en el desplegable lateral.
- H3: Como autor quiero ver el mundo por categorías (carpetas), con buscador, y llegar a cualquier ficha en un clic.
- H4: Como autor quiero que lo que escribo siga siendo una nota de Obsidian, para tener copia y poder abrirla allí.
- H5: Como autor quiero que las guías se sigan comprobando sobre lo que escribo, con la libertad de decidir.
- H6: Como autor quiero apuntar ideas sueltas en cualquier momento y decidir después dónde van.

## Requisitos funcionales (spec 015)
- RF-1: EL SISTEMA ofrecerá una vista «Mundo» (la actual «Wiki» ampliada) con las categorías de la serie como carpetas: las tres de hoy (Personajes, Lugares, Épocas) y las nuevas (Glosario, Grupos, Poderes y reglas, Eventos del mundo, Especies, Documentos). Cada una muestra cuántas fichas tiene y se abre a su listado.
- RF-2: EL SISTEMA dejará **crear una ficha** en cualquier categoría con solo un nombre. Nunca exigirá rellenar más (constitución 3). La ficha nace de la plantilla de su categoría, como hoy al pasar una pieza a borrador. Las plantillas de las categorías nuevas las propone la app con campos mínimos y **cumplen lo que piden las guías del autor** (apartados y campos que sus reglas esperan); el autor las puede ajustar.
- RF-3: EL SISTEMA dejará **editar toda ficha** en una pantalla propia a ancho completo: título, propiedades (las del formato actual) y el cuerpo por apartados, con el mismo guardado seguro, la comparación antes de escribir y la copia de cómo estaba que ya usan las fichas de piezas (spec 009).
- RF-4: EL SISTEMA dejará **renombrar** una ficha y actualizará los enlaces `[[…]]` de la propia serie que la nombran (guion, piezas, otras fichas), mostrando antes cuántos cambia y pidiendo confirmación (decidido: sí, se actualizan en toda la serie; cada cambio deja copia en la papelera).
- RF-5: EL SISTEMA dejará **mover una ficha entre carpetas de su categoría** y **quitarla** mandándola a la papelera de la serie. Nunca borra (constitución 2). Quitar una ficha a la que otras apuntan avisa de quién la usa.
- RF-6: EL SISTEMA mostrará en cada ficha **quién la usa** (escenas, episodios, otras fichas) y dejará saltar a ellos.
- RF-7: EL SISTEMA tendrá un **buscador** del mundo por nombre y por texto de la ficha, con las categorías como filtro.
- RF-8: EL SISTEMA dejará **cambiar el estado** de una ficha (idea, borrador, canon…) por el mismo camino de la spec 001, y el canon seguirá bloqueado hasta desbloquearlo a propósito.
- RF-9: LAS comprobaciones de guías (G7) se aplicarán también a estas fichas: las reglas de las guías del autor que ya existen para personajes, lugares y épocas se señalan en su pantalla de edición, con la regla, la guía y el sitio, y con las tres salidas de siempre (corregir, cambiar, seguir así con constancia).
- RF-10: EL SISTEMA dejará **editar la ficha desde donde esté**: un clic en un personaje del guion, del visor o de la línea de la historia abre su ficha editable (cierra el ajuste pendiente de la spec 013: hoy abre una ficha de lectura con «Abrir en Obsidian»; se mantiene «Abrir en Obsidian» como botón).
- RF-11: CADA ficha tendrá su **bloc de ideas**: un apartado propio donde apuntar ideas sueltas sobre ella, siempre a mano desde su pantalla (atajo), que se guarda en la propia nota de la ficha y no estorba a las guías. La captura rápida de ideas de la serie entera (spec 002) sigue como está.
- RF-12: SI una ficha cambia en Obsidian mientras se edita en la app, ENTONCES no se pisa: se avisa y se ofrecen las mismas tres salidas que en el guion (quedarme con la mía, usar la de fuera, copiar la mía), con copia a la papelera en cada una.
- RF-13: LO que la app no entienda de una ficha (campos, texto, formato, comentarios) se conserva tal cual al guardar.
- RF-14b: EL SISTEMA ofrecerá, como **atajo extra** y sin quitar el menú actual, una barra lateral por niveles (capítulos, personajes y notas) para moverse rápido; abrir algo desde ella lo abre en su pantalla propia, no solo en la barra.
- RF-14c: LAS relaciones entre personajes (y con grupos) se guardan como un campo de la ficha con el tipo de relación (romántica, amistad, rivalidad u otra que escriba el autor). En la 015 se pueden escribir y ver en la ficha; el mapa llega en la 017.
- RF-14: LA app no creará fichas fuera de las carpetas de la wiki de la serie ni construirá rutas a partir de texto escrito sin validar (nombres sin `..`, sin separadores, sin caracteres que el sistema no admita).

## Requisitos no funcionales
- RNF-1: La vault es la única verdad: todo es nota Markdown de la vault; sin base de datos propia.
- RNF-2: Compatibilidad con la v1.0 y con Obsidian: lo que se escribe en `appDatos/` lo lee la v1.0; lo que se escribe en la wiki lo abre Obsidian sin avisos ni pérdidas.
- RNF-3: Sin dependencias nuevas. Sin cambios en `src-tauri/` salvo que haga falta un permiso de carpeta para crear bóvedas nuevas (se pregunta antes).
- RNF-4: Accesibilidad y teclado completos; estética de la v1 (`src/estilo/`).
- RNF-5: Rendimiento: abrir una categoría con 300 fichas en menos de 300 ms con el disco en memoria.
- RNF-6: Tests de lo que escribe en disco, toca canon, lee la v1.0 o puede perder texto; la interfaz se comprueba en el navegador. Nunca contra la vault real.

## Fuera de alcance (015)
- Crear la serie desde cero y el asistente guiado → spec 016.
- Mapa de Conexiones, portada de la serie y la categoría Documentos con adjuntos → spec 017.
- Desglose y análisis del guion → spec 014.
- Exportar a PDF, sincronización propia, móvil.

## Vistazo a las specs siguientes (no se implementan aquí)
- **016 · Serie nueva guiada.** «Nueva serie» pregunta dónde (bóveda nueva en una carpeta, o dentro de una existente), crea la estructura (wiki con sus carpetas y plantillas, mesa de borradores, guías iniciales) y abre un **recorrido sugerido, no obligatorio**: premisa y logline → personajes principales → lugares → arcos y tramas → temporadas → episodios → escenas → guion. Cada paso dice qué falta y por qué importa, se puede saltar y se puede abrir en cualquier orden; un indicador discreto muestra lo hecho. Las guías avisan, no bloquean.
- **017 · Conexiones, portada y documentos.** Mapa de relaciones entre personajes y grupos con filtros (romántica, amistad, rivalidad…), imagen de portada de la serie y de las fichas guardada en la vault, y la categoría Documentos.

## Preguntas abiertas
Ninguna: las 7 están contestadas arriba. Queda la aprobación de la spec por el autor y, después, escribir el plan.
