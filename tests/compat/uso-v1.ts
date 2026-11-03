// Cómo usa la v1.0 una nota: la abre con su lector (copia congelada de la
// etiqueta v1.0 en ./v1, que no se toca) y la vuelve a guardar.

import type { Pieza } from "../../src/lib/modelo/tipos";
import * as v1 from "./v1/ficheros";
import type { TipoPieza as TipoV1 } from "./v1/vocabulario";

/** La v1.0 abre la nota y la lee */
export function leidoPorV1(texto: string, tipo: Pieza["tipo"]): Record<string, unknown> {
  return v1.leerPieza(texto, tipo as TipoV1) as unknown as Record<string, unknown>;
}

/** La v1.0 abre la nota y la vuelve a guardar sin cambiar nada */
export function guardadoPorV1(texto: string, tipo: Pieza["tipo"]): string {
  return v1.escribirPieza(v1.leerPieza(texto, tipo as TipoV1));
}

/** La v1.0 abre la nota, la cambia y la guarda */
export function editadoPorV1(texto: string, tipo: Pieza["tipo"], cambio: (p: Record<string, unknown>) => void): string {
  const p = v1.leerPieza(texto, tipo as TipoV1);
  cambio(p as unknown as Record<string, unknown>);
  return v1.escribirPieza(p);
}
