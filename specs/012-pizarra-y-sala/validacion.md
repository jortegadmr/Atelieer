# Validación — Spec 012 «Análisis: pizarra libre y llevar a la sala»

> 2026-10-29 · rama `012-pizarra-y-sala` · `npm run verificar`: 139 ficheros y 1288 tests en verde, 0 errores ni avisos de tipos, compilación correcta. La interfaz se comprueba en el navegador (decisión del autor en la 003), con la serie de prueba en memoria, en cada tarea de interfaz (T10a-g, T14a-c). Sin cambios en `src-tauri/` (no hace falta `cargo check`) y `package.json` y `package-lock.json` idénticos a `main` (`git diff main -- package.json package-lock.json src-tauri` vacío).

## A. Pizarra

| RF | Prueba | Resultado |
|---|---|---|
| 1 | Tests «abrir la vista carga una pizarra vacía y no crea nada en disco», «cargar sin fichero da una pizarra vacía y no crea nada»; navegador: «Pizarra» en el menú izquierdo con el texto de vacía (T10a) | ✅ |
| 2 | Tests «crear una nota la pone vacía, con el primer color, en su sitio y encima de todo», «un elemento nuevo no cae justo encima de otro»; navegador: doble clic y «Nota nueva» (T10a) | ✅ |
| 3 | Tests «editar el texto, colorear y mover cambian solo lo suyo», «el texto de una nota se corta en el tope sin partir un emoji y se dice»; navegador: edición, color y arrastre (T10a-b) | ✅ |
| 4 | Tests «el buscador encuentra por título y por código, sin tildes ni mayúsculas», «no ofrece las piezas que ya tienen tarjeta…», «una tarjeta por pieza»; navegador: «Añadir tarjeta» (T10c) | ✅ |
| 5 | Navegador: doble clic y Enter abren la pieza en el panel y la pizarra no la cambia (T10c, T10d) | ✅ |
| 6 | Tests de `estado-pizarra` (mover, un paso por movimiento); navegador: arrastre con el puntero (T10b) y teclado (T10d) | ✅ |
| 7 | Tests «unir crea la flecha del primero al segundo, con etiqueta opcional», «unir rechaza un elemento consigo mismo, una repetida y lo que no existe, con su motivo», «la etiqueta se corta en 60…»; navegador: unir y etiquetar (T10c) | ✅ |
| 8 | Tests de `estado-pizarra-quitar` (copia, una sola copia con flechas, el deshacer) y «quitar cuenta las flechas, en singular y en plural»; navegador: quitar sin confirmación con el aviso (T10c) | ✅ |
| 9 | Tests «una pieza que no se encuentra se ve como ausente y, si vuelve, se resuelve sola», «la fila de una tarjeta… marca descartada o ausente»; navegador: «(pieza no encontrada)» con sus flechas y «Abrir pieza» desactivado (T10c) | ✅ |
| 10 | Tests de `pizarra-historial` (un paso por movimiento, edición de texto seguida se junta, 200 pasos) y «con la vista Pizarra, Ctrl Z deshace la pizarra y no las piezas»; navegador: Ctrl Z / Ctrl Y por vista (T10d) | ✅ |
| 11 | Tests de zoom y encuadre (25 %–200 %, el punto bajo el foco queda quieto, encajar); navegador: rueda, Ctrl + rueda y botones (T10b). **Pellizco del trackpad: a mano** (ver más abajo) | ✅ / A mano |
| 12 | Navegador: Tab en orden de lectura, Enter, Esc, flechas 10/50 px, Alt + L, Supr y «Ver como lista» (T10d-g); test «el orden de lectura es de arriba abajo…» y los de `pizarra-lista`; el anuncio en región de estado (T10f) | ✅ |
| 13 | Tests de `pizarra-guardado` (un guardado con lo último, vaciar al salir, fallo que se enseña y reintenta, dos guardados no se cruzan) y «cerrar la serie guarda lo pendiente» | ✅ |
| 14 | Test «con una variante abierta no se escribe nada y las tarjetas se resuelven contra la serie principal»; navegador: solo lectura con aviso (T10e) | ✅ |
| 15 | Tests «el tope de elementos y el de flechas se respetan y avisan de que no caben más», «al llegar a 400 flechas no cabe otra», «más de 200 elementos o 400 flechas: sobran y se avisa» | ✅ |

## B. Pasar a idea

| RF | Prueba | Resultado |
|---|---|---|
| 16 | Test «crea un evento en idea en la bandeja de la temporada en marcha, o de la última, y su tarjeta unida a la nota», «el título se limpia: una línea y como mucho 300», «un título vacío no crea nada»; navegador: «Pasar a idea» con título propuesto (T9, T10f) | ✅ |
| 17 | Tests «sin temporada dice «Crea primero una temporada» y no cambia nada», «no pasa a idea con la pizarra en solo lectura…» | ✅ |
| 18 | Tests «tarjeta y flecha son un solo paso de la pizarra; la pieza es de la app», ««Deshacer idea» quita la pieza» | ✅ |
| 19 | Tests «si la nota ya tiene una tarjeta nacida de ella y su pieza existe, ofrece abrirla…», «si la pieza de esa tarjeta ya no existe, crea otra», «dos pulsaciones seguidas crean una sola pieza» | ✅ |
| 20 | Test «si falla el guardado de la pizarra, la pieza queda y la pizarra sigue en pantalla con lo pendiente» | ✅ |

## C. Llevar a la sala

| RF | Prueba | Resultado |
|---|---|---|
| 21 | Navegador: botón en el panel de episodio, escena, arco y secreto, en la lente y en la tarjeta de la pizarra, también en «Ver como lista» (T14b, T14c) | ✅ |
| 22 | Tests de `sala-planteamiento` («los caracteres son unidades de texto, no grafemas»); navegador: «Planteamiento copiado (N caracteres)» en `role="status"` desde `CopiarTexto`, el mismo componente que el Esquema (T14a-c) | ✅ |
| 23 | Tests «orden fijo, pasen como pasen las secciones, y siempre acaba en «Quiero decidir:»», «omite lo vacío», `sala-reunir-pieza` (episodio, escena con causas, «Si lo dejas así…» solo con la pieza abierta), `sala-reunir-wiki` (ficha, avisos con regla, alternativas, quién sabe qué), `sala-notas` (flechas directas, sentido y orden) | ✅ |
| 24 | Tests de `sala-reunir-personaje`: nombre, ficha, relación, escenas, lo que sabe y sin ficha; navegador: la lente con Telmo (T14b) | ✅ |
| 25 | Tests «una sección que no se pudo leer deja una línea…», «si la pizarra no carga, se omiten las notas…», «si la ficha enlazada ya no está en la wiki, lo dice en su sección y sigue con el resto» | ✅ |
| 26 | Tests de `sala-texto` (vallas más largas que la del texto, controles y dirección fuera, saltos Unicode) y «el título y la etiqueta son texto: lo que Markdown interpretaría va escapado» | ✅ |
| 27 | Tests «pasado el tope se recorta, lo dice y conserva el estado, los avisos y la última línea», «recorta en el orden fijo…», «no parte un grafema ni una fila de tabla…» | ✅ |
| 28 | Tests «una pieza que ya no está no copia nada y dice por qué», «una pieza que solo está en la variante lo dice», «un personaje que ya no está da un error»; con variante abierta lleva la serie principal y lo dice | ✅ |
| 29 | Navegador: con el portapapeles simulado como roto sale el aviso y la caja con el texto enfocado y seleccionado, en el Esquema, el panel y la lente (T14a, T14b) | ✅ |
| 30 | Tests «no escribe nada» en `sala-reunir-pieza`, `-wiki` y `-personaje`, y en `sala-llevar` («una pizarra ilegible se dice y no se aparta ni se renombra») con la foto del disco antes y después | ✅ |

## D. Requisitos no funcionales

| RNF | Prueba | Resultado |
|---|---|---|
| 1 | `compat-pizarra`: la v1.0 abre la serie igual con la pizarra y su papelera presentes, guardar y borrar piezas con la v1.0 no las toca | ✅ |
| 2 | `almacen-pizarra-papelera` y `estado-pizarra-quitar`: copia en `_papelera/_pizarra/` con sello, sin pisar, que se puede leer; si falla no se quita nada | ✅ |
| 3 | `almacen-pizarra`, `pizarra-guardado`, `pizarra-vigilancia` y `estado-pizarra`: CambioFuera, borrado por fuera, repaso de 10 s, conflicto de Proton, al volver a la ventana | ✅ |
| 4 | `pizarra-formato`: normaliza con aviso y sigue, conserva campos desconocidos, `__proto__` sin efecto, versión mayor en solo lectura, ilegible apartado con fecha | ✅ |
| 5 | `pizarra-rendimiento` (T15a): con 200 elementos y 400 flechas, escribir y leer ≈ 1 ms, guardar y cargar con el almacén ≈ 1 ms, unir con 399 flechas < 0,1 ms; umbral de 100 ms | ✅ |
| 6 | `pizarra-formato` («una nota con NUL, saltos de línea y caracteres de dirección vuelve igual») y `compat-pizarra` | ✅ |
| 7 | Navegador: tokens de `src/estilo/` y `--nota-*` en claro y en los dos oscuros; `contraste` (3:1 del foco, flecha legible, colores con nombre) | ✅ |
| 8 | `git diff main -- package.json package-lock.json` vacío | ✅ |
| 9 | `pizarra-instantaneas`: la instantánea lleva la pizarra y restaurar la devuelve; sin pizarra, las copias son las de siempre; tarjeta sin pieza tras restaurar, «pieza no encontrada» | ✅ |
| 10 | Tests «tocar, crear y mover suben al final del apilado» y «subir una nota la pone encima pero no es un paso de deshacer» | ✅ |

## A mano (Windows y Mac Intel)

Lo que los tests y el navegador de desarrollo no pueden ver. Marcar tras probar con `probar.bat` y con la compilación de Mac (GitHub › Actions › mac), siempre sobre `_prueba`, nunca sobre Vault:

- [ ] **Windows · WebView2:** arrastrar una nota y una tarjeta con el ratón; no se come los arrastres (`dragDropEnabled: false`).
- [ ] **Windows:** rueda sola mueve el encuadre; Ctrl + rueda acerca y aleja entre 25 % y 200 %.
- [ ] **Windows y Mac:** doble clic en el lienzo crea una nota; doble clic en una tarjeta abre la pieza.
- [ ] **Mac · trackpad:** el pellizco acerca y aleja el lienzo (llega como Ctrl + rueda) y dos dedos mueven el encuadre.
- [ ] **Mac:** Cmd Z / Cmd Mayús Z deshacen y rehacen la pizarra; Cmd C / Cmd V funcionan dentro de una nota (menú Edición).
- [ ] **Windows y Mac:** «Llevar a la sala» copia de verdad al portapapeles y se pega en la sala de guionistas con el planteamiento entero.
- [ ] **Mac (WebKit):** «Llevar a la sala» con el portapapeles bloqueado enseña la caja seleccionada.
- [ ] **Las dos:** abrir una serie con pizarra en la v1.0 (instalada al lado) y comprobar que se abre sin avisos.
