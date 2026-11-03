# Validación — Spec 007 «Dos arreglos»

> 2026-10-22 · rama `007-arreglos` · `npm run verificar`: 86 archivos, 803 tests en verde, 0 avisos, compilación correcta.

| RF | Prueba | Resultado |
|---|---|---|
| 1 | `deshacer.test.ts` › deshacer un borrado deja la copia en la papelera, igual; `volver-sesion.test.ts` › «Volver a como estaba», igual; `aplicar-deshacer.test.ts` › Ctrl Z de una variante aplicada, igual. Los tres en rojo antes del arreglo | ✅ |
| 2 | `Sesion` ya no llama a `fs.borrar`; lo único que borra la app son el aviso `.abierta`, los temporales de la escritura segura y las instantáneas automáticas viejas, ninguno en `_papelera/` | ✅ |
| 3 | Navegador, temporada T01 con 2 escenas en la bandeja: la página medía 1782 px a 1200 y 1280 px; ahora 1280 a 1280 px. Serie, temporada y episodio a 1280 y 1440 px, sin desplazamiento a lo ancho | ✅ |

## Cambios de tests
Tres tests esperaban la papelera vacía tras deshacer, la regla de antes. Ahora esperan la copia en la papelera, sin tocar (decisión del autor, 2026-10-22).

## Pendiente
- Con la ventana por debajo de unos 1215 px, la barra superior no cabe y la página se desplaza a lo ancho. La ventana admite desde 900 px. No es de esta spec; arreglado en la 008.

## A mano (pendiente del autor)
1. En `_prueba`, borrar una escena y Ctrl Z: la escena vuelve y su copia sigue en `_papelera/`.
