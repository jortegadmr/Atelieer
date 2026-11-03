// «Viene de» (spec 011, RF-1 a RF-12): las escenas que causan una escena. Vive
// en la nota de la escena, en una propiedad aparte que la v1.0 conserva sin
// entenderla:
//
//   viene_de: [ev-7f3a, ev-91c2]
//
// Son ids, que no cambian al reordenar ni al renombrar. No está en el esquema
// (se guarda en `extra`) para no normalizar lo escrito a mano: lo que no se
// entiende se enseña como tal y se conserva (RF-9). «Provoca» se calcula.

import { enUnaLinea } from "../wiki/md";
import type { Modelo } from "./modelo";
import type { Evento } from "./tipos";

export const PROPIEDAD = "viene_de";

/** Una entrada de la lista, con su posición en disco */
export type Entrada = { id: string; i: number } | { rara: unknown; i: number };

export type VieneDe = { editable: true; entradas: Entrada[] } | { editable: false; crudo: string };

/** Qué es una entrada de texto, vista desde la escena `propio` */
export type QueEs = "escena" | "ya-no-esta" | "no-se-entiende";

export const FORMA_ESCENA = /^ev-[a-z0-9]{4,}$/;

const valor = (ev: Evento): unknown => (Object.hasOwn(ev.extra, PROPIEDAD) ? ev.extra[PROPIEDAD] : undefined);

/** Lo escrito a mano de otra forma, en una línea y sin caracteres de control */
export function textoCrudo(v: unknown): string {
  let s: string;
  try {
    s = typeof v === "string" ? v : (JSON.stringify(v) ?? String(v));
  } catch {
    s = String(v);
  }
  s = enUnaLinea(s);
  return s.length > 80 ? `${s.slice(0, 79).trimEnd()}…` : s;
}

/** Las causas tal como están en disco; un id repetido sale una vez (la primera) */
export function leerVieneDe(ev: Evento): VieneDe {
  const v = valor(ev);
  if (v === undefined) return { editable: true, entradas: [] };
  if (!Array.isArray(v)) return { editable: false, crudo: textoCrudo(v) };
  const vistos = new Set<string>();
  const entradas: Entrada[] = [];
  v.forEach((x, i) => {
    if (typeof x !== "string") return void entradas.push({ rara: x, i });
    if (vistos.has(x)) return;
    vistos.add(x);
    entradas.push({ id: x, i });
  });
  return { editable: true, entradas };
}

/** Los ids de las causas que son escenas de la serie (sin la propia ni repetidas) */
export function causasDe(m: Modelo, ev: Evento): string[] {
  const l = leerVieneDe(ev);
  if (!l.editable) return [];
  const r: string[] = [];
  for (const e of l.entradas) if ("id" in e && queEs(m, e.id, ev.id) === "escena") r.push(e.id);
  return r;
}

/** Una escena de la serie, un id de escena que ya no está, o algo que no se entiende (RF-9, RF-19c) */
export function queEs(m: Modelo, id: string, propio: string): QueEs {
  if (id === propio) return "no-se-entiende";
  if (m.eventos.has(id)) return "escena";
  return FORMA_ESCENA.test(id) && !m.pieza(id) ? "ya-no-esta" : "no-se-entiende";
}

/** El valor nuevo de la propiedad al añadir una causa; si está escrita de otra forma, tal cual */
export function anadirCausa(ev: Evento, id: string): unknown {
  const v = valor(ev);
  if (v !== undefined && !Array.isArray(v)) return v;
  const lista = v ?? [];
  if (lista.includes(id)) return v;
  return [...lista, id];
}

/** El valor nuevo al quitar una entrada: un id quita todas sus copias; una rara, su posición. `undefined`: se borra */
export function quitarCausa(ev: Evento, entrada: Entrada): unknown {
  const v = valor(ev);
  if (!Array.isArray(v)) return v;
  // Una rara solo se quita si en su posición sigue la misma (la nota pudo cambiar desde que se pintó)
  if (!("id" in entrada) && JSON.stringify(v[entrada.i]) !== JSON.stringify(entrada.rara)) return v;
  const r = "id" in entrada ? v.filter((x) => x !== entrada.id) : v.filter((_, i) => i !== entrada.i);
  if (r.length === v.length) return v;
  return r.length ? r : undefined;
}

/** Pone el valor nuevo de la propiedad en la pieza, o la borra */
export function ponerVieneDe(ev: Evento, v: unknown): void {
  if (v === undefined) delete ev.extra[PROPIEDAD];
  else ev.extra[PROPIEDAD] = v;
}
