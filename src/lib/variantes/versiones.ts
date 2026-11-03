// Las versiones de una pieza (spec 006, RF-4): las variantes aparcadas que se
// crearon desde ella («Probar otra versión») o que la cambian. Se sacan de las
// propiedades de cada variante, sin leer sus bloques.

import type { CabeceraVariante } from "./tipos";

/** Aparcadas creadas desde la pieza o que la cambian, la más reciente primero */
export function versionesDe(lista: Iterable<CabeceraVariante>, piezaId: string): CabeceraVariante[] {
  return [...lista]
    .filter((c) => c.estado === "aparcada" && (c.origen === piezaId || c.piezas.includes(piezaId)))
    .sort((a, b) => b.cambiada.localeCompare(a.cambiada));
}
