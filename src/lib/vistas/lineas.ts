// Una línea por arco presente en la temporada (spec 5.3, T4.3), en índices de
// episodio: -1 = viene de antes (empieza en el borde); n = sigue después.

import * as c from "../modelo/consultas";
import type { Modelo } from "../modelo/modelo";
import type { Arco, Evento } from "../modelo/tipos";
import type { Papel } from "../modelo/vocabulario";

export interface LineaArco {
  arco: Arco;
  tramo: boolean;
  desde: number;
  hasta: number;
  /** "T02" si sigue en la temporada siguiente, "sin cierre" si no hay más, null si cierra aquí */
  sigue: string | null;
  /** k: cuántas paradas había antes en el mismo episodio (para separarlas) */
  paradas: { ev: Evento; papel: Papel; i: number; k: number }[];
}

export function lineasTemporada(m: Modelo, temporadaId: string): LineaArco[] {
  const ix = m.indice();
  const iT = ix.posTemporada.get(temporadaId);
  if (iT === undefined) return [];
  const eps = ix.episodiosDe.get(temporadaId) ?? [];
  const n = eps.length;
  const siguiente = ix.temporadas[iT + 1];

  const presentes = new Set(c.arcosPresentes(m, temporadaId).map((a) => a.id));
  // Los descartados también salen (siempre visibles, T7.1), al final
  const arcos = c.arcosEnOrden(m).filter((a) => presentes.has(a.id));
  return [...arcos.filter((a) => a.madurez !== "descartado"), ...arcos.filter((a) => a.madurez === "descartado")]
    .map((a) => {
      const porEp = new Map<string, number>();
      const paradas = c
        .eventosColocadosDeArco(m, a.id)
        .filter((ev) => ix.posEpisodio.get(ev.episodio)!.iT === iT)
        .map((ev) => {
          const k = porEp.get(ev.episodio) ?? 0;
          porEp.set(ev.episodio, k + 1);
          return { ev, papel: c.papelEn(ev, a.id)!, i: ix.posEpisodio.get(ev.episodio)!.iE, k };
        });

      const { inicio, fin } = c.inicioFin(m, a.id);
      const tIni = inicio ? ix.posTemporada.get(inicio.temporada) : undefined;
      const tFin = fin ? ix.posTemporada.get(fin.temporada) : undefined;
      const idx = (ep: string) => ix.posEpisodio.get(ep)?.iE;

      let desde: number;
      if (tIni !== undefined && tIni < iT) desde = -1;
      else if (paradas.length) desde = Math.min(...paradas.map((p) => p.i));
      else if (tIni === iT && inicio!.episodio) desde = idx(inicio!.episodio) ?? 0;
      else desde = tIni === iT ? 0 : -1;

      let hasta: number;
      let sigue: string | null = null;
      if (tFin === iT) {
        hasta = fin!.episodio ? (idx(fin!.episodio) ?? n) : n;
        if (!fin!.episodio) hasta = paradas.length ? Math.max(...paradas.map((p) => p.i)) : n;
      } else if (tFin !== undefined && tFin < iT) {
        hasta = paradas.length ? Math.max(...paradas.map((p) => p.i)) : n;
      } else if (a.nivel === "temporada" && a.temporada === temporadaId) {
        // Un arco de temporada sin cerrar no pasa de su temporada (C10 lo avisará)
        hasta = n;
        sigue = "sin cierre";
      } else {
        hasta = n;
        sigue = siguiente ? c.codigo(m, siguiente) : "sin cierre";
      }
      return { arco: a, tramo: !!a.tramo_de && m.arcos.has(a.tramo_de), desde, hasta, sigue, paradas };
    });
}
