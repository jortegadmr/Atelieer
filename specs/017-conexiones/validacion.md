# Validación — Spec 017

`npm run verificar` bien.

| RF | Cómo | Prueba |
|---|---|---|
| RF-1 a RF-4 | `conexiones.ts`, `Conexiones.svelte` | `tests/wiki-conexiones.test.ts`; navegador (estado vacío) |
| RF-5 | `portada.ts`, `Portada.svelte` | `tests/wiki-portada.test.ts` |
| RF-6 | categoría `documento` de la 015 | `tests/wiki-mundo.test.ts` |

## A mano
- [ ] Escribir relaciones en tres fichas y ver el mapa con cada filtro.
- [ ] Poner y cambiar una portada; la anterior está en la papelera.

## Revisión independiente de 016 y 017 (código y seguridad)
9 puntos, todos arreglados con test: rutas de la wiki y carpeta de la serie sin `..` ni rutas absolutas; vault nueva no anidada en la de ahora; si falla la creación en vault nueva la app vuelve a la anterior; portada: se apartan todas las anteriores y la nueva se escribe antes de apartar; Blob URL revocada y cargas viejas descartadas; claves del mapa sin colisión.
Aceptado: la portada se lee entera antes de comprobar su peso (la interfaz de ficheros no da el tamaño); el límite de 15 MB se aplica justo después.
