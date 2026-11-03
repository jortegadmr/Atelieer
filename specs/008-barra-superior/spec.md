# Spec 008 — La barra superior cabe en la ventana

> Estado: aprobada por el autor el 2026-10-22 («arregla también la barra superior»: esconder textos y dejar iconos cuando no cabe). Rama `008-barra-superior`.
> Solo interfaz: sin cambios en el disco, el formato de las notas ni `src-tauri/`.

## Problema
La barra superior necesita unos 930 px (unos 980 con la miga «Serie › T01 › E01»). Con la ventana por debajo de unos 1215 px no cabe y la página entera se desplaza a lo ancho. La ventana admite desde 900 px.

## Requisitos
- RF-1: CUANDO la ventana mide 1250 px o menos, EL SISTEMA enseñará en «Serie / Tramas / Temporada / Episodios» solo el número del paso; el nombre sigue para el lector de pantalla y sale al pasar el ratón.
- RF-2: CUANDO la ventana mide 1000 px o menos, EL SISTEMA enseñará «¿Y si…?» y «+ Idea» solo con su icono (el nombre sigue para el lector de pantalla y en el título) y quitará el atajo de «Buscar o crear».
- RF-3: CON la ventana de 900 px o más, EN la serie, la temporada y el episodio, con y sin variante abierta, la página no se desplazará a lo ancho por la barra superior.
- RF-4: CON la ventana de más de 1250 px, la barra se verá como hasta ahora.

## Casos límite
- La miga larga («Serie › T01 › E01») se recorta por la izquierda de la barra antes que empujar los botones (ya lo hace).
- Con el foco del teclado en un botón que solo enseña número o icono, el lector de pantalla dice su nombre entero.
