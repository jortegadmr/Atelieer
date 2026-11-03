# Atelier

Aplicación de escritorio para desarrollar una serie de televisión **de lo general a lo particular**: de la trama global a las temporadas, los episodios, los actos y las escenas, antes de escribir el guion. Todo lo que se prueba queda como notas Markdown en una vault de Obsidian, conectado con las fichas de personajes, lugares y épocas, y comprobado contra unas guías de escritura que señalan qué no se cumple y por qué.

Está hecha con Tauri 2, Svelte 5 y TypeScript. Es un proyecto personal de portfolio: el código, las especificaciones y las decisiones de diseño están aquí tal y como se fueron construyendo. La interfaz y la documentación están en español.

> Los datos de ejemplo (la serie ficticia «Cabo Sal») están inventados para las pruebas.

## Qué hace

- **Ver la serie entera, siempre.** Un visor con zoom (serie, temporada, episodio, acto, escena), una rejilla de escenas por episodio y por trama, y una línea de la historia por épocas.
- **Tramas y arcos.** Tramas A/B/C, arcos de personaje y de relación, tramos por temporada, beats, siembras y recogidas.
- **«Si lo dejas así…»** Cada cambio enseña a qué afecta: qué avisos nuevos salen, qué otras piezas toca y qué reglas de las guías dejan de cumplirse. Se puede volver a como estaba en un paso.
- **«¿Y si…?»** Variantes que se comparan con el estado actual («Ahora» frente a «Cómo quedaría») sin tocar la serie hasta que se aplican.
- **Guías de escritura junto a cada campo**, con su regla y su fuente, y con la decisión siempre en manos de quien escribe (corregir, cambiar o seguir dejando constancia).
- **Secretos y consecuencias:** quién sabe qué y desde cuándo, causa y efecto, presencia de personajes por episodio, lente sobre un personaje, un arco o un secreto.
- **Pizarra libre** (notas, tarjetas y flechas) y «llevar a la sala»: un planteamiento en Markdown listo para pegar.
- **Guion:** editor propio con formato de guion, referencias a fichas de la wiki, código de escena, páginas, y un desglose por locación y personaje con duración objetivo y cuadre guion–escena.
- **Wiki propia:** crear y editar fichas del mundo (personajes, lugares, épocas, glosario, grupos, poderes, especies, documentos) y ver sus conexiones en un mapa.
- **Integridad de las notas:** nada se borra (va a una papelera), las escrituras son completas o no son, se conservan los campos y el formato que la app no entiende, hay instantáneas y se avisa si otro equipo tiene la serie abierta o si el servicio de sincronización ha dejado un archivo de conflicto.

## Tecnología

| Capa | Elección |
| --- | --- |
| Contenedor de escritorio | Tauri 2 (Rust mínimo y permisos acotados) |
| Interfaz | Svelte 5 (runes), TypeScript estricto, Vite |
| Datos | Notas `.md` con frontmatter YAML (`yaml`), sin base de datos propia; copias con `fflate` |
| Pruebas | Vitest (lógica con un disco en memoria) y `svelte-check` (tipos) |
| Integración continua | GitHub Actions: pruebas y tipos en cada push; compilación de macOS (Intel) a demanda |

Plataformas: Windows y macOS (Intel). Nada sale del equipo: sin telemetría ni servicios externos.

## Cómo está construido

- **Lógica separada de la interfaz.** Todo el modelo, la lectura y escritura, las comprobaciones y las consultas viven en `src/lib/` en TypeScript puro; las vistas de `src/vistas/` solo presentan y llaman a la lógica. Por eso casi todo se prueba sin navegador ni Tauri, con un sistema de ficheros en memoria (`src/lib/almacen/fs-memoria.ts`).
- **Spec-driven.** Cada funcionalidad tiene su carpeta en `specs/NNN-nombre/` con la especificación (requisitos numerados), el plan, las tareas y la validación requisito por requisito. Hay 19 specs.
- **Decisiones registradas.** Las decisiones técnicas (stack, pizarra, guion, mundo editable) están en `docs/decisiones/` como ADR; los principios no negociables, en `docs/constitucion.md`; lo que se construye y lo que no, en `docs/prd.md`; la línea visual, en `docs/diseno.md` con sus bocetos en `docs/bocetos/`.
- **Tests como puerta.** Más de 1.600 pruebas en 173 ficheros, incluidas pruebas de rendimiento con una serie grande (5 temporadas, 50 episodios, 1.500 escenas), pruebas de compatibilidad con el formato de la versión anterior (`tests/compat/`) y pruebas de seguridad (sin `{@html}`, solo enlaces `obsidian://`, borrado limitado a la carpeta de datos).
- **Compatibilidad hacia atrás.** Lo que escribe la v2 lo sigue leyendo la v1.0 (decisión 0002); un lector congelado de la v1 en `tests/compat/v1/` lo comprueba.

```
src/lib/        lógica pura: modelo, almacen, comprobaciones, consecuencias, guia, wiki, guion, desglose, variantes, pizarra...
src/vistas/     componentes Svelte (solo presentan)
src/estilo/     tokens y componentes visuales
src-tauri/      Rust mínimo y permisos
tests/          pruebas Vitest (espejo de src/lib) y fixtures
scripts/        series de prueba ficticias y utilidades
specs/          especificaciones, planes, tareas y validaciones
docs/           PRD, constitución, diseño, decisiones y bocetos
tools/          herramienta de exportación para esta copia pública
```

## Cómo ejecutarlo

Requisitos: Node 22 y, para la app de escritorio, [Rust y los requisitos de Tauri 2](https://v2.tauri.app/start/prerequisites/).

```bash
npm ci
npm run dev                    # solo la interfaz, en el navegador, con la serie de prueba en memoria
npm run tauri dev              # la app de escritorio (la primera vez compila Rust)
npm test                       # pruebas (Vitest)
npm run check                  # tipos de TypeScript y Svelte
npm run verificar              # tipos + pruebas + compilación de la interfaz
npm run tauri build -- --bundles nsis   # instalador de Windows (en Windows)
```

En Windows, `probar.bat` abre la app en modo prueba y `compilar-windows.bat` genera el instalador. El flujo `mac` de GitHub Actions compila la app para macOS (Intel).

Utilidades con la serie ficticia:

| Orden | Qué hace |
| --- | --- |
| `npm run crear-prueba -- "<carpeta de datos>"` | Crea una serie de prueba con su wiki falsa (`--rehacer` para volver a crearla) |
| `npm run prueba-grande -- "<carpeta de datos>"` | Crea una serie grande para medir el rendimiento (`--borrar` para quitarla) |
| `npm run crear-guia -- "<carpeta de datos>"` | Crea el primer juego de guías de escritura si no existe |

La primera vez, la app pide la carpeta `appDatos` de la vault donde guardar las series.

## Estado

Proyecto personal en desarrollo. Todos los derechos reservados (sin licencia) salvo que el autor indique otra cosa.

Autor: [jortegadmr](https://github.com/jortegadmr)
