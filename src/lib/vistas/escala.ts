// Escala horizontal de la vista Serie: la serie entera en orden de emisión,
// un hueco por episodio. Las temporadas sin episodios ocupan los previstos o,
// si no los dice, la media de las demás (spec 5.1: ancho según episodios).

import * as c from "../modelo/consultas";
import type { Modelo } from "../modelo/modelo";
import type { Posicion, Temporada } from "../modelo/tipos";

export interface TramoTemporada {
  t: Temporada;
  codigo: string;
  /** Episodios que tiene de verdad */
  episodios: number;
  desde: number;
  ancho: number;
}

export interface EscalaSerie {
  total: number;
  temporadas: TramoTemporada[];
  /** Posición en unidades de episodio; null si no apunta a nada */
  x(pos: Pick<Posicion, "temporada" | "episodio">, donde?: "centro" | "inicio" | "fin"): number | null;
  /** De unidades a porcentaje del ancho */
  pct(x: number): number;
}

export function escalaSerie(m: Modelo): EscalaSerie {
  const ts = c.temporadasEnOrden(m);
  const conEpisodios = ts.map((t) => c.episodiosDeTemporada(m, t.id).length);
  const llenas = conEpisodios.filter((n) => n > 0);
  const media = llenas.length ? Math.round(llenas.reduce((a, b) => a + b, 0) / llenas.length) : 8;

  let desde = 0;
  const temporadas = ts.map((t, i) => {
    const ancho = conEpisodios[i] || t.episodios_previstos || media;
    const tramo = { t, codigo: c.codigo(m, t.id), episodios: conEpisodios[i], desde, ancho };
    desde += ancho;
    return tramo;
  });
  const total = Math.max(desde, 1);
  const porId = new Map(temporadas.map((t) => [t.t.id, t]));
  const ix = m.indice();

  return {
    total,
    temporadas,
    x(pos, donde = "centro") {
      const p = pos.episodio ? ix.posEpisodio.get(pos.episodio) : undefined;
      if (p) return temporadas[p.iT].desde + p.iE + 0.5;
      const t = porId.get(pos.temporada);
      if (!t) return null;
      if (donde === "inicio") return t.desde;
      if (donde === "fin") return t.desde + t.ancho;
      return t.desde + t.ancho / 2;
    },
    pct: (x) => (x / total) * 100,
  };
}
