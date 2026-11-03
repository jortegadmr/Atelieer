// Las marcas del visor con una variante abierta (spec 006, RF-17): lo distinto
// entre «Ahora» y «Cómo quedaría», en discontinuo de acento y con texto. En
// «Cómo quedaría» dicen cómo está ahora; en «Ahora», cómo quedaría.

import { episodiosDe, marcasVisor, temporadasDe, type MarcasVisor } from "../consecuencias/visor";
import type { Modelo } from "../modelo/modelo";
import type { Nivel } from "../vistas/visor";

export const TEXTOS_QUEDARIA = { antes: "ahora", nueva: "Nueva en la variante", estaba: "Ahora aquí", yaNo: "Sale en la variante" };
export const TEXTOS_AHORA = { antes: "quedaría", nueva: "Sale en la variante", estaba: "Quedaría aquí", yaNo: "Nueva en la variante" };

/** `ids`: las piezas con diferencias; `verAhora`: se ve la serie y se marca cómo quedaría */
export function marcasVariante(serie: Modelo, quedaria: Modelo, nivel: Nivel, ids: Iterable<string>, verAhora: boolean): MarcasVisor {
  const r = verAhora ? marcasVisor(quedaria, serie, nivel, ids) : marcasVisor(serie, quedaria, nivel, ids);
  return { ...r, fantasma: true, textos: verAhora ? TEXTOS_AHORA : TEXTOS_QUEDARIA };
}

/**
 * Un arco o un secreto con diferencias (spec 009, RF-34): las temporadas (en la
 * serie) o los episodios (en una temporada) por los que pasa solo en un lado.
 */
export function soloDeUnLado(serie: Modelo, quedaria: Modelo, nivel: Nivel, id: string): Map<string, "ahora" | "variante"> {
  const r = new Map<string, "ahora" | "variante">();
  const a = serie.pieza(id);
  const b = quedaria.pieza(id);
  const tipo = (a ?? b)?.tipo;
  if (tipo !== "arco" && tipo !== "secreto") return r;
  const de = nivel.tipo === "serie" ? temporadasDe : nivel.tipo === "temporada" ? episodiosDe : null;
  if (!de) return r;
  // En una temporada, solo sus episodios
  const aqui = (m: Modelo) => (x: string) => nivel.tipo !== "temporada" || m.episodios.get(x)?.temporada === nivel.temporada;
  const ahora = new Set(de(serie, a).filter(aqui(serie)));
  const luego = new Set(de(quedaria, b).filter(aqui(quedaria)));
  for (const x of ahora) if (!luego.has(x)) r.set(x, "ahora");
  for (const x of luego) if (!ahora.has(x)) r.set(x, "variante");
  return r;
}
