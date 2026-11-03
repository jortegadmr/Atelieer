// Subtramas frente a la principal de su temporada (§13, D6, D7, M9): C05, C06,
// C07 y C19.

import * as c from "../modelo/consultas";
import type { Modelo } from "../modelo/modelo";
import type { Arco } from "../modelo/tipos";
import { aviso, cmp, esSubtrama, eventosArco, eventosTemporada, pEvento, principalDe, protagonistas, titulo, vivo, type P } from "./base";
import type { Aviso } from "./tipos";

/** Subtramas presentes en una temporada, frente a su principal (si la hay) */
function subtramas(m: Modelo, temporadaId: string, principal?: Arco): Arco[] {
  return c.arcosPresentes(m, temporadaId).filter((a) => esSubtrama(a, principal));
}

/** C05: subtrama con el mismo protagonista que la principal (solo si coinciden todos, D6) */
export function c05(m: Modelo): Aviso[] {
  const r: Aviso[] = [];
  for (const t of c.temporadasEnOrden(m)) {
    const pri = principalDe(m, t.id);
    if (!pri) continue;
    const suyos = protagonistas(pri);
    if (!suyos.size) continue;
    for (const s of subtramas(m, t.id, pri)) {
      const otros = protagonistas(s);
      if (otros.size === suyos.size && [...otros].every((x) => suyos.has(x))) {
        r.push(aviso("C05", s.id, "aviso", `${titulo(s)} (${s.tipo_trama}) tiene el mismo protagonista que la principal de ${c.codigo(m, t.id)}: dale el suyo.`, "§13", "Tramas", t.id));
      }
    }
  }
  return r;
}

/** C06: subtrama que arranca antes que la principal o acaba después, dentro de la temporada */
export function c06(m: Modelo): Aviso[] {
  const r: Aviso[] = [];
  const ix = m.indice();
  for (const t of c.temporadasEnOrden(m)) {
    const pri = principalDe(m, t.id);
    if (!pri) continue;
    const iT = ix.posTemporada.get(t.id);
    const enT = (arcoId: string) => eventosArco(m, arcoId).filter((ev) => ix.posEpisodio.get(ev.episodio)!.iT === iT);
    // La principal abarca sus eventos y los de sus tramos en la temporada
    const suyos = [pri, ...c.tramos(m, pri.id).filter(vivo)].flatMap((a) => enT(a.id));
    const posiciones = suyos.map((ev) => pEvento(m, ev)!).sort(cmp);
    if (!posiciones.length) continue;
    const priInicio = posiciones[0];
    const priCierres = enT(pri.id).filter((ev) => c.papelEn(ev, pri.id) === "cierra").map((ev) => pEvento(m, ev)!).sort(cmp);
    const priFin: P | null = priCierres.length ? priCierres[priCierres.length - 1] : null;

    for (const s of subtramas(m, t.id, pri)) {
      const evs = enT(s.id);
      if (!evs.length) continue;
      const ps = evs.map((ev) => pEvento(m, ev)!).sort(cmp);
      if (cmp(ps[0], priInicio) < 0) {
        r.push(aviso("C06", s.id, "aviso", `${titulo(s)} (${s.tipo_trama}) arranca antes que la principal en ${c.codigo(m, t.id)}: plantea primero el problema principal.`, "§13", "Tramas", `${t.id} arranca`));
      }
      const cierres = evs.filter((ev) => c.papelEn(ev, s.id) === "cierra").map((ev) => pEvento(m, ev)!).sort(cmp);
      if (priFin && cierres.length && cmp(cierres[cierres.length - 1], priFin) > 0) {
        r.push(aviso("C06", s.id, "aviso", `${titulo(s)} (${s.tipo_trama}) se resuelve después que la principal en ${c.codigo(m, t.id)}.`, "§13", "Tramas", `${t.id} resuelve`));
      }
    }
  }
  return r;
}

/** C07: subtrama con más del 30 % de los eventos colocados de su temporada */
export function c07(m: Modelo): Aviso[] {
  const r: Aviso[] = [];
  for (const t of c.temporadasEnOrden(m)) {
    const evs = eventosTemporada(m, t.id);
    if (!evs.length) continue;
    for (const s of subtramas(m, t.id, principalDe(m, t.id))) {
      const n = evs.filter((ev) => ev.arcos.some((x) => x.arco === s.id)).length;
      if (n / evs.length > 0.3) {
        r.push(
          aviso(
            "C07",
            s.id,
            "sugerencia",
            `${titulo(s)} (${s.tipo_trama}) tiene ${Math.round((n / evs.length) * 100)} % de las escenas de ${c.codigo(m, t.id)} (${n} de ${evs.length}): la proporción recomendada es 70/30.`,
            "§13",
            "Tramas",
            t.id,
          ),
        );
      }
    }
  }
  return r;
}

/** C19: temporada sin trama principal elegida y con arcos B o C presentes (D7) */
export function c19(m: Modelo): Aviso[] {
  return c
    .temporadasEnOrden(m)
    .filter((t) => !principalDe(m, t.id) && c.arcosPresentes(m, t.id).some((a) => vivo(a) && a.tipo_trama !== "A"))
    .map((t) =>
      aviso("C19", t.id, "sugerencia", `${c.codigo(m, t.id)} no tiene trama principal elegida: sin ella no se comprueban sus subtramas.`, "Decisión D7", "Tramas"),
    );
}
