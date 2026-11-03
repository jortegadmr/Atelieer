# Tareas — Spec 001 Esqueleto vivo

> Tareas de 20-30 min, en orden. Una cada vez: tests primero, `npm run verificar`, marcar, commit y parar.
> RF-1 a RF-3 (identidad) ya están hechos en `760e820`; se comprueban a mano en T12.

## Bloque 1 · Seguridad y contraste (rama `001-seguridad`)
- [x] T1. `limitarBorrado(fs, mesa)` y usarlo al abrir la mesa. (RF-6, RF-7)
      Hecho cuando: tests «borra dentro de la mesa», «no borra fuera de la mesa ni en la wiki», «no se engaña con `..` ni con mayúsculas o `\` en Windows» en verde.
- [x] T2. Permisos de Tauri por orden (borrar solo en `**/appDatos/**`) y CSP; test que falla si hay `{@html}` o `innerHTML` en `src/`. (RF-4, RF-5, RF-8)
      Hecho cuando: test en verde, `cargo check` sin errores y `npm run tauri dev` abre `_prueba` sin errores de CSP; mandar a la papelera y pasar a la wiki funcionan.
      Hecho: tests en verde, `cargo check` sin errores, interfaz con la serie de prueba y la misma CSP sin errores en la consola. Lo propio de Tauri (diálogo, papelera, pasar a la wiki) se prueba con el instalador en T12.
- [x] T3. Contraste de los cinco tonos en `tokens.css`. (RF-34)
      Hecho cuando: test «todo el texto ≥ 4,5:1 en oscuro y claro», que lee `tokens.css`, en verde.

## Bloque 2 · Estados en los datos (rama `001-estados`)
- [x] T4. Copia congelada del lector de la v1.0 en `tests/compat/v1/` y test base «la v1.0 lee lo que escribe la v2». (RNF compatibilidad)
      Hecho cuando: el test de ida y vuelta v2 → v1.0 → v2 pasa con la serie de prueba actual.
- [x] T5. Vocabulario y esquema: `ESTADO`, `madurez_mesa`, `madurez` en episodio, `motivo_descarte` en todos, campos nuevos solo si tienen valor, lectura tolerante y valor desconocido conservado. (RF-9 a RF-14, RF-24)
      Hecho cuando: tests de lectura y escritura y de compatibilidad (propuesta, aparcado y episodio con estado sobreviven a un guardado de la v1.0; la v1.0 lo pasa a descartado → la v2 lo ve descartado) en verde.
- [x] T6. `estados.ts` (`estadoDe`, `conEstado`, `cuenta`) y comprobaciones y trama dominante con `cuenta`. (RF-10, RF-15 a RF-17)
      Hecho cuando: tests «aparcado no cuenta», «propuesta cuenta como idea», «descartado no cuenta», «otro estado quita el guardado aparte» en verde y los 252 de antes siguen en verde.

## Bloque 3 · Modo mixto e interfaz (rama `001-mixto`)
- [x] T7. `estado-ficha.ts`: ruta segura, cambiar solo `estado_canon`, no escribir si cambió a la vez, entrada en Log. (RF-25 a RF-27, RF-33)
      Hecho cuando: tests «solo cambia esa línea», «añade la línea si falta», «ficha que no existe», «cambió mientras tanto», «enlace con `..` rechazado», «apunta en Log» en verde.
- [x] T8. `Sesion.cambiarEstado` y sincronización de la ficha en `aplicar` (también deshacer y rehacer). (RF-18 a RF-23, RF-25, RF-28, RF-31)
      Hecho cuando: tests de sesión con wiki falsa: borrador crea ficha, nombre repetido no cambia nada, evento sin ficha, canon sin ficha la crea, deshacer devuelve la ficha, nunca se borra nada, en verde.
- [x] T9. Bloqueo de canon en `aplicar` y `desbloquear`. (RF-29, RF-30)
      Hecho cuando: tests «canon no se edita ni se mueve», «desbloquear deja editar sin cambiar el estado», «al cerrar la serie se vuelve a bloquear» en verde.
- [x] T10. Interfaz de estados: selector de 6 en temporada, episodio, arco, evento y secreto; punto de propuesta y aparcado; aparcado atenuado; motivo de descarte; confirmaciones de canon y descartar en el pie del panel. (RF-9, RF-15, RF-24, RF-32)
      Hecho cuando: `npm run verificar` en verde y prueba a mano en `npm run dev` de cada estado en cada tipo de pieza.
- [x] T11. Interfaz de canon: panel en solo lectura, «Desbloquear» con aviso de retcon, avisos de la wiki (no actualizada, enlace no válido). (RF-27, RF-29, RF-30, RF-33)
      Hecho cuando: `npm run verificar` en verde y prueba a mano en `npm run dev`.

## Bloque 4 · Arreglos de la revisión independiente (2026-10-20, en `main`)
> La revisión independiente (validacion.md › «Revisión independiente») encontró fallos contra la spec. No añaden nada nuevo: cumplen lo aprobado.
- [x] T13. Bloqueo de canon sin agujeros: una pieza canon no se mueve (temporada, episodio, arco, evento); un cambio que toca una pieza bloqueada se rechaza entero (borrar con hijos canon, insertar en temporada canon); renumerar eventos vecinos canon sí vale; deshacer o rehacer rechazado no gasta el paso. (RF-29)
      Hecho cuando: tests «no se mueve», «no se aplica a medias», «renumerar vecinos canon vale», «deshacer rechazado se conserva» en verde.
- [x] T14. Bajar de canon con la ficha sin poder escribir no cambia la mesa. (RF-25, RF-29)
- [x] T15. Cambiar el estado no borra la marca «cambió en la wiki». (RF-25)
- [x] T16. Aparcado y descartado tampoco cuentan en temporadas y episodios; aparcado atenuado en sus filas. (RF-15 a RF-17)
- [x] T17. Lo que se edita mientras se actualiza una ficha no se pierde.
- [x] T18. Atenuar sin bajar de 4,5:1 (panel canon y aparcado). (RF-34)
- [x] T19. Abrir direcciones: solo `obsidian://`. (RF-4)
- [x] T20. Menores: `madurez_mesa` no reaparece; avisos sin repetir; selector de estado desactivado mientras trabaja; al deshacer, aviso de que la ficha creada y el Log no se deshacen (caso límite de la spec).
- [x] T21. Segunda pasada del revisor: deshacer un movimiento no mueve una pieza que pasó a canon desde fuera (el historial guarda `mueve`); la marca «cambió en la wiki» se mira en el disco al cambiar el estado, sin esperar a la revisión de cada minuto; `juntar` no pierde un «Lo sé» ni resucita una pieza borrada; aparcado seleccionado en `--ink-2`; el aviso dice qué pieza canon impide el cambio. (RF-29, RF-25, RF-34)

## Cierre
- [ ] T12. Validación final: tabla RF → test → resultado; revisión de seguridad; a mano en el PC (v1.0 y v2 instaladas a la vez, preferencias separadas, `_prueba` abierta en las dos); compilación de Mac; README. (Todos)
      Hecho cuando: veredicto «spec cumplida» con evidencia.
