// «Lo sabe desde» (spec 010, RF-26 a RF-29b): desde qué episodio sabe cada
// personaje de «Lo conocen» un secreto. Vive en la nota del secreto, en una
// propiedad aparte que la v1.0 conserva sin entenderla:
//
//   conocen_desde:
//     - personaje: "[[Telmo]]"
//       episodio: ep-7f3a
//
// No está en el esquema (se guarda en `extra`) para no normalizar lo escrito a
// mano: lo que no se entiende cuenta como Sin fecha y se conserva tal cual.

import { claveLimpia } from "../wiki/md";
import type { Modelo } from "./modelo";
import type { Secreto } from "./tipos";

export const PROPIEDAD = "conocen_desde";

/** Una fecha leída: un id de episodio, o un valor que no se entiende */
export type Fecha = { episodio: string } | { rara: unknown };

/** Lo que se enseña para un personaje: sin fecha, un episodio, o una fecha que no es un episodio de la serie */
export type FechaVista = "sin" | { episodio: string } | { rota: true };

const valor = (s: Secreto): unknown => (Object.hasOwn(s.extra, PROPIEDAD) ? s.extra[PROPIEDAD] : undefined);

/** `conocen_desde` está escrito a mano de otra forma (no es una lista): no se toca nunca */
export function escritaDeOtraForma(s: Secreto): boolean {
  const v = valor(s);
  return v !== undefined && !Array.isArray(v);
}

/** El personaje de una entrada, o null si la entrada no se entiende */
function personajeDe(entrada: unknown): string | null {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) return null;
  const p = (entrada as Record<string, unknown>).personaje;
  return typeof p === "string" && p.trim() ? p : null;
}

/** Las fechas de los personajes que están ahora en «Lo conocen», por clave de nombre; si se repite, la primera */
export function fechasDe(s: Secreto): Map<string, Fecha> {
  const r = new Map<string, Fecha>();
  const v = valor(s);
  if (!Array.isArray(v)) return r;
  const conocen = new Set(s.conocen.map(claveLimpia));
  for (const entrada of v) {
    const p = personajeDe(entrada);
    if (p === null) continue;
    const k = claveLimpia(p);
    if (!conocen.has(k) || r.has(k)) continue;
    const ep = (entrada as Record<string, unknown>).episodio;
    r.set(k, typeof ep === "string" && ep ? { episodio: ep } : { rara: ep });
  }
  return r;
}

/** La fecha de `personaje` tal como se enseña: lo que no es un episodio de la serie es una fecha rota */
export function fechaVista(m: Modelo, s: Secreto, personaje: string): FechaVista {
  const f = fechasDe(s).get(claveLimpia(personaje));
  if (!f) return "sin";
  if ("episodio" in f && m.episodios.has(f.episodio)) return { episodio: f.episodio };
  return { rota: true };
}

/**
 * Quita las entradas cuyo personaje cumple `fuera`; el resto (también lo raro
 * y las de personajes que ya no están) queda igual. Devuelve el valor nuevo de
 * la propiedad: `undefined` si hay que borrarla.
 */
function quitar(v: unknown[], fuera: (clave: string) => boolean): unknown[] {
  return v.filter((e) => {
    const p = personajeDe(e);
    return p === null || !fuera(claveLimpia(p));
  });
}

/**
 * El valor nuevo de `conocen_desde` al poner a `personaje` la fecha `episodio`
 * ("" es Sin fecha). `undefined`: la propiedad se borra. Si está escrita de
 * otra forma, se devuelve tal cual.
 */
export function ponerFecha(s: Secreto, personaje: string, episodio: string): unknown {
  const v = valor(s);
  if (v !== undefined && !Array.isArray(v)) return v;
  const lista = v ?? [];
  const k = claveLimpia(personaje);
  const r = quitar(lista, (c) => c === k);
  if (episodio) r.push({ personaje, episodio });
  if (!r.length) return lista.length ? undefined : v;
  return r;
}

/**
 * El valor nuevo de `conocen_desde` cuando «Lo conocen» pasa de `antes` a
 * `despues`: quien sale pierde su fecha (renombrar también la pierde). Las
 * entradas de personajes que no estaban en `antes` (huérfanas) se conservan.
 */
export function alCambiarConocen(s: Secreto, antes: string[], despues: string[]): unknown {
  const v = valor(s);
  if (!Array.isArray(v)) return v;
  const quedan = new Set(despues.map(claveLimpia));
  const salen = new Set(antes.map(claveLimpia).filter((k) => !quedan.has(k)));
  if (!salen.size) return v;
  const r = quitar(v, (c) => salen.has(c));
  if (r.length === v.length) return v;
  return r.length ? r : undefined;
}

/** Pone el valor nuevo de la propiedad en la pieza, o la borra */
function poner(s: Secreto, v: unknown) {
  if (v === undefined) delete s.extra[PROPIEDAD];
  else s.extra[PROPIEDAD] = v;
}

/** Para `editar`: cambia la fecha de `personaje` en la copia de la pieza ("" es Sin fecha) */
export function cambiarFecha(s: Secreto, personaje: string, episodio: string): void {
  poner(s, ponerFecha(s, personaje, episodio));
}

/** Para `editar`: cambia «Lo conocen» y quita la fecha de quien sale, en el mismo paso (RF-28) */
export function cambiarConocen(s: Secreto, conocen: string[]): void {
  poner(s, alCambiarConocen(s, s.conocen, conocen));
  s.conocen = conocen;
}
