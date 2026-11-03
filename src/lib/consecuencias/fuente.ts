// De dónde salen las marcas del visor, Tramas, la rejilla y la línea (spec 009,
// RF-30 a RF-32). Con «Si lo dejas así…» abierta y algo cambiado, gris: lo de
// antes contra lo de ahora, también dentro de una variante. Si no, con una
// variante abierta y diferencias, acento: la serie contra cómo quedaría.

import type { Modelo } from "../modelo/modelo";
import type { Sesion } from "../app/sesion";
import type { SesionVariante } from "../app/sesion-variante";
import { TEXTOS_ANTES, type TextosMarcas } from "./visor";
import { TEXTOS_AHORA, TEXTOS_QUEDARIA } from "../variantes/visor";

export interface FuenteMarcas {
  base: Modelo;
  actual: Modelo;
  /** Las piezas que cuentan como cambiadas */
  ids: string[];
  /** Discontinuo de acento (variante) en vez de gris */
  fantasma: boolean;
  textos: TextosMarcas;
}

/** Las marcas de una vista con su color y sus textos */
export type ConFuente<T> = T & { fantasma: boolean; textos: TextosMarcas };

export interface QuienMira {
  pestana: string;
  sesion: Pick<Sesion, "comparacion" | "modelo" | "efectos"> | null;
  sesionSerie: Pick<Sesion, "modelo"> | null;
  variante: Pick<SesionVariante, "modelo" | "diferencias"> | null;
  viendoAhora: boolean;
}

export function fuenteMarcas(q: QuienMira): FuenteMarcas | null {
  const s = q.sesion;
  if (q.pestana === "efectos") {
    const comp = s?.comparacion;
    if (!s || !comp) return null;
    const e = s.efectos();
    if (!e || (!e.total && !e.yaNoAvisan.length)) return null;
    return { base: comp.base, actual: s.modelo, ids: [comp.piezaId, ...e.afectadas.map((a) => a.id)], fantasma: false, textos: TEXTOS_ANTES };
  }
  const v = q.variante;
  const serie = q.sesionSerie;
  if (!v || !serie) return null;
  const d = v.diferencias();
  if (!d.piezas.length) return null;
  const ids = d.piezas.map((p) => p.id);
  return q.viendoAhora
    ? { base: v.modelo, actual: serie.modelo, ids, fantasma: true, textos: TEXTOS_AHORA }
    : { base: serie.modelo, actual: v.modelo, ids, fantasma: true, textos: TEXTOS_QUEDARIA };
}
