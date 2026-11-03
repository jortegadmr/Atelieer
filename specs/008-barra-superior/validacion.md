# Validación — Spec 008 «La barra superior cabe»

> 2026-10-22 · rama `008-barra-superior` · `npm run verificar`: 86 archivos, 803 tests en verde, 0 avisos, compilación correcta. Solo interfaz: comprobada en el navegador (decisión del autor en la 003).

| RF | Prueba | Resultado |
|---|---|---|
| 1 | Navegador a 1250 px y menos: los pasos enseñan solo «1 2 3 4»; el nombre sigue en el árbol de accesibilidad («Tramas») y en el título al pasar el ratón | ✅ |
| 2 | Navegador a 1000 y 900 px: «¿Y si…?» y «+ Idea» solo con icono y sin el atajo de «Buscar o crear»; el lector de pantalla dice «¿Y si…? Probar cambios sin tocar la serie» | ✅ |
| 3 | Navegador a 900, 1000, 1100, 1250, 1280 y 1440 px, en serie, temporada (T01) y episodio (T01 E01): la barra cabe entera (664/664 a 900 px, 1204/1204 a 1440 px) y la página mide lo que la ventana. A 900 px con una variante abierta en E01: barra, franja de la variante y página, sin desplazamiento a lo ancho | ✅ |
| 4 | A 1280 y 1440 px la barra se ve como antes: nombres de los pasos, «¿Y si…?», «+ Idea» y el atajo | ✅ |

## Antes y después
Antes la barra necesitaba unos 930 px (unos 980 con «Serie › T01 › E01») y la página se desplazaba a lo ancho por debajo de unos 1215 px de ventana.

## A mano (pendiente del autor)
1. En la app, estrechar la ventana hasta el mínimo (900 px) en serie, temporada y episodio: no aparece la barra de desplazamiento horizontal.
