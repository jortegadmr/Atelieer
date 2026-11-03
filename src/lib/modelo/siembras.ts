// "Sugerir" siembras de un arco (D10): las pistas de los secretos que se
// revelan en eventos del arco (o en episodios donde el arco tiene eventos).
// Solo propone; el autor acepta cada una. Nunca copia la verdad (regla 10).

import * as c from "./consultas";
import type { Modelo } from "./modelo";
import type { Siembra } from "./tipos";

export function sugerirSiembras(m: Modelo, arcoId: string): Siembra[] {
  const arco = m.arcos.get(arcoId);
  if (!arco) return [];
  const eventos = c.eventosColocadosDeArco(m, arcoId);
  const ids = new Set(eventos.map((e) => e.id));
  const episodios = new Set(eventos.map((e) => e.episodio));
  const ya = new Set(arco.siembras.map((s) => s.siembra.trim()));
  const r: Siembra[] = [];
  for (const s of m.secretos.values()) {
    const enArco = (s.revelado_en.evento && ids.has(s.revelado_en.evento)) || (!!s.revelado_en.episodio && episodios.has(s.revelado_en.episodio));
    if (!enArco) continue;
    const epRev = s.revelado_en.episodio || m.eventos.get(s.revelado_en.evento)?.episodio || "";
    for (const p of s.pistas) {
      if (!p.texto.trim() || ya.has(p.texto.trim())) continue;
      const epPista = p.episodio || m.eventos.get(p.evento)?.episodio || "";
      r.push({
        siembra: p.texto,
        donde: c.codigo(m, epPista),
        recogida: `Se revela: ${s.titulo}`,
        donde_recogida: c.codigo(m, epRev),
      });
    }
  }
  return r;
}
