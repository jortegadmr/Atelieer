# Tareas — Spec 007 «Dos arreglos»

> Una cada vez: test que reproduce el fallo (rojo), arreglo (verde), `npm run verificar`, marcar, commit.
> Rama `007-arreglos`; al acabar se junta en `main`.

- [x] T1. La papelera no se borra al deshacer (RF-1, RF-2): fuera `sacarDePapelera` y `enPapelera` de `Sesion`.
      Hecho cuando están en verde:
      - «deshacer un borrado deja la copia en la papelera, sin tocarla»;
      - «Volver a como estaba» y Ctrl Z de una variante aplicada, igual;
      - los tests que esperaban la papelera vacía tras deshacer, cambiados a la regla nueva.
- [x] T2. El tablero del visor contiene su texto para lector de pantalla (RF-3). Navegador a 1200, 1280 y 1440 px: serie, temporada con bandeja y episodio, sin desplazamiento a lo ancho de la página por el tablero.
- [x] T3. Validación RF a RF y juntar en `main`.
