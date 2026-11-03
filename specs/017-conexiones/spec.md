# Spec 017 — Conexiones, portada y documentos

Aprobada por el autor el 2026-10-29 (misma orden que la 016).

## Requisitos
- RF-1: EL mapa de conexiones dibuja personajes y grupos como puntos y sus relaciones (campo `relaciones` de la ficha, spec 015) como líneas.
- RF-2: SE puede filtrar por tipo: romántica, amistad, rivalidad y otras; el tipo se deduce del texto libre del autor.
- RF-3: UN clic en un nombre abre su ficha editable. El mapa solo lee.
- RF-4: UNA relación escrita en las dos fichas se dibuja una vez; los alias se unen a su ficha; quien no tiene ficha se dibuja con borde discontinuo.
- RF-5: LA entrada del mundo muestra la portada: título, premisa e imagen opcional `Portada.png|jpg|webp` en la carpeta raíz de la wiki. Poner una nueva deja la anterior en la papelera de la serie; solo se aceptan imágenes de verdad (cabecera comprobada), hasta 15 MB.
- RF-6: «Notas y documentos» es una categoría más del mundo (carpeta `Documentos`), con su listado y editor.

## Fuera
Arrastrar los puntos del mapa; guardar posiciones.
