// Consultas que usan las vistas y las comprobaciones (plan 3.6). Son
// funciones sobre el modelo; no cambian nada.

import type { Modelo } from "./modelo";
import type { Arco, Episodio, Evento, Posicion, Temporada } from "./tipos";

/**
 * Posición en el orden de emisión: [temporada, episodio, orden].
 * Si solo apunta a una temporada, el episodio es -1; si no llega al evento,
 * el orden es -Infinity: así cuenta como el comienzo de su episodio o temporada.
 */
export type Pos = [number, number, number];

export function compararPos(a: Pos, b: Pos): number {
  return a[0] - b[0] || a[1] - b[1] || (a[2] === b[2] ? 0 : a[2] < b[2] ? -1 : 1);
}

export function codigo(m: Modelo, id: string): string {
  return m.indice().codigos.get(id) ?? "";
}

export function temporadasEnOrden(m: Modelo): Temporada[] {
  return m.indice().temporadas.map((id) => m.temporadas.get(id)!);
}

export function episodiosDeTemporada(m: Modelo, temporadaId: string): Episodio[] {
  return (m.indice().episodiosDe.get(temporadaId) ?? []).map((id) => m.episodios.get(id)!);
}

/** Todos los episodios de la serie, en orden de emisión */
export function episodiosEnOrden(m: Modelo): Episodio[] {
  return m.indice().episodios.map((id) => m.episodios.get(id)!);
}

export function eventosDeEpisodio(m: Modelo, episodioId: string): Evento[] {
  return m.indice().porEpisodio.get(episodioId) ?? [];
}

/** Eventos de la temporada que no están en ningún episodio */
export function bandeja(m: Modelo, temporadaId: string): Evento[] {
  return m.indice().bandeja.get(temporadaId) ?? [];
}

/** Eventos de un arco: los colocados por orden de emisión y después los de la bandeja */
export function eventosDeArco(m: Modelo, arcoId: string): Evento[] {
  return m.indice().porArco.get(arcoId) ?? [];
}

export function estaColocado(m: Modelo, ev: Evento): boolean {
  return ev.episodio !== "" && m.indice().posEpisodio.has(ev.episodio);
}

export function eventosColocadosDeArco(m: Modelo, arcoId: string): Evento[] {
  return eventosDeArco(m, arcoId).filter((ev) => estaColocado(m, ev));
}

/** Arcos de temporada que son tramos de este arco */
export function tramos(m: Modelo, arcoId: string): Arco[] {
  return m.indice().tramos.get(arcoId) ?? [];
}

export function papelEn(ev: Evento, arcoId: string) {
  return ev.arcos.find((a) => a.arco === arcoId)?.papel;
}

/** Posición de un evento; null si está en la bandeja */
export function posicionEvento(m: Modelo, ev: Evento): Pos | null {
  const p = m.indice().posEpisodio.get(ev.episodio);
  return p ? [p.iT, p.iE, ev.orden] : null;
}

/** Posición de una temporada con episodio opcional; null si no apunta a nada que exista */
export function posicionDe(m: Modelo, pos: Pick<Posicion, "temporada" | "episodio">): Pos | null {
  const ix = m.indice();
  if (pos.episodio) {
    const p = ix.posEpisodio.get(pos.episodio);
    if (p) return [p.iT, p.iE, -Infinity];
  }
  const t = ix.posTemporada.get(pos.temporada);
  return t === undefined ? null : [t, -1, -Infinity];
}

/** Posición de un episodio suelto (pistas y revelaciones) */
export function posicionEpisodio(m: Modelo, episodioId: string): Pos | null {
  const p = m.indice().posEpisodio.get(episodioId);
  return p ? [p.iT, p.iE, -Infinity] : null;
}

export interface InicioFin {
  inicio: Posicion | null;
  fin: Posicion | null;
  /** true si sale de un evento que lo abre o lo cierra; false si es el manual */
  inicioCalculado: boolean;
  finCalculado: boolean;
  inicioEvento?: Evento;
  finEvento?: Evento;
}

/**
 * Inicio y fin de un arco (spec 4.4): el primer evento que lo abre y el último
 * que lo cierra. Sin ellos, valen los manuales.
 */
export function inicioFin(m: Modelo, arcoId: string): InicioFin {
  const arco = m.arcos.get(arcoId);
  const colocados = eventosColocadosDeArco(m, arcoId);
  const abre = colocados.find((ev) => papelEn(ev, arcoId) === "abre");
  const cierra = [...colocados].reverse().find((ev) => papelEn(ev, arcoId) === "cierra");
  const enEvento = (ev: Evento): Posicion => ({ temporada: m.episodios.get(ev.episodio)!.temporada, episodio: ev.episodio });
  const manual = (p: Posicion | undefined) => (p && p.temporada ? { temporada: p.temporada, episodio: p.episodio } : null);
  return {
    inicio: abre ? enEvento(abre) : manual(arco?.inicio),
    fin: cierra ? enEvento(cierra) : manual(arco?.fin),
    inicioCalculado: !!abre,
    finCalculado: !!cierra,
    inicioEvento: abre,
    finEvento: cierra,
  };
}

/**
 * Arcos presentes en una temporada (plan 3.6): tienen eventos colocados en
 * ella, o su recorrido (inicio y fin, calculados o manuales) la cubre, o son
 * de nivel temporada de esa temporada. Un arco sin fin sigue hasta el final de
 * la serie (spec 4.4), salvo los de temporada, que no pasan de la suya.
 */
export function arcosPresentes(m: Modelo, temporadaId: string): Arco[] {
  const ix = m.indice();
  const iT = ix.posTemporada.get(temporadaId);
  if (iT === undefined) return [];
  const ultima = ix.temporadas.length - 1;
  return [...m.arcos.values()].filter((a) => {
    if (a.nivel === "temporada" && a.temporada === temporadaId) return true;
    if (eventosColocadosDeArco(m, a.id).some((ev) => ix.posEpisodio.get(ev.episodio)!.iT === iT)) return true;
    const { inicio, fin } = inicioFin(m, a.id);
    if (!inicio) return false;
    const iIni = ix.posTemporada.get(inicio.temporada);
    if (iIni === undefined) return false;
    let iFin = fin ? (ix.posTemporada.get(fin.temporada) ?? ultima) : ultima;
    if (a.nivel === "temporada") {
      const propia = ix.posTemporada.get(a.temporada);
      if (propia !== undefined) iFin = Math.min(iFin, propia);
    }
    return iIni <= iT && iT <= iFin;
  });
}

const ORDEN_TIPO_ARCO = { trama: 0, personaje: 1, relacion: 2 } as const;

/**
 * Arcos en el orden de las listas: el que guarda la serie (se cambia
 * arrastrando, T3.3) y, para los que no están en él, A, B y C; dentro, trama,
 * personaje y relación; y después por título.
 */
export function arcosEnOrden(m: Modelo): Arco[] {
  const lugar = new Map(m.serie.arcos.map((id, i) => [id, i]));
  return [...m.arcos.values()].sort(
    (a, b) =>
      (lugar.get(a.id) ?? Infinity) - (lugar.get(b.id) ?? Infinity) ||
      a.tipo_trama.localeCompare(b.tipo_trama) ||
      ORDEN_TIPO_ARCO[a.tipo_arco] - ORDEN_TIPO_ARCO[b.tipo_arco] ||
      a.titulo.localeCompare(b.titulo, "es"),
  );
}
