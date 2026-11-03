# Validación — Spec 001 Esqueleto vivo

> 2026-10-20 (tras los arreglos de la revisión independiente). `npm run verificar`: 43 archivos de tests, 354 tests en verde; `svelte-check` 0 errores; `cargo check` sin errores.

## Requisito → prueba → resultado
| RF | Prueba | Resultado |
|---|---|---|
| 1 | `tauri.conf.json`: «Atelier v2», `com.jortegadmr.atelier-v2`, 2.0.0 | ✅ (instalador: ver «A mano») |
| 2, 3 | Identificador distinto: preferencias y `localStorage` separados de la v1.0 | ⏳ a mano en el PC |
| 4 | `sin-html.test.ts` › política de contenido; interfaz con la misma CSP sin errores en la consola (navegador) | ✅ / ⏳ instalador |
| 5 | `sin-html.test.ts` › ningún `{@html}`, `innerHTML`, `outerHTML` | ✅ |
| 6, 7 | `limitar-borrado.test.ts` (7 tests); `sin-html.test.ts` › borrar solo en `appDatos`, sin alcance global | ✅ |
| 8 | `limitar-borrado.test.ts` › leer y escribir fuera de la mesa; `estado-ficha.test.ts` y `cambiar-estado.test.ts` escriben en la wiki | ✅ |
| 9 | `estados-fichero.test.ts` › seis estados; panel con los seis en los cinco tipos (navegador) | ✅ |
| 10 | `estados-fichero.test.ts` › idea + aparte; `estados.test.ts` › otro estado quita el aparte | ✅ |
| 11 | `estados.test.ts` › idea con estado aparte; `compat.test.ts` | ✅ |
| 12 | `estados-fichero.test.ts` › la v1.0 lo descarta; `estados.test.ts` › manda el de la v1.0 | ✅ |
| 13, 14 | `estados-fichero.test.ts` › episodios con estado | ✅ |
| 15-17 | `estados.test.ts` › qué cuenta (C08, C01, trama dominante; temporadas y episodios); aparcado atenuado (navegador) | ✅ |
| 18-21 | `cambiar-estado.test.ts` › pasar a borrador (4 tests) | ✅ |
| 22 | `cambiar-estado.test.ts` › un evento solo cambia en la mesa | ✅ |
| 23 | `cambiar-estado.test.ts` › canon sin ficha la crea | ✅ |
| 24 | `estados-fichero.test.ts` › motivo en todos; `cambiar-estado.test.ts` › descartar; panel (navegador) | ✅ |
| 25 | `cambiar-estado.test.ts` › la ficha sigue el estado, deshacer; `estado-ficha.test.ts` › Log | ✅ |
| 26 | `estado-ficha.test.ts` › solo cambia esa línea (5 tests) | ✅ |
| 27 | `estado-ficha.test.ts` › ficha que no está; `cambiar-estado.test.ts` › avisa | ✅ |
| 28 | `cambiar-estado.test.ts` › canon puesto en Obsidian bloquea | ✅ |
| 29, 30 | `cambiar-estado.test.ts` › canon bloqueado (5 tests); `bloqueo-canon.test.ts` (12 tests); panel bloqueado y desbloqueo (navegador) | ✅ |
| 31 | `cambiar-estado.test.ts` › nunca se borra nada | ✅ |
| 32 | Confirmaciones dentro del panel (navegador) | ✅ |
| 33 | `estado-ficha.test.ts` › enlace que sale de la wiki | ✅ |
| 34 | `contraste.test.ts` (tokens y atenuar sin opacidad) | ✅ |
| RNF compat. | `compat.test.ts` con el lector congelado de la v1.0 | ✅ |

## Revisión de seguridad (no independiente: la hizo quien escribió el código)
- 🔴 Ninguno.
- 🟡 `renombrar` sigue permitido en `$HOME/**` (lo necesita la escritura segura de la wiki). Un renombrado puede sustituir un archivo; el riesgo es el mismo que escribir.
- ✅ Lo que se edita mientras se actualiza una ficha ya no se pierde (T17).
- ✅ Con una pieza canon bloqueada, «Abrir en Obsidian» de su ficha sigue activo (arreglado el 2026-10-20).
- ✅ Sin secretos, sin servicios externos, sin datos personales. Rutas de ficha validadas. Borrado limitado en Tauri y en TypeScript.

## Revisión independiente (2026-10-20)
Sin críticos. 8 importantes y 5 menores, todos confirmados. Arreglados en el bloque 4 de tasks.md (T13-T20), cada uno con su test:
| Hallazgo | Arreglo | Tarea |
|---|---|---|
| 🟡 Canon bloqueado se podía reordenar (temporada, episodio, arco) | `Cambio.mueve`; mover una pieza bloqueada se rechaza | T13 |
| 🟡 Cambios a medias con piezas bloqueadas (borrar con hijos canon, insertar en temporada canon, renumerar) | El cambio entero se rechaza; renumerar vecinos canon sí vale | T13 |
| 🟡 Quitar canon con la ficha sin escribir: la revisión de fichas la volvía a subir | La mesa no baja de canon si la ficha sigue en canon | T14 |
| 🟡 Cambiar el estado borraba «cambió en la wiki» | La marca se conserva | T15 |
| 🟡 RF-15/17 sin cumplir en temporadas y episodios | Comprobaciones y filas atenuadas también ahí | T16 |
| 🟡 Lo editado mientras se escribe la ficha se perdía | `juntar()` por campos | T17 |
| 🟡 RF-34: opacidad bajaba el texto de 4,5:1 | Atenuar con color | T18 |
| 🟡 `opener:default` dejaba abrir http, mailto… | Solo `obsidian://*` | T19 |
| ⚪ Deshacer gastaba el paso bloqueado; sin aviso de ficha y Log | Paso conservado; aviso | T13, T20 |
| ⚪ `madurez_mesa` podía reaparecer; avisos repetidos; doble clic | Arreglados | T20 |
| ⚪ `rename` y `write` en `$HOME/**` | Se queda (ya anotado arriba) | — |

Segunda pasada del mismo revisor sobre los arreglos: 2 🟡 y 3 ⚪ nuevos (deshacer un movimiento de una pieza que pasó a canon desde fuera; la marca «cambió en la wiki» si se cambia el estado antes de la revisión de cada minuto; `juntar` perdía un «Lo sé» y resucitaba una pieza borrada; aparcado seleccionado a 4,02:1). Arreglados en T21.

## A mano (pendiente del autor)
1. PC: instalar `Atelier v2_2.0.0_x64-setup.exe` con la v1.0 instalada. Las dos en el menú Inicio; la v2 pide la carpeta; la v1.0 sigue abriendo.
2. PC: en la v2, abrir `_prueba`. Probar: aparcar un evento, descartar un arco, pasar una temporada a borrador (crea ficha), mandar algo a la papelera. Sin errores.
3. PC: abrir `_prueba` en la v1.0: se ve igual (lo aparcado como idea). Guardar algo y volver a la v2: lo aparcado sigue aparcado.
4. PC: con una pieza canon, «Abrir en Obsidian» de su ficha abre Obsidian (comprueba que el permiso `obsidian://` basta sin `opener:default`).
5. Mac: GitHub › Actions › mac sobre `main`, instalar `Atelier v2.app` y repetir el punto 2.
