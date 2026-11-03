# Plan técnico — Spec 002 De arriba abajo

> Cómo se construye. Respeta docs/constitucion.md y cubre los RF-1 a RF-47 de spec.md.
> Versiones: las de la 001 (Tauri 2, Svelte 5, `yaml` 2.9, Vitest, `@lucide/svelte`). Sin dependencias nuevas. Sin tocar `src-tauri/`.
> Revisado por un revisor independiente (2026-10-20): 1 🔴, 8 🟡 y 14 ⚪, todos recogidos aquí y en tasks.md.

## Idea general
- Toda la lógica nueva va en TypeScript puro y probado (`src/lib/vistas/visor.ts`, `src/lib/vistas/crear.ts`, `src/lib/app/capas.ts`). Los componentes solo presentan y llaman.
- Lo que se crea son piezas de la v1 con las operaciones de la v1 (`crearTemporada`, `insertarEpisodio`, `crearEvento`, `crearArco`, `crearTramo`, `crearSecreto`) y se aplica con `Sesion.aplicar`: mismo guardado, mismo deshacer, mismo bloqueo de canon de la 001. **Formato de notas sin cambios.**
- El nivel del visor vive en `EstadoApp` (memoria, nunca en disco: RNF y RF-23).
- La revisión del plan encontró que el guardado de la v1 no comprueba si la nota cambió fuera antes de escribirla. El RNF de integridad de esta spec lo pide (y la constitución 2), así que se arregla primero (T0).

## Módulos y archivos
| Archivo | Qué hace | RF |
|---|---|---|
| `src/lib/almacen/almacen.ts`, `guardado.ts`, `vigilancia.ts`, `src/lib/app/sesion.ts` | **No pisar lo cambiado fuera.** `Almacen` recuerda el último contenido leído o escrito de cada nota; `guardar` relee antes de escribir y, si no coincide (o la nota ya no está), no escribe y lanza `CambioFuera`. `Guardado` no reintenta eso: suelta la pieza, deja el aviso y pide a la vigilancia releer esa nota en el acto | RNF integridad |
| `src/lib/vistas/visor.ts` (nuevo) | Tipo `Nivel`; `temporadaVisible` (la regla que hoy repiten `Temporada.svelte` y `Rejilla.svelte`); `nivelValido`, `subir`, `migas`, `vistaDeNivel`, `nivelAlCambiarVista`; `columnas(m, nivel, avisos)`; `textoVacio` | 2-10, 14, 15, 18, 20-24 |
| `src/lib/vistas/crear.ts` (nuevo) | `opcionesNuevo(m, nivel, bloqueada)`; `crearPieza(m, nivel, que, datos)`; `limpiarIdea(texto)`; `destinoIdea(m, nivel, bloqueada)`; `crearIdea(...)` | 26, 29-34, 38-41, 44-47 |
| `src/lib/app/capas.ts` (nuevo) | Pila de «cosas abiertas» (confirmación, búsqueda, captura, ventana, menú) que Esc cierra de una en una | 15-17 |
| `src/lib/app/estado.svelte.ts` | `nivel` (y `episodioActual` derivado de él); `cambiarVista(v)` y `cambiarTemporada(id)` (RF-21); `irANivel`, `subirNivel`, `revisarNivel`; `capturando`, `nueva` (ventana), `tostada`; `capas` | 11, 12, 15, 20-24, 36, 37, 43 |
| `src/lib/app/sesion.ts` | `deshacerCreacion(id)`: deshace si el último paso es crear esa pieza; si no, la manda a la papelera | 43 |
| `src/vistas/Carcasa.svelte` | Visor y barra «Nuevo…» encima de cada vista; Esc (capas → salir del campo → subir); Ctrl I / Cmd I | 1, 15-18, 36, 37 |
| `src/vistas/visor/Visor.svelte`, `Columna.svelte` (nuevos) | Columnas con Tab y flechas, Intro y clic; foco a la columna elegida al cambiar de nivel; animación 0,22 s y `prefers-reduced-motion`; vacío con botón; desplazamiento horizontal propio | 1-13, 19, 25 |
| `src/vistas/visor/BarraNuevo.svelte` (nuevo) | Botones del nivel; los bloqueados con `aria-disabled` (sin efecto al pulsar) y el texto «Es canon: desbloquéala para añadir» | 26, 28, 33, 34 |
| `src/vistas/visor/NuevaPieza.svelte` (nuevo) | Ventana dentro de la app (`.velo` + `.vent` del boceto H): título, tipo de trama, nueva o tramo, carpeta de la mesa, estado idea, Cancelar / Crear | 28-32, 35 |
| `src/vistas/visor/Captura.svelte`, `Tostada.svelte` (nuevos) | Campo de una línea; aviso «Idea en …» con Deshacer; foco de vuelta a donde estaba | 27, 36-46 |
| `src/vistas/comunes/BarraSuperior.svelte` | Miga del visor en lugar de la de la v1; botón «+ Idea»; pasos con `cambiarVista` | 14, 21, 36 |
| `src/vistas/Temporada.svelte`, `Rejilla.svelte`, `comunes/MenuIzquierdo.svelte` | `temporadaVisible`; selectores con `cambiarTemporada`; menú con `cambiarVista`; Rejilla marca la columna del episodio y la pone a la vista | 20, 21 |
| `src/vistas/panel/Panel.svelte`, `CampoEstado.svelte`, `comunes/CampoWiki.svelte`, `comunes/Buscar.svelte`, `Instantaneas.svelte`, `Sincronizacion.svelte`, `tramas/Beats.svelte` | Registran en `capas` su confirmación, menú, caja o comparación mientras están abiertos; los que ya cierran con su propio Esc hacen `preventDefault` | 15, 16 |
| `src/estilo/componentes.css` | `.visor`, `.colh`, `.crearbar`, `.velo`, `.vent`, `.ruta`, `.opc`, `.toast` del boceto H, con los tokens de la v1 | 1-10, 26-28 |

## Modelo de datos
Sin campos nuevos ni datos personales. Una idea capturada es un evento de la v1:
```yaml
---
id: ev-k3p9
tipo: evento
titulo: "Telmo: \"no es mío\" — [[Acuerdo]] # duda"
madurez: idea
temporada: te-t001
episodio: ""          # vacío = bandeja de su temporada (la v1.0 la enseña ahí)
orden: 4
---
```
El YAML lo escribe `escribirPieza` (librería `yaml`), que ya entrecomilla lo que hace falta (RF-44). Se prueba con el lector congelado de la v1.0.

```ts
type Nivel =
  | { tipo: "serie" }
  | { tipo: "temporada"; temporada: string }
  | { tipo: "episodio"; temporada: string; episodio: string };

interface Columna {
  id: string; tipo: "temporada" | "episodio" | "evento";
  codigo: string;          // T01 · E03 · 4
  titulo: string;          // recortado por CSS a 2 líneas (el panel tiene el entero)
  estado: Estado;          // marca de la 001; aparcado y descartado llevan texto además del color
  detalle: string[];       // «en marcha · 8 ep» · «escaleta» · …
  carga: ParCarga;         // temporada y episodio: carga; evento: cambio de valor
  dominante?: { nombre: string; color: number };
  texto: string;           // logline · idea central · ""
  avisos: number;          // solo clase «aviso», sin silenciados (RF-8)
}
```

## Contratos (lógica → interfaz)
- `temporadaVisible(m, actual) → Temporada | null`: la elegida si existe; si no, la primera «en marcha» en orden de emisión; si no, la primera.
- `columnas(m, nivel, avisos: Aviso[]) → Columna[]`; `textoVacio(m, nivel) → string` (RF-10, con «N previstos»).
- `migas(m, nivel) → { nivel, texto }[]` (`Serie › T01 › E03`); `subir(nivel) → Nivel | null` (null en serie, RF-18).
- `nivelValido(m, nivel) → Nivel` (RF-24): un episodio que ya no existe o que ahora es de otra temporada → nivel de la temporada del nivel, si esa temporada existe; una temporada que ya no existe → serie.
- `vistaDeNivel(nivel) → "serie" | "temporada" | "episodios"` (RF-20).
- `nivelAlCambiarVista(m, vista, temporadaVisible, anterior) → Nivel` (RF-21, RF-22).
- `opcionesNuevo(m, nivel, bloqueada) → { que, nombre, bloqueo?: string }[]` (RF-26, RF-33, RF-34).
- `crearPieza(m, nivel, que, { titulo?, tipoArco?, tramoDe? }) → { pieza, cambio }` (RF-29 a RF-32).
- `limpiarIdea(texto) → { titulo, recortada } | null` (RF-41, RF-45, RF-46).
- `destinoIdea(m, nivel, bloqueada) → { temporada, episodio, donde } | { error }` (RF-39, RF-40).
- `crearIdea(m, nivel, texto, bloqueada) → { pieza, cambio, donde, recortada } | { error } | null`.
- `Capas`: `abrir(cerrar) → quitar`, `cerrarUltima() → boolean`.
- `Almacen.guardar` lanza `CambioFuera` (con la ruta) si la nota no es la última conocida.

## Lógica clave
```
guardar(carpeta, pieza):                                    # T0
  ruta = rutaPieza(...); conocido = this.conocido.get(ruta)
  si conocido !== undefined:
     actual = existe(ruta) ? leer(ruta) : null
     si actual !== conocido → lanzar CambioFuera(ruta)       # no se escribe nada
  escribirSeguro(ruta, texto); this.conocido.set(ruta, texto)
  (leerPiezaEn y la carga de la serie anotan lo leído en `conocido`)
Guardado: CambioFuera → no reintenta; aviso «“X” cambió fuera de Atelier: se queda lo de fuera; vuelve a hacer el cambio»;
          la sesión pide a la vigilancia releer esa ruta ya.

nivel (EstadoApp, en memoria; `vista` y `temporadaActual` siguen siendo campos normales):
  cambiarVista(v):     vista = v; si v ∈ {serie, temporada, episodios}: nivel = nivelAlCambiarVista(...)  # RF-21
                       si v ∈ {tramas, wiki, sincronizacion}: nivel no cambia                          # RF-22
  cambiarTemporada(t): temporadaActual = t; si vista ∈ {temporada, episodios}: nivel = temporada t
  irANivel(n):         escribe nivel, vista = vistaDeNivel(n) y temporadaActual a la vez (sin pasar por
                       cambiarVista, que lo pisaría); elige la pieza en el panel (RF-11, RF-20)
  revisarNivel():      en una microtarea tras el cambio del modelo (no a mitad de aplicar o recargar):
                       v = nivelValido(m, nivel); si v ≠ nivel → irANivel(v) (en Tramas/Wiki: solo nivel)  # RF-24
  abrir serie:         nivel = serie                                                              # RF-23
  Todo cambio de vista pasa por cambiarVista (Comprobar, menú, avisos, restaurar): visor y vista dicen lo mismo.

Esc (Carcasa, <svelte:window>; en Svelte 5 los onkeydown de los elementos van delegados y corren antes):
  si e.defaultPrevented (un campo o una caja ya lo usó) → fin
  si capas.cerrarUltima() → fin                         # RF-16
  si foco en campo → blur (el campo guarda como siempre) # RF-17
  si no → subir de nivel (nada en serie)                 # RF-15, RF-18

Ctrl I / Cmd I: antes de mirar si se está escribiendo; ignora e.repeat; sin serie no hay carcasa (RF-37).

destinoIdea(m, nivel, bloqueada):
  episodio y !bloqueada(ep)  → final del episodio
  episodio y bloqueada(ep)   → bandeja de su temporada
  temporada                  → su bandeja
  serie                      → bandeja de la primera temporada «en marcha» (orden de emisión) o, si no hay, de la última
  serie sin temporadas       → error «Crea primero una temporada» (el texto se queda)

opcionesNuevo: episodio en temporada bloqueada y evento en episodio bloqueado → bloqueo «Es canon: desbloquéala para añadir».
  (Sesion.aplicar ya rechaza el episodio en temporada canon; el evento en episodio canon solo lo para la interfaz, como pide RF-33.)

Tostada › Deshacer: sesion.deshacerCreacion(id); la tostada se va si la idea ya no existe.
```

## Decisiones técnicas
| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Antes de escribir una nota de la mesa se relee y se compara con lo último conocido | Fiarse de la vigilancia (repaso cada 10 s) | En esos 10 s se pisaría lo editado en Obsidian (constitución 2); una lectura más por guardado no se nota |
| El nivel es estado de `EstadoApp`; lo mueven `cambiarVista`, `cambiarTemporada` e `irANivel`. Las vistas ya no asignan `vista` a mano: todo cambio de vista pasa por `cambiarVista` (también Comprobar, el menú y restaurar), para que el visor diga siempre lo mismo que la vista de debajo (RF-1) | Setters en `vista` y `temporadaActual`; o mover el visor solo con los pasos y el selector | Con setters, `irANivel` se pisaría a sí mismo. Moverlo solo con pasos y selector dejaría el visor en un nivel y la vista en otro (al ir desde Comprobar o el menú) |
| Pila de capas para Esc, y `preventDefault` en los Esc locales | Que cada componente pare el evento | La pila se prueba sola y no depende del orden de los oyentes |
| La idea es un evento de la v1 en estado idea | Pieza nueva «idea» | La v1.0 la ve en su bandeja (constitución 9, H5) |
| Deshacer de la tostada: si el último paso es crear esa idea, `deshacer()`; si no, `borrarPieza` (papelera) | Siempre `borrarPieza` o siempre `deshacer()` | `deshacer()` solo desharía otra cosa si hubo más pasos; `borrarPieza` solo vacía rehacer sin necesidad |
| Botones bloqueados con `aria-disabled` y texto al lado | `disabled` | `disabled` no recibe el foco y no se puede leer por qué (RNF accesibilidad) |
| Recortar a 300 caracteres visibles con `Intl.Segmenter` (de serie en Node 22, WebView2 y Safari 16) | `slice` o `Array.from` | No partir emojis compuestos, banderas ni acentos combinados |
| Columnas en `flex` con ancho mínimo y desplazamiento horizontal propio | Posición absoluta proporcional del boceto | Con 40 eventos el boceto no cabe; el visor se desplaza sin mover la página |

## Seguridad de la funcionalidad
- Un solo usuario, sin red: no hay autorización ni límites de uso. Nada sale del equipo.
- Entradas: el título de la idea se limpia (controles y saltos → espacio, máximo 300: RF-45, RF-46); el de «Nueva pieza» es un campo de una línea y solo se recortan los espacios de los lados. Los dos se escriben con `escribirPieza`, que serializa YAML de forma segura (sin inyección de claves ni de `---`). Sin `{@html}` (el test `sin-html` ya lo vigila).
- Integridad: solo se escribe en `appDatos/` mediante `aplicar` (guardado y papelera de la 001). Crear nunca toca la wiki. Una nota cambiada fuera no se pisa (T0). El canon bloqueado no se salta: `aplicar` rechaza y la interfaz lo dice.
- Crear dos veces: Intro mientras se crea se ignora (`trabajando`), igual en Crear; Ctrl I ignora `e.repeat`; la captura no acepta Intro con `e.isComposing` (acentos en el Mac).
- Botones bloqueados con `aria-disabled`: su manejador no hace nada.

## Tests
- **Integridad (T0)**: `serie.md` o una temporada cambiadas fuera antes de guardar → no se escriben, aviso, se relee lo de fuera; nota borrada fuera → no se resucita; lo propio sí se escribe; los tests de la 001 siguen en verde.
- **Unitarios (Vitest, modelo en memoria con `piezasDePrueba`)**:
  - `visor.test.ts`: temporada visible; columnas de cada nivel con sus datos, avisos sin sugerencias ni silenciados, aparcado y descartado, vacío y «previstos»; migas; subir; nivel válido tras borrar, papelera, mover de temporada y deshacer la creación; nivel al cambiar de vista.
  - `crear.test.ts`: opciones por nivel, bloqueo y desbloqueo, cada pieza donde toca, tramo, idea en los cinco destinos, sin temporadas, limpiar (vacío, espacios, saltos, controles, 300, emoji compuesto).
  - `capas.test.ts`: cierra la última, quitar fuera de orden, vacía → false.
- **EstadoApp** (Vitest compila `.svelte.ts` con el `svelte()` de `vite.config.ts`; temporizadores falsos y `cerrar()` en `afterEach`): abrir pone serie; pasos y selector; `irANivel(episodio)` conserva el episodio; bajar elige la pieza (RF-11); el evento solo se elige (RF-12); borrar el episodio del nivel sube. No prueba la reactividad: eso va en el navegador.
- **Integración (Sesion + FsMemoria)**: crear e idea quedan escritas en `appDatos/` en menos de 2 s; `deshacerCreacion` por los dos caminos; canon bloqueado no crea; Intro doble crea una.
- **Compatibilidad**: piezas de «Nuevo…» y la captura, con títulos `: " --- # [[x]]`, leídas por el lector congelado de la v1.0 e ida y vuelta (también `episodio: ""`, `temporada` y `madurez: idea`). La idea deshecha va a `_papelera/` con el mismo contenido; `almacen.ts` mueve igual que en la v1.0.
- **Rendimiento**: `columnas` en los tres niveles sobre la serie grande (`datos-grande`) en menos de 100 ms. Bajar con la vista de debajo pintada (la rejilla grande) se mide a mano en el navegador (T11).
- **Contraste**: los estilos nuevos solo usan tokens ya probados y no atenúan texto con opacidad (se añade a `contraste.test.ts`).
- **Interfaz (navegador, `npm run dev`)**: bajar y subir con clic, Intro, Esc y miga; Tab y flechas; foco a la columna elegida (o a la primera) al cambiar de nivel; animación y movimiento reducido; vista de debajo; Ctrl I en un campo; tostada y Deshacer; ventana Nueva pieza; botones bloqueados.

## Riesgos y vuelta atrás
- Ctrl I: en WebView2 no es atajo del navegador y Cmd I no está en el menú del Mac (`plataforma.ts`). Se prueba a mano en el instalador.
- T0 cambia el guardado de todo, no solo de lo nuevo: puede saltar con Proton si reescribe una nota sin cambiarla. Se compara el contenido, no la fecha, y se prueba con la serie de prueba en Tauri.
- El visor ocupa altura: una fila de columnas (unos 120 px); la vista de debajo se desplaza como hasta ahora.
- Vuelta atrás: cada tarea es un commit en la rama `002-de-arriba-abajo`; nada cambia el formato de las notas, así que volver a la 001 no deja datos raros.

## Documentos que se alinean
- `docs/inventario-v1.md`, G1: las filas «Nivel de actos», «Eventos / escenas … con bandeja» y «Rejilla arcos × episodios» pasan de «MVP · E2» a «MVP · E3» (como el PRD); G4, «Story Circle de la temporada»: «MVP · E2 (fuera de la spec 002; spec propia)».
- `docs/diseno.md`, «Principios» punto 2: la miga del visor está en la barra superior y sustituye a la de la v1; «Componentes», fila `.visor` + `.colh`: columnas en `flex` con desplazamiento horizontal propio.
