# Plan técnico — Spec 001 Esqueleto vivo

> Cómo se construye. Respeta docs/constitucion.md y cubre los RF-1 a RF-34 de spec.md.
> Versiones: Tauri 2 (tauri-plugin-fs 2.7.1), Svelte 5, `yaml` 2.9, Vitest. Sin dependencias nuevas.

## Módulos y archivos
| Archivo | Qué cambia | RF |
|---|---|---|
| `src-tauri/tauri.conf.json`, `index.html`, `mac.yml`, `compilar-windows.bat` | Identidad «Atelier v2» (hecho en `760e820`) | 1-3 |
| `src-tauri/tauri.conf.json` | CSP restrictiva | 4 |
| `src-tauri/capabilities/default.json` | Sin alcance global: cada orden del disco con el suyo; borrar solo en `**/appDatos/**` | 6-8 |
| `src/lib/almacen/fs.ts` | `limitarBorrado(fs, mesa)`: envoltorio que rechaza borrar fuera de la mesa elegida | 6, 7 |
| `src/lib/app/estado.svelte.ts` | Usa el disco envuelto al abrir la mesa | 6, 7 |
| `src/lib/modelo/vocabulario.ts` | Lista `ESTADO` (6 valores) y `MADUREZ_MESA` (`propuesta`, `aparcado`); `MADUREZ` se queda con los 4 de la v1 | 9 |
| `src/lib/modelo/ficheros.ts` | Campos nuevos que solo se escriben si tienen valor: `madurez_mesa` (temporada, episodio, arco, evento, secreto), `madurez` en episodio, `motivo_descarte` en temporada, episodio y secreto. Lectura tolerante y valor desconocido conservado | 9-14, 24 |
| `src/lib/modelo/tipos.ts` | Los campos nuevos y `crudos` (valor original no entendido) | 9-14 |
| `src/lib/modelo/estados.ts` (nuevo) | `estadoDe`, `conEstado`, `cuenta`, `tieneFicha` | 10-17 |
| `src/lib/comprobaciones/base.ts`, `src/lib/modelo/dominante.ts` | `vivo` pasa a `cuenta`: fuera descartados y aparcados | 15-17 |
| `src/lib/wiki/estado-ficha.ts` (nuevo) | Ruta segura de la ficha, cambiar solo `estado_canon` línea a línea, entrada en Log | 25-27, 33 |
| `src/lib/app/sesion.ts` | `cambiarEstado`; sincronizar ficha en `aplicar` (también deshacer); bloqueo de canon y `desbloquear` | 18-31 |
| `src/vistas/panel/Editar*.svelte`, `campos/Conmutador.svelte` | Selector de 6 estados (también en episodio), motivo de descarte, confirmaciones en la interfaz | 9, 24, 32 |
| `src/vistas/panel/Panel.svelte`, `FichaWiki.svelte` | Pieza canon en solo lectura y botón «Desbloquear» con aviso de retcon | 29, 30 |
| `src/vistas/comunes/Madurez.svelte`, `madurez.css`, listas y rejilla | Punto de propuesta y aparcado; aparcado atenuado | 9, 15 |
| `src/estilo/tokens.css` | Cinco tonos de texto con contraste ≥ 4,5:1 | 34 |
| `tests/compat/v1/` (nuevo) | Copia congelada del lector de la v1.0 (`ficheros`, `tipos`, `vocabulario` de la etiqueta `v1.0`) para probar la compatibilidad | RNF |

## Modelo de datos
Sin datos personales. Ejemplo de un arco aparcado guardado por la v2:
```yaml
---
id: arco-amistad
tipo: arco
titulo: Amistad rota
madurez: idea            # lo que lee la v1.0 (4 valores)
madurez_mesa: aparcado   # nuevo; la v1.0 lo guarda aparte y lo reescribe tal cual
...
---
```
- `estadoDe(p)` = `madurez_mesa` si `madurez` es `idea` y `madurez_mesa` tiene valor; si no, `madurez` (RF-11, RF-12).
- Un episodio sin `madurez` se lee como `idea` (RF-14). Su `estado` (idea / escaleta / guion) no se toca (RF-13).
- `madurez: Propuesta` escrito a mano se entiende como `idea` + `propuesta`. Un valor desconocido se lee como `idea` y se guarda en `crudos.madurez`; al escribir, si el estado no ha cambiado, se escribe el original (caso límite).
- Ficha de la wiki: solo cambia la línea `estado_canon:` (propuesta y aparcado se escriben como `idea`).

## Contratos (sesión → interfaz)
- `cambiarEstado(id, estado, { motivo?, nombre? }) → { hecho, pasar?, avisos[] }`. `pasar` trae el resultado de «Pasar a la wiki» cuando hace falta otro nombre (RF-19).
- `desbloquear(id)` y `estaBloqueada(id) → boolean`. El desbloqueo vive en memoria hasta cerrar la serie (RF-30).
- `aplicar(cambio)` rechaza los cambios a piezas bloqueadas y deja el aviso «Está en canon: desbloquéala para cambiarla» (RF-29).

## Lógica clave
```
cambiarEstado(id, nuevo):
  p = modelo.pieza(id); si estaBloqueada(p) → aviso y fin
  si nuevo ∈ {borrador, canon} y tieneFicha(p.tipo) y p sin enlace a ficha:
      r = pasarAWiki(p)                      # plantilla, Fuentes, Log (v1)
      si r.estado no es «creada» ni «ya existía» → devolver r; la pieza no cambia (RF-19)
      p = r.pieza
  aplicar({ guardar: [conEstado(p, nuevo, motivo)] })

aplicar(cambio):                            # también lo usan deshacer y rehacer
  quitar del cambio las piezas bloqueadas (aviso)
  para cada pieza cuyo estadoDe cambia y tiene enlace a ficha:
      ruta = rutaFichaSegura(serie.wiki, p.wiki)  # null si sale de la narrativa (RF-33)
      r = cambiarEstadoFicha(fs, ruta, valorWiki(nuevo))   # antes que la mesa
      si r.ok: anotarLog; p.wiki_mtime = r.mtime (para no marcar «cambió en la wiki»)
      si no: aviso «La wiki no se ha actualizado: …» (RF-27); la mesa cambia igual
  guardar en la mesa como hasta ahora (nunca se borra: RF-31)

cambiarEstadoFicha(ruta, valor):
  mtime1 = stat; texto = leer; si no existe → error «no está»
  cambiar o añadir la línea estado_canon dentro del frontmatter; resto intacto
  si stat ≠ mtime1 → error «cambió mientras tanto» (no se escribe)
  escribirSeguro
```

## Decisiones técnicas
- **Estado nuevo en campo aparte** (`madurez_mesa`): la v1.0 conserva los campos que no conoce. Descartado: valores nuevos en `madurez`, porque la v1.0 los convierte en `idea` al guardar.
- **Campos nuevos solo si tienen valor**: las notas de la v1 no se llenan de líneas vacías. Descartado: escribirlos siempre (ruido en todas las notas y en Proton).
- **La ficha se sincroniza dentro de `aplicar`**: así deshacer, rehacer y cualquier cambio de estado mantienen la ficha al día (RF-25). Descartado: solo en `cambiarEstado`, porque deshacer dejaría la ficha desfasada y la revisión de fichas volvería a poner canon.
- **Ficha primero, mesa después**: si la ficha quedara en canon y la mesa no, la revisión de fichas de la v1 la devolvería a canon.
- **Cambio de `estado_canon` línea a línea**: conserva comillas, orden y formato (RF-26). Descartado: reescribir el YAML entero con la librería, que puede cambiar el formato.
- **Bloqueo en `aplicar`**: un solo punto para formularios, arrastres y deshacer. Consecuencia: deshacer un «Pasar a canon» pide desbloquear antes.
- **Borrado limitado en dos capas**. Tauri: el permiso de borrar solo vale en `$HOME/**/appDatos/**` (los alcances de cada orden se suman al global, comprobado en el código de tauri-plugin-fs 2.7.1; por eso se quita el global). TypeScript: `limitarBorrado` compara con la carpeta exacta elegida. Descartado: orden propia en Rust, más código para el mismo efecto.
- **CSP** `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: asset: http://asset.localhost; font-src 'self'; connect-src ipc: http://ipc.localhost`. `'unsafe-inline'` en estilos porque Svelte pone `style=` en los colores de arco; los scripts no lo llevan.
- **Compatibilidad probada con el lector real de la v1.0**: copia congelada de sus archivos desde la etiqueta. Descartado: simularlo a mano, que puede no ser igual.

## Seguridad
- Autorización: un solo usuario local; las acciones delicadas (canon, descartar, desbloquear) piden confirmación en la interfaz.
- Validación: la ruta de la ficha se normaliza y tiene que quedar dentro de la carpeta de narrativa (`..`, rutas absolutas y `\` se rechazan). El nombre de una ficha nueva pasa por `nombreValido` (v1).
- Disco: borrar solo dentro de la mesa (Tauri y TypeScript). Escribir sigue permitido en `$HOME/**` (wiki y Log).
- Inyección: CSP y un test que falla si aparece `{@html}` o `innerHTML` en `src/`.
- Logs: solo `Log.md` de la wiki (título y cambio de estado). Nada sale del equipo.
- Idempotencia: pasar a borrador una pieza que ya tiene ficha no crea otra (RF-20).

## Estrategia de tests
- Unitarios (Vitest + disco en memoria): estados, lectura y escritura, ruta segura, cambio de `estado_canon`, `limitarBorrado`, contraste (lee `tokens.css` y calcula la relación).
- Integración: sesión con disco en memoria y wiki falsa: cambiar estado, ficha que falta, ficha que cambia a la vez, deshacer, bloqueo.
- Compatibilidad: notas escritas por la v2 → lector y escritor de la v1.0 → lector de la v2: mismos estados.
- A mano: `npm run tauri dev` con `_prueba` (sin errores de CSP en la consola, la papelera funciona); v1.0 y v2 instaladas a la vez en el PC; compilación de Mac.

## Riesgos y vuelta atrás
- La CSP bloquea algo en el instalador → se prueba con `tauri dev` y con el instalador; se ajusta la directiva concreta.
- Una mesa que no se llame `appDatos` no podría borrar → la del autor se llama así; el error se ve claro («No se puede borrar fuera de la mesa»).
- Escribir en fichas de la wiki es nuevo → solo una línea, escritura segura, comprobación de cambios a la vez; nunca contra Vault en pruebas.
- Si sale mal: cada tarea es un commit; `git revert` del bloque. La v1.0 sigue instalada.

## Estimación
Unas 1.100 líneas con tests: más de 400. Se divide en tres bloques, cada uno usable solo y con su rama:
1. **Seguridad y contraste** (T1-T3): ~200 líneas.
2. **Estados en los datos** (T4-T6): ~400 líneas.
3. **Modo mixto e interfaz** (T7-T11): ~500 líneas.
