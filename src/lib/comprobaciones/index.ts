// Las comprobaciones de la fase 1 (spec 6.2, plan 3.6). Funciones puras: reciben
// el modelo y devuelven avisos. "Lo sé" (avisos_silenciados de la pieza) los
// aparta a `silenciados`, solo en esa pieza.

import type { Modelo } from "../modelo/modelo";
import { vivo } from "./base";
import { c03, c04, c10, c11, c12, c13, c17 } from "./arcos";
import { c01, c02 } from "./carga";
import { c08, c09, c14, c15, c16, c18 } from "./resto";
import { c05, c06, c07, c19 } from "./subtramas";
import type { Aviso } from "./tipos";

export { c01, c02, c03, c04, c05, c06, c07, c08, c09, c10, c11, c12, c13, c14, c15, c16, c17, c18, c19 };
export type { Aviso } from "./tipos";

export const COMPROBACIONES = [c01, c02, c03, c04, c05, c06, c07, c08, c09, c10, c11, c12, c13, c14, c15, c16, c17, c18, c19];

/** Id con el que se silencia un aviso: C01a, C01b y C01c se silencian como C01 */
export const idBase = (id: string) => id.replace(/[a-z]$/, "");

export interface Resultado {
  avisos: Aviso[];
  silenciados: Aviso[];
}

export function comprobar(m: Modelo): Resultado {
  const r: Resultado = { avisos: [], silenciados: [] };
  for (const fn of COMPROBACIONES) {
    for (const a of fn(m)) {
      const p = m.pieza(a.pieza);
      // Nada avisa sobre una pieza aparcada o descartada (RF-15, RF-17)
      if (p && "madurez" in p && !vivo(p)) continue;
      const callados = p && "avisos_silenciados" in p ? p.avisos_silenciados : [];
      if (callados.includes(a.id) || callados.includes(idBase(a.id))) r.silenciados.push(a);
      else r.avisos.push(a);
    }
  }
  return r;
}
