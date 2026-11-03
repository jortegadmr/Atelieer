// Estados de una pieza (spec 001). En el fichero, `madurez` guarda lo que lee
// la v1.0 (idea, borrador, canon, descartado) y `madurez_mesa` lo nuevo de la
// v2 (propuesta, aparcado), que solo vale mientras `madurez` sea idea.

import type { Arco, Episodio, Evento, Pieza, Secreto, Temporada } from "./tipos";
import { esValor, MADUREZ_MESA, type Estado, type Madurez } from "./vocabulario";

export type ConEstado = Temporada | Episodio | Arco | Evento | Secreto;

/** El estado que ve el autor (RF-11, RF-12) */
export function estadoDe(p: Pick<ConEstado, "madurez" | "madurez_mesa">): Estado {
  return p.madurez === "idea" && p.madurez_mesa ? p.madurez_mesa : p.madurez;
}

/**
 * Copia de la pieza en otro estado (RF-10). Propuesta y aparcado van aparte con
 * idea; cualquier otro quita el guardado aparte y el valor no entendido.
 */
export function conEstado<T extends ConEstado>(p: T, estado: Estado, motivo?: string): T {
  const q = structuredClone(p);
  const enMesa = esValor(MADUREZ_MESA, estado);
  q.madurez = enMesa ? "idea" : estado;
  q.madurez_mesa = enMesa ? estado : "";
  if (q.crudos) {
    delete q.crudos.madurez;
    delete q.crudos.madurez_mesa;
    if (!Object.keys(q.crudos).length) delete q.crudos;
  }
  if (estado === "descartado" && motivo !== undefined) q.motivo_descarte = motivo;
  return q;
}

/**
 * Si un campo con su valor a mano cambia, ese valor ya no vale (spec 003): así
 * poner un acto y quitarlo no resucita el que había escrito el autor. Devuelve
 * la misma pieza si no hay nada que olvidar.
 */
export function olvidarCrudos<T extends Pieza>(antes: Pieza | undefined, despues: T): T {
  if (!antes || !despues.crudos) return despues;
  const a = antes as unknown as Record<string, unknown>;
  const d = despues as unknown as Record<string, unknown>;
  const cambiados = Object.keys(despues.crudos).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(d[k]));
  if (!cambiados.length) return despues;
  const crudos = { ...despues.crudos };
  for (const k of cambiados) delete crudos[k];
  const q: T = { ...despues, crudos };
  if (!Object.keys(crudos).length) delete q.crudos;
  return q;
}

/** Si cuenta en las comprobaciones: ni descartada ni aparcada (RF-15 a RF-17) */
export function cuenta(p: { madurez?: string; madurez_mesa?: string }): boolean {
  if (p.madurez === undefined) return true;
  const e = estadoDe(p as Pick<ConEstado, "madurez" | "madurez_mesa">);
  return e !== "descartado" && e !== "aparcado";
}

/** Tipos que se pasan a la wiki con su ficha (los eventos no: RF-22) */
export function tieneFicha(tipo: string): tipo is "temporada" | "episodio" | "arco" | "secreto" {
  return tipo === "temporada" || tipo === "episodio" || tipo === "arco" || tipo === "secreto";
}

/** Lo que se escribe en `estado_canon` de la ficha: la wiki no conoce propuesta ni aparcado (RF-25) */
export function valorEnWiki(estado: Estado): Madurez {
  return esValor(MADUREZ_MESA, estado) ? "idea" : estado;
}
