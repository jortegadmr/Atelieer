// «Traer lo de ahora» (spec 006, RF-30, RF-30b, RF-30c): pone al día con la
// serie una pieza o un sitio de la variante que chocan. Por campo, a tres
// bandas (base, serie, variante): lo que cambió solo en la serie toma lo de
// ahora; lo de la variante se queda; si cambió en los dos lados se queda lo de
// la variante y se apunta en `pisa`, para que nada se pise sin verlo.

import { leerPieza } from "../modelo/ficheros";
import type { Modelo } from "../modelo/modelo";
import type { Evento, Pieza } from "../modelo/tipos";
import { ordenEn, contenedorDe } from "./choques";
import { notaNormal } from "./normal";
import type { PiezaVariante } from "./tipos";

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
type Registro = Record<string, unknown>;

/** Junta a tres bandas un objeto plano (los campos de la pieza, o los de `extra`) */
function juntar(base: Registro, serie: Registro, mio: Registro, pisa: Registro): Registro {
  const r: Registro = structuredClone(serie);
  for (const k of new Set([...Object.keys(base), ...Object.keys(serie), ...Object.keys(mio)])) {
    if (igual(mio[k], base[k])) continue;
    // Cambió en la variante: se queda; si la serie también lo cambió (a otra cosa), lo pisa
    if (mio[k] === undefined) delete r[k];
    else r[k] = structuredClone(mio[k]);
    if (!igual(serie[k], base[k]) && !igual(serie[k], mio[k])) pisa[k] = structuredClone(serie[k]);
  }
  return r;
}

export interface Traida {
  /** Cómo queda la pieza en la variante (null: sigue a la papelera) */
  pieza: Pieza | null;
  /** Su base nueva: la serie de ahora */
  base: string;
  /** Campos que pisan lo cambiado en la serie, con el valor de la serie */
  pisa: Registro;
}

/** «Traer lo de ahora» de una pieza en choque (RF-30). `ahora` es la de la serie */
export function traerPieza(e: PiezaVariante, id: string, ahora: Pieza): Traida {
  const base = e.base === null ? null : (() => {
    try {
      return leerPieza(e.base!, e.tipo, id);
    } catch {
      return null;
    }
  })();
  const pisa: Registro = {};
  if (!e.pieza) {
    // A la papelera en la variante: sigue así; lo que cambió en la serie, lo pisa
    if (base) for (const k of Object.keys(ahora)) if (!igual((ahora as unknown as Registro)[k], (base as unknown as Registro)[k])) pisa[k] = structuredClone((ahora as unknown as Registro)[k]);
    return { pieza: null, base: notaNormal(ahora), pisa };
  }
  if (!base) return { pieza: e.pieza, base: notaNormal(ahora), pisa };
  const [b, s, m] = [base, ahora, e.pieza] as unknown as Registro[];
  const sinMeta = (x: Registro) => {
    const { extra: _e, crudos: _c, ...resto } = x;
    return resto;
  };
  const r = juntar(sinMeta(b), sinMeta(s), sinMeta(m), pisa);
  // Lo que la app no entiende (extra), por subclave
  const pisaExtra: Registro = {};
  r.extra = juntar((b.extra ?? {}) as Registro, (s.extra ?? {}) as Registro, (m.extra ?? {}) as Registro, pisaExtra);
  if (Object.keys(pisaExtra).length) pisa.extra = pisaExtra;
  // Los valores escritos a mano (crudos) van con su campo: del lado que se queda con él
  const crudos: Registro = {};
  for (const lado of [s, m]) {
    const c = (lado.crudos ?? {}) as Registro;
    for (const [k, v] of Object.entries(c)) if (igual(r[k], lado[k])) crudos[k] = v;
  }
  if (Object.keys(crudos).length) r.crudos = crudos;
  else delete r.crudos;
  return { pieza: r as unknown as Pieza, base: notaNormal(ahora), pisa };
}

/**
 * Lo que sigue pisando de `pisa` (RF-30c): una entrada sale cuando el campo de
 * la variante iguala al de la serie o vuelve al valor que se pisaba.
 */
export function limpiarPisa(pisa: Registro | undefined, variante: Pieza | null, serie: Pieza | undefined): Registro | undefined {
  if (!pisa) return undefined;
  const v = (variante ?? {}) as unknown as Registro;
  const s = (serie ?? {}) as unknown as Registro;
  const r: Registro = {};
  for (const [k, x] of Object.entries(pisa)) {
    if (!variante) r[k] = x;
    else if (!igual(v[k], s[k]) && !igual(v[k], x)) r[k] = x;
  }
  return Object.keys(r).length ? r : undefined;
}

/**
 * «Traer lo de ahora» de un sitio (RF-30b): el orden de las escenas de la serie
 * de ahora, con las que la variante crea o trae a este sitio junto a la vecina
 * que tenían delante (si ya no está, al final), y todo renumerado sin repetidos.
 * Devuelve las escenas que cambian de número en «Cómo quedaría».
 */
export function traerSitio(contenedor: string, serie: Modelo, quedaria: Modelo, deLaVariante: ReadonlySet<string>): Evento[] {
  const enSerie = ordenEn(serie, contenedor) ?? [];
  const aqui = ordenEn(quedaria, contenedor) ?? [];
  const estaAqui = new Set(aqui);
  // Las de la serie que siguen aquí en la variante, en el orden de la serie
  const r = enSerie.filter((id) => estaAqui.has(id) && !(deLaVariante.has(id) && traidaAqui(id, contenedor, serie, quedaria)));
  // Las que pone aquí la variante, junto a la vecina que tenían delante
  for (let i = 0; i < aqui.length; i++) {
    const id = aqui[i];
    if (r.includes(id)) continue;
    const delante = i > 0 ? aqui[i - 1] : null;
    if (delante === null) r.unshift(id);
    else {
      const j = r.indexOf(delante);
      if (j >= 0) r.splice(j + 1, 0, id);
      else r.push(id);
    }
  }
  const cambian: Evento[] = [];
  r.forEach((id, i) => {
    const ev = quedaria.eventos.get(id);
    if (ev && ev.orden !== i + 1) cambian.push({ ...structuredClone(ev), orden: i + 1 });
  });
  return cambian;
}

/** La variante trajo esta escena aquí (nueva, o de otro sitio u otro acto) */
function traidaAqui(id: string, contenedor: string, serie: Modelo, quedaria: Modelo): boolean {
  const s = serie.eventos.get(id);
  const q = quedaria.eventos.get(id);
  if (!q) return false;
  return !s || contenedorDe(serie, s) !== contenedor || s.acto !== q.acto;
}
