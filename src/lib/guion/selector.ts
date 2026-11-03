// Cuándo se abre el selector de referencias (spec 013, RF-11, RF-12) y qué
// consulta lleva. Lógica pura: la vista solo pinta la lista. Dos modos:
//  - «arroba»: se escribió `@` al principio de línea o tras un espacio (o tras
//    otra referencia); la consulta es lo escrito después, en esa línea.
//  - «personaje»: se escribe en una línea de personaje, sin `@`; la consulta es
//    toda la línea. Aquí Enter solo inserta si el autor ha bajado a una opción.

import type { Documento, Pos } from "./documento";
import type { TipoLinea } from "./tipos";

export type ModoSelector = "arroba" | "personaje";

export interface SelectorAbierto {
  modo: ModoSelector;
  /** Dónde empieza lo que se reemplaza (la `@` o el principio de la línea de personaje) */
  desde: Pos;
  consulta: string;
}

/** Más largo que esto, ya no es una búsqueda de ficha */
export const MAX_CONSULTA = 40;

/** ¿Escribir `@` aquí abre el selector? Al principio de línea, tras un espacio o tras una referencia */
export function puedeAbrirConArroba(doc: Documento, p: Pos): boolean {
  if (p.u === 0) return true;
  const prev = doc[p.l]?.u[p.u - 1];
  if (prev === undefined) return false;
  return typeof prev !== "string" || /\s/.test(prev);
}

/**
 * El selector abierto en este momento, o null. `arroba` es dónde se escribió la
 * `@` que lo abrió (la vista lo recuerda); `cerradoEn` es la línea donde el
 * autor lo cerró con Esc (el modo personaje no vuelve a abrirse en ella).
 */
export function selectorAbierto(doc: Documento, pos: Pos, tipos: TipoLinea[], arroba: Pos | null, cerradoEn: number | null): SelectorAbierto | null {
  const linea = doc[pos.l];
  if (!linea) return null;
  if (arroba && arroba.l === pos.l && pos.u > arroba.u && linea.u[arroba.u] === "@" && pos.u - arroba.u - 1 <= MAX_CONSULTA) {
    const entre = linea.u.slice(arroba.u + 1, pos.u);
    if (entre.every((x) => typeof x === "string")) return { modo: "arroba", desde: arroba, consulta: (entre as string[]).join("") };
  }
  if (tipos[pos.l] === "personaje" && cerradoEn !== pos.l && pos.u === linea.u.length && linea.u.length > 0 && linea.u.length <= MAX_CONSULTA && linea.u.every((x) => typeof x === "string")) {
    return { modo: "personaje", desde: { l: pos.l, u: 0 }, consulta: (linea.u as string[]).join("") };
  }
  return null;
}

/** Lo que se busca: sin la extensión «(V.O.)» de un personaje y siempre en mayúsculas no importa (la búsqueda ignora la caja) */
export function consultaLimpia(s: string): string {
  return s.replace(/\s*\([^()]*\)\s*$/, "").trim();
}
