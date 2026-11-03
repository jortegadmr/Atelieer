# Constitución — Atelier

Principios innegociables. Toda spec, plan y tarea debe cumplirlos. Solo se cambian con aprobación explícita y cuando cambia algo general del proyecto.

1. **La vault es la única verdad**: todo lo que se crea o prueba se guarda como nota Markdown en la vault del autor. La app no tiene base de datos propia ni datos que solo vivan en ella (salvo preferencias por equipo, como la ruta de la vault).
2. **No romper nunca la vault**: la app no borra notas (usa papelera), escribe de forma segura (sin dejar notas a medias), conserva campos, texto y formato que no entiende, y avisa antes de pisar cambios hechos fuera (Obsidian, el otro equipo).
3. **Libertad guiada**: crear o probar algo nunca exige rellenar campos. Las guías del autor guían de verdad: señalan con claridad qué está mal o no se cumple, qué regla de qué guía lo pide y dónde. La decisión es siempre del autor: corregirlo, cambiarlo o seguir así dejando constancia de que es a propósito.
4. **Simplicidad**: el stack de la v1 (Tauri 2, Svelte 5, TypeScript, `yaml`, `fflate`, iconos Lucide) y su sistema visual (`src/estilo/`). Cualquier dependencia nueva necesita aprobación y una razón.
5. **La spec manda**: ningún comportamiento se implementa si no está en la spec activa. Si falta una decisión, se decide primero y se anota en la spec.
6. **Lógica separada de la interfaz**: modelo, lectura/escritura y comprobaciones viven en `src/lib/` sin Svelte ni Tauri, y se prueban con un disco en memoria.
7. **Tests como puerta**: cada tarea termina con `npm run verificar` en verde. Prohibido avanzar con tests en rojo. Nunca se prueba contra la vault real.
8. **Local y en español**: nada sale del equipo (sin telemetría ni servicios externos). Código, interfaz, tests y documentación en español.
9. **La v1 sigue viva**: la v1.0 se puede instalar y usar siempre, al lado de la v2. Lo que la v2 escribe en `appDatos/` lo sigue leyendo la v1.0; si un cambio lo impide, se replantea el cambio.
