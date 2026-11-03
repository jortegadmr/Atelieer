// Trama dominante del episodio (D8): la que más eventos tiene en él. Empate:
// gana la de tipo más alto (A, B, C); si sigue, la principal de la temporada;
// si sigue, la primera en el orden de las listas. La fijada a mano manda.
// Los eventos descartados o aparcados no cuentan (spec 001).

import * as c from "./consultas";
import { cuenta as cuentaEn } from "./estados";
import type { Modelo } from "./modelo";

const PESO = { A: 0, B: 1, C: 2 } as const;

export function tramaDominante(m: Modelo, episodioId: string, opciones: { sinManual?: boolean } = {}): string {
  const ep = m.episodios.get(episodioId);
  if (!ep) return "";
  if (!opciones.sinManual && ep.dominante_manual && m.arcos.has(ep.dominante_manual)) return ep.dominante_manual;

  const cuenta = new Map<string, number>();
  for (const ev of c.eventosDeEpisodio(m, episodioId)) {
    if (!cuentaEn(ev)) continue;
    for (const { arco } of ev.arcos) if (m.arcos.has(arco)) cuenta.set(arco, (cuenta.get(arco) ?? 0) + 1);
  }
  if (!cuenta.size) return "";

  const principal = m.temporadas.get(ep.temporada)?.principal ?? "";
  const orden = new Map(c.arcosEnOrden(m).map((a, i) => [a.id, i]));
  const candidatos = [...cuenta.keys()].sort((x, y) => {
    const ax = m.arcos.get(x)!;
    const ay = m.arcos.get(y)!;
    return (
      cuenta.get(y)! - cuenta.get(x)! ||
      PESO[ax.tipo_trama] - PESO[ay.tipo_trama] ||
      Number(y === principal) - Number(x === principal) ||
      orden.get(x)! - orden.get(y)!
    );
  });
  return candidatos[0];
}
