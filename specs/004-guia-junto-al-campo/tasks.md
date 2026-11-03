# Tareas — Spec 004 Guía junto a cada campo

> Tareas de 20-30 min, en orden. Una cada vez: tests primero (solo la lógica), `npm run verificar`, marcar, commit.
> Rama `004-guia-junto-al-campo`; al acabar se junta en `main`. Sin cambios en `src-tauri/`, en el formato de las notas ni en el de `guia.md`.

## Bloque 1 · Lógica (TypeScript puro, con tests)
- [x] T1. `guia-md.ts`: ids en mayúsculas y reglas repetidas (RF-20). `marcas.ts`: `estadoRegla` y `marca()` como envoltorio (RF-10 a RF-12, RF-14, RF-19).
      Hecho cuando estos tests están en verde:
      - «G07 repetida: la primera y un aviso»;
      - «repetida entre Reglas y Magia»;
      - «g07 y G07 son la misma»;
      - «se cumple / no se cumple / sugerencia / lo sé / la juzgas tú»;
      - «aparcada y descartada no se comprueban»;
      - «serie y punto, sin estado, se comprueban»;
      - «avisos en el orden de Comprobar»;
      - «G07 comparte con G08 y G10»;
      - los de `marca()` de siempre.
- [x] T2. `campos.ts`: `CAMPOS` (con la pieza de guía esperada), `reglasDeCampo` y `reglasNueva` (RF-1 a RF-5, RF-8, RF-21 a RF-24; RNF rendimiento).
      Hecho cuando estos tests están en verde:
      - «cada regla de la tabla existe en la guía inicial con la pieza esperada»;
      - «arco.quiere: G07 en trama, G21 en personaje»;
      - «arco.cambia por tipo»;
      - «G07 pasada a personaje no sale en el personaje»;
      - «G12 solo en A de serie, G13 solo de temporada»;
      - «subtrama solo en B y C»;
      - «magia solo activada»;
      - «regla borrada no sale»;
      - «G50 nueva no va a ningún campo»;
      - «Nueva pieza: cada tipo; subtrama aparte en la trama de serie; con las propias en la trama de temporada y en el tramo de una B»;
      - «1.500 escenas en menos de 50 ms».
- [x] T3. `sesion.loSe`: clave de deshacer propia; quitar borra todas las variantes de la comprobación (RF-14, RF-15, RF-18).
      Hecho cuando estos tests están en verde:
      - «escribir y Lo sé enseguida: dos pasos de deshacer»;
      - «quitar lo sé con C01a y C01b: los dos activos»;
      - «en disco, `avisos_silenciados` como hoy»;
      - «la v1.0 lo lee».

## Bloque 2 · Interfaz
- [x] T4a. `MarcaRegla.svelte`; pestaña Guía con `estadoRegla` y marca con texto; `estado.verRegla`, `reglaSenalada` y regla señalada (desplazar, enfocar, resaltar); `.maxim.senalada` (RF-16, RF-19).
      Hecho cuando `verificar` está en verde y en el navegador:
      - la pestaña Guía de un arco enseña las cinco marcas con texto, y la de una pieza aparcada;
      - `verRegla` desde la consola la señala y la enfoca;
      - tema claro y oscuro.
- [x] T4b. `ConGuia.svelte` y `ReglasCampo.svelte` en un solo campo, «Pregunta de oro»; estilos `.reglas-campo` (RF-6 a RF-18).
      Hecho cuando `verificar` está en verde y en el navegador:
      - la regla sale al enfocar y se oculta al salir;
      - Tab a los botones no la pierde;
      - con el ratón, el clic en «Lo sé» no se pierde;
      - tras «Lo sé», el foco está en «Quitar «lo sé»» y Ctrl Z lo deshace;
      - «Ver en la Guía» la señala;
      - `aria-describedby` en el árbol de accesibilidad;
      - canon bloqueado sin reglas;
      - panel estrecho.
      Después, el autor lo prueba a mano en el Mac.
- [x] T5a. Envolver los campos simples del panel en `EditarSerie`, `EditarTemporada`, `EditarEpisodio`, `EditarEvento` y `EditarSecreto`: un solo control o un grupo (Logline, Story Circle, motor del episodio, pistas, Lo conocen).
      Hecho cuando `verificar` está en verde y en el navegador cada una de esas filas de la tabla enseña su regla, una sola vez por grupo.
- [x] T5b. Envolver los pares y celdas: cargas, valor de la escena, gana / pierde, Crisis y Clímax en «Estructura», Desenlace en los actos, Cuándo ocurre en su `.f2`, y en `EditarArco` Nivel, Empieza, Acaba, Vence la bomba y Protagonistas.
      Hecho cuando `verificar` está en verde y en el navegador:
      - las rejillas `.f2` no se descolocan;
      - pulsar la celda vecina con la regla abierta no pierde el clic;
      - G12 y G13 según el nivel del arco.
- [x] T6. Tramas: envolver las tarjetas de `Campos.svelte` (sin los bloques leídos de la ficha; pegamento con sus botones). `TarjetaCampo` y `TarjetaDoble` cierran con `focusout` del contenedor. «Ver en la Guía» desde Tramas (RNF estabilidad).
      Hecho cuando `verificar` está en verde y en el navegador:
      - trama, personaje y relación enseñan sus reglas;
      - Tab de una tarjeta (simple y doble) a «Lo sé» no la cierra ni salta nada;
      - «Ver en la Guía» elige el arco;
      - un arco canon bloqueado no enseña reglas.
- [x] T7. «Nueva pieza»: columna «Lo que te pedirán tus guías» (RF-21 a RF-24).
      Hecho cuando `verificar` está en verde y en el navegador:
      - escena, episodio, temporada y secreto;
      - trama de personaje, sin subtrama;
      - trama de relación de serie, con «Si es subtrama (B o C)»;
      - trama de temporada, con las de subtrama juntas;
      - guía vacía, con el texto de RF-24;
      - el foco no sale de la ventana.

## Bloque 3 · Cierre
- [x] T8. Alinear `docs/inventario-v1.md` (G7: guía junto a cada campo, hecho) y `docs/diseno.md` (fila `.pista` → `.reglas-campo`, marcas con texto).
      Hecho cuando: esas líneas están cambiadas y en el commit.
- [x] T9. Validación final:
      - `validacion.md` requisito por requisito;
      - revisión independiente de código y seguridad, y arreglos;
      - pruebas a mano del autor apuntadas: Mac/WebKit, Tauri en Windows, `_prueba` en la v1.0 tras «Lo sé»;
      - juntar la rama en `main`.
      Hecho cuando: cada RF tiene su prueba, la revisión no tiene críticos y `verificar` está en verde en `main`.
