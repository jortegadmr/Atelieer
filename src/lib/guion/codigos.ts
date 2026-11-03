// Código visible de cada escena (spec 013, RF-20 a RF-22): `T01E06-S03`, y
// `S03` dentro de su episodio. Se calcula siempre por la posición, como los
// códigos T01 y T01E06 (modelo/codigos.ts): nunca se guarda en una nota. Las
// escenas descartadas conservan su posición, así que descartar o recuperar una
// no renumera las demás; mover, reordenar, crear o borrar sí.

import type { Modelo } from "../modelo/modelo";

export interface CodigoEscena {
  /** `T01E06-S03` */
  completo: string;
  /** `S03` */
  corto: string;
}

export function codigosDeEscenas(m: Modelo): Map<string, CodigoEscena> {
  const r = new Map<string, CodigoEscena>();
  const idx = m.indice();
  for (const idE of idx.episodios) {
    const codigoEp = idx.codigos.get(idE);
    if (!codigoEp) continue;
    const escenas = idx.porEpisodio.get(idE) ?? [];
    const cifras = escenas.length > 99 ? 3 : 2;
    escenas.forEach((ev, i) => {
      const corto = `S${String(i + 1).padStart(cifras, "0")}`;
      r.set(ev.id, { completo: `${codigoEp}-${corto}`, corto });
    });
  }
  return r;
}
