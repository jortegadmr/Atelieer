// Comprobaciones de los arcos: C03, C04, C10, C11, C12, C13 y C17.

import * as c from "../modelo/consultas";
import type { Modelo } from "../modelo/modelo";
import type { Posicion } from "../modelo/tipos";
import { aviso, eventosArco, titulo, vivo } from "./base";
import { nOlvido } from "./olvido";
import type { Aviso } from "./tipos";

const arcosVivos = (m: Modelo) => [...m.arcos.values()].filter(vivo);

/** C03: arco A de trama sin qué quiere, sin qué gana / qué pierde o sin bomba */
export function c03(m: Modelo): Aviso[] {
  const r: Aviso[] = [];
  for (const a of arcosVivos(m)) {
    if (a.tipo_trama !== "A" || a.tipo_arco !== "trama") continue;
    const faltan = [
      !a.quiere.trim() && "qué quiere",
      !a.gana.trim() && "qué gana",
      !a.pierde.trim() && "qué pierde",
      !a.bomba.trim() && "su bomba de tiempo",
    ].filter(Boolean) as string[];
    if (faltan.length) {
      const lista = faltan.length > 1 ? `${faltan.slice(0, -1).join(", ")} ni ${faltan[faltan.length - 1]}` : faltan[0];
      r.push(aviso("C03", a.id, "aviso", `${titulo(a)} (A) no dice ${lista}.`, "§10", "Tramas"));
    }
  }
  return r;
}

/** C04: arco B o C sin bomba de tiempo */
export function c04(m: Modelo): Aviso[] {
  return arcosVivos(m)
    .filter((a) => a.tipo_trama !== "A" && a.tipo_arco !== "personaje" && !a.bomba.trim())
    .map((a) => aviso("C04", a.id, "sugerencia", `${titulo(a)} (${a.tipo_trama}) no tiene bomba de tiempo. En B y C no es obligatoria, pero ayuda.`, "§10", "Tramas"));
}

/** ¿Está la posición dentro de la temporada? */
const enTemporada = (p: Posicion, temporada: string) => p.temporada === temporada;

/** C10: arco de temporada sin cerrar al acabar su temporada */
export function c10(m: Modelo): Aviso[] {
  const r: Aviso[] = [];
  const ix = m.indice();
  for (const a of arcosVivos(m)) {
    if (a.nivel !== "temporada" || !m.temporadas.has(a.temporada)) continue;
    const iT = ix.posTemporada.get(a.temporada);
    const evs = eventosArco(m, a.id);
    const cierraDentro = evs.some((ev) => c.papelEn(ev, a.id) === "cierra" && ix.posEpisodio.get(ev.episodio)!.iT === iT);
    if (cierraDentro) continue;
    if (!evs.length && a.fin.temporada && enTemporada(a.fin, a.temporada)) continue;
    r.push(aviso("C10", a.id, "aviso", `${titulo(a)} es de ${c.codigo(m, a.temporada)} y no se cierra dentro de ella: ninguna escena lo cierra.`, "§12", "Tramas"));
  }
  return r;
}

/** C11: arco olvidado, más de N episodios seguidos sin eventos (D5) */
export function c11(m: Modelo): Aviso[] {
  const r: Aviso[] = [];
  const ix = m.indice();
  const total = ix.episodios.length;
  if (!total) return r;
  const fraccion = m.serie.olvido_fraccion;
  // Los episodios después del último con algún evento aún no están escritos: no cuentan como hueco
  let escrito = -1;
  for (const ev of m.eventos.values()) {
    const p = ix.posEpisodio.get(ev.episodio);
    if (p && vivo(ev)) escrito = Math.max(escrito, p.global);
  }
  for (const a of arcosVivos(m)) {
    const evs = eventosArco(m, a.id);
    if (!evs.length) continue;
    const con = new Set(evs.map((ev) => ix.posEpisodio.get(ev.episodio)!.global));
    const cierres = evs.filter((ev) => c.papelEn(ev, a.id) === "cierra").map((ev) => ix.posEpisodio.get(ev.episodio)!.global);
    const primero = Math.min(...con);
    const fin = cierres.length ? Math.max(...cierres) : Math.min(total - 1, escrito);
    let hueco = 0;
    let desde = -1;
    for (let g = primero + 1; g <= fin + 1; g++) {
      const vacio = g <= fin && !con.has(g);
      if (vacio) {
        if (!hueco) desde = g;
        hueco++;
        continue;
      }
      if (hueco) {
        const epInicio = ix.episodios[desde];
        const temporada = m.episodios.get(epInicio)!.temporada;
        const n = nOlvido(ix.episodiosDe.get(temporada)!.length, fraccion);
        if (hueco > n) {
          const hasta = ix.episodios[desde + hueco - 1];
          r.push(
            aviso(
              "C11",
              a.id,
              "sugerencia",
              `${titulo(a)} pasa ${hueco} episodios seguidos sin aparecer (${c.codigo(m, epInicio)}–${c.codigo(m, hasta)}); a partir de ${n + 1} el público lo olvida.`,
              "§25",
              "Tramas",
            ),
          );
          break;
        }
      }
      hueco = 0;
    }
  }
  return r;
}

/** C12: arco A de serie cerrado antes del último episodio de la serie */
export function c12(m: Modelo): Aviso[] {
  const r: Aviso[] = [];
  const ix = m.indice();
  const ultimo = ix.episodios.length - 1;
  for (const a of arcosVivos(m)) {
    if (a.tipo_trama !== "A" || a.nivel !== "serie") continue;
    const cierres = eventosArco(m, a.id).filter((ev) => c.papelEn(ev, a.id) === "cierra");
    if (!cierres.length) continue;
    const ev = cierres[cierres.length - 1];
    const g = ix.posEpisodio.get(ev.episodio)!.global;
    if (g < ultimo) {
      r.push(
        aviso(
          "C12",
          a.id,
          "aviso",
          `${titulo(a)} (A de serie) se cierra en ${c.codigo(m, ev.episodio)}, antes del último episodio de la serie (${c.codigo(m, ix.episodios[ultimo])}).`,
          "§12",
          "Tramas",
        ),
      );
    }
  }
  return r;
}

/** C13: inicio o fin manual que no coincide con los eventos */
export function c13(m: Modelo): Aviso[] {
  const r: Aviso[] = [];
  const cod = (p: Posicion) => (p.episodio ? c.codigo(m, p.episodio) : c.codigo(m, p.temporada));
  const coincide = (manual: Posicion, real: Posicion) => (manual.episodio ? manual.episodio === real.episodio : manual.temporada === real.temporada);
  for (const a of arcosVivos(m)) {
    const { inicio, fin, inicioCalculado, finCalculado } = c.inicioFin(m, a.id);
    if (inicioCalculado && a.inicio.temporada && inicio && !coincide(a.inicio, inicio)) {
      r.push(aviso("C13", a.id, "aviso", `${titulo(a)}: el inicio puesto a mano (${cod(a.inicio)}) no coincide con la escena que lo abre (${cod(inicio)}).`, "Diseño 4.4", "Tramas", "inicio"));
    }
    if (finCalculado && a.fin.temporada && fin && !coincide(a.fin, fin)) {
      r.push(aviso("C13", a.id, "aviso", `${titulo(a)}: el fin puesto a mano (${cod(a.fin)}) no coincide con la escena que lo cierra (${cod(fin)}).`, "Diseño 4.4", "Tramas", "fin"));
    }
  }
  return r;
}

/** C17: arco de personaje sin qué necesita o sin estado inicial y final en una temporada en marcha */
export function c17(m: Modelo): Aviso[] {
  const r: Aviso[] = [];
  const presentes = new Map(c.temporadasEnOrden(m).map((t) => [t.id, new Set(c.arcosPresentes(m, t.id).map((a) => a.id))]));
  for (const a of arcosVivos(m)) {
    if (a.tipo_arco !== "personaje") continue;
    if (!a.necesita.trim()) r.push(aviso("C17", a.id, "sugerencia", `${titulo(a)} no dice qué necesita: el choque con lo que quiere es su arco.`, "Met. 1.6", "Tramas", "necesita"));
    for (const t of c.temporadasEnOrden(m)) {
      if (t.estado !== "en marcha" || !presentes.get(t.id)!.has(a.id)) continue;
      const e = a.estados.find((x) => x.temporada === t.id);
      if (!e || !e.inicio.trim() || !e.fin.trim()) {
        r.push(aviso("C17", a.id, "sugerencia", `${titulo(a)} no tiene su estado al empezar y al terminar ${c.codigo(m, t.id)}.`, "Plantilla Temporada", "Tramas", t.id));
      }
    }
  }
  return r;
}
