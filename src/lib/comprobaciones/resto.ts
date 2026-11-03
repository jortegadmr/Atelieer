// Eventos (C08, C09), secretos (C14, C15), episodios (C16) y serie (C18).

import * as c from "../modelo/consultas";
import type { Modelo } from "../modelo/modelo";
import { aviso, cmp, eventosArco, pPunto, titulo, vivo } from "./base";
import type { Aviso } from "./tipos";

const eventosVivos = (m: Modelo) => [...m.eventos.values()].filter(vivo);

/** C08: evento que no marca ninguna casilla del test de relleno */
export function c08(m: Modelo): Aviso[] {
  return eventosVivos(m)
    .filter((e) => !e.relleno.avanza && !e.relleno.revela)
    .map((e) => aviso("C08", e.id, "aviso", `«${titulo(e)}» puede ser relleno: no hace avanzar a ningún protagonista ni da información.`, "§25", "Escenas"));
}

/** C09: evento sin microconflicto */
export function c09(m: Modelo): Aviso[] {
  return eventosVivos(m)
    .filter((e) => !e.gana.trim() && !e.pierde.trim())
    .map((e) => aviso("C09", e.id, "sugerencia", `«${titulo(e)}» no tiene microconflicto: ni qué gana ni qué pierde.`, "§10", "Escenas"));
}

/** C14: secreto que se revela sin ninguna pista antes */
export function c14(m: Modelo): Aviso[] {
  const r: Aviso[] = [];
  for (const s of m.secretos.values()) {
    if (!vivo(s)) continue;
    const rev = pPunto(m, s.revelado_en.episodio, s.revelado_en.evento);
    if (!rev) continue;
    const antes = s.pistas.some((p) => {
      const pos = pPunto(m, p.episodio, p.evento);
      return pos !== null && cmp(pos, rev) < 0;
    });
    if (!antes) {
      const donde = c.codigo(m, s.revelado_en.episodio || m.eventos.get(s.revelado_en.evento)?.episodio || "");
      r.push(aviso("C14", s.id, "aviso", `«${titulo(s)}» se revela en ${donde} sin ninguna pista antes.`, "§15 · F4", "Secretos"));
    }
  }
  return r;
}

/** C15: pista sembrada después de la revelación */
export function c15(m: Modelo): Aviso[] {
  const r: Aviso[] = [];
  for (const s of m.secretos.values()) {
    if (!vivo(s)) continue;
    const rev = pPunto(m, s.revelado_en.episodio, s.revelado_en.evento);
    if (!rev) continue;
    const tarde = s.pistas.filter((p) => {
      const pos = pPunto(m, p.episodio, p.evento);
      return pos !== null && cmp(pos, rev) > 0;
    });
    if (tarde.length) {
      const donde = tarde.map((p) => c.codigo(m, p.episodio || m.eventos.get(p.evento)?.episodio || "")).join(", ");
      r.push(
        aviso("C15", s.id, "aviso", `«${titulo(s)}»: ${tarde.length === 1 ? "una pista llega" : `${tarde.length} pistas llegan`} después de la revelación (${donde}).`, "§15", "Secretos"),
      );
    }
  }
  return r;
}

/** C16: episodio que acaba sin ninguna incógnita abierta (ni arco abierto ni secreto por revelar) */
export function c16(m: Modelo): Aviso[] {
  const r: Aviso[] = [];
  const ix = m.indice();
  const ultimo = ix.episodios.length - 1;
  const arcos = [...m.arcos.values()].filter(vivo).map((a) => {
    const evs = eventosArco(m, a.id);
    const gs = evs.map((ev) => ix.posEpisodio.get(ev.episodio)!.global);
    const cierres = evs.filter((ev) => c.papelEn(ev, a.id) === "cierra").map((ev) => ix.posEpisodio.get(ev.episodio)!.global);
    return { primero: gs.length ? Math.min(...gs) : Infinity, cierre: cierres.length ? Math.max(...cierres) : Infinity };
  });
  const secretos = [...m.secretos.values()].filter(vivo).map((s) => pPunto(m, s.revelado_en.episodio, s.revelado_en.evento)?.[0] ?? Infinity);

  ix.episodios.forEach((id, g) => {
    if (g === ultimo) return;
    const empezados = arcos.filter((a) => a.primero <= g);
    if (!empezados.length) return; // sin datos todavía
    const abierto = empezados.some((a) => a.cierre > g) || secretos.some((rev) => rev > g);
    if (!abierto) {
      r.push(aviso("C16", id, "sugerencia", `${c.codigo(m, id)} acaba sin ninguna incógnita abierta: todo lo empezado está cerrado y no queda secreto por revelar.`, "§11", "Episodios"));
    }
  });
  return r;
}

/** C18: serie sin final decidido */
export function c18(m: Modelo): Aviso[] {
  return m.serie.final_decidido.trim()
    ? []
    : [aviso("C18", m.serie.id, "sugerencia", "La serie no tiene final decidido: decídelo antes de escribir, aunque sea en una línea.", "§18 · F1.6", "Serie")];
}
