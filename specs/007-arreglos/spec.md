# Spec 007 — Dos arreglos de antes de la 006

> Estado: aprobada por el autor el 2026-10-22 (decisión: la copia se queda en la papelera). Rama `007-arreglos`.
> Arreglos de fallos encontrados en la revisión de la 006, anteriores a ella. Sin cambios en el formato de las notas ni en `src-tauri/`.

## Problema
1. Al deshacer con Ctrl Z el borrado de una pieza (también con «Volver a como estaba» y al deshacer una variante aplicada), la nota vuelve a su sitio y la app **borra para siempre** la copia que había quedado en `_papelera/` (`Sesion.sacarDePapelera`, heredado de la v1.0). Va contra la constitución: nunca se borra una nota.
2. En el visor de la temporada con escenas en la bandeja, cuando el tablero no cabe (también con la ventana de 1280 px con que se abre la app), la página entera se desplaza a lo ancho: medía 1782 px. El texto para lector de pantalla « escenas» de la cabecera de la bandeja (`.solo-lector`, posición absoluta) se coloca respecto al `body` y se sale del tablero, que tiene su propio desplazamiento.

## Requisitos
- RF-1: CUANDO una pieza borrada vuelve a existir (Ctrl Z, Ctrl Y, «Volver a como estaba», deshacer una variante aplicada), EL SISTEMA escribirá su nota en su sitio y dejará en `_papelera/` la copia que había allí, sin borrarla ni cambiarla.
- RF-2: EL SISTEMA no borrará ningún archivo de `_papelera/` en ningún caso.
- RF-3: EN el visor (serie, temporada y episodio), EL SISTEMA mantendrá dentro del tablero todo lo que hay en él, también el texto para lector de pantalla: la página no se desplazará a lo ancho por el tablero (comprobado a 1200, 1280 y 1440 px).

## Fuera de alcance
- Vaciar la papelera desde la app: lo hace el autor a mano si quiere.
- Las instantáneas automáticas viejas siguen rotando como hasta ahora (no son notas).
- La barra superior necesita unos 930 px (más con la miga «Serie › T01 › E01»): con la ventana por debajo de unos 1215 px, la página se sigue desplazando a lo ancho por ella. La ventana admite desde 900 px. Es otro fallo; se consulta con el autor.

## Casos límite
- Borrar, deshacer y volver a borrar la misma pieza: dos copias en la papelera, con « (2)» si coinciden en el segundo.
- La v1.0 sigue borrando la copia al deshacer; no cambia nada de lo que lee.
