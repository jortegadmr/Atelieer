// Qué hace «Aplicar» con una variante (spec 006, RF-32 a RF-37): el cambio de
// la serie (piezas que quedan como en la variante, nuevas y a la papelera) y
// las fichas de la wiki que hay que crear (pasar a borrador o a canon sin ficha).

import { estadoDe, tieneFicha, type ConEstado } from "../modelo/estados";
import type { Cambio, Modelo } from "../modelo/modelo";
import type { DatosVariante } from "./tipos";

export interface PlanAplicar {
  cambio: Cambio;
  /** Piezas en borrador o canon sin ficha: se pasan a la wiki al aplicar, con el nombre elegido si lo hay */
  crearFichas: { id: string; nombre?: string }[];
}

export function planAplicar(v: Pick<DatosVariante, "piezas" | "fichas">, serie: Modelo): PlanAplicar {
  const cambio: Cambio = { guardar: [], borrar: [] };
  const crearFichas: PlanAplicar["crearFichas"] = [];
  for (const [id, e] of v.piezas) {
    if (e.pieza) {
      cambio.guardar.push(e.pieza);
      const p = e.pieza;
      const conEnlace = "wiki" in p && typeof p.wiki === "string" && p.wiki.trim();
      if ("madurez" in p && tieneFicha(p.tipo) && !conEnlace && ["borrador", "canon"].includes(estadoDe(p as ConEstado))) {
        const nombre = v.fichas.get(id);
        crearFichas.push(nombre ? { id, nombre } : { id });
      }
    } else {
      const enSerie = serie.pieza(id);
      if (enSerie) cambio.borrar.push(enSerie);
    }
  }
  return { cambio, crearFichas };
}

const cuantas = (n: number, una: string, varias: string) => `${n} ${n === 1 ? una : varias}`;

/** El resumen de la confirmación (RF-32): «Aplicar «X»: cambia N piezas y saltarían M avisos.» y, si pisa algo, cuánto */
export function frasesAplicar(nombre: string, piezas: number, avisos: number, pisan: number): string[] {
  const frases = [`Aplicar «${nombre}»: cambia ${cuantas(piezas, "pieza", "piezas")} y ${avisos === 1 ? "saltaría" : "saltarían"} ${cuantas(avisos, "aviso", "avisos")}.`];
  if (pisan) frases.push(`Pisa lo de ahora en ${cuantas(pisan, "campo", "campos")}.`);
  return frases;
}

/** Por qué no se aplica una variante con choques (RF-33) */
export function fraseChoquesAplicar(n: number): string {
  return `Tiene ${cuantas(n, "choque", "choques")} con la serie: no se aplica nada. Ábrela para verlos en la pestaña «¿Y si…?».`;
}

/** Aviso al acabar (RF-39) */
export function fraseAplicada(nombre: string, piezas: number): string {
  return `Aplicada «${nombre}»: ${cuantas(piezas, "pieza", "piezas")}.`;
}
