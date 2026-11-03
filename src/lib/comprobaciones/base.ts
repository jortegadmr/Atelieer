// Ayudas comunes de las comprobaciones (plan 3.6). "Antes" y "después" se
// miden por la posición en emisión: temporada, episodio y orden del evento.
// Una pista o revelación que apunta solo a un episodio cuenta como su comienzo.

import * as c from "../modelo/consultas";
import { cuenta } from "../modelo/estados";
import type { Modelo } from "../modelo/modelo";
import type { Arco, Evento } from "../modelo/tipos";
import type { Aviso, Clase, Grupo } from "./tipos";

/** `sobre`: de qué habla, si la misma comprobación puede salir varias veces en la misma pieza (spec 005) */
export function aviso(id: string, pieza: string, clase: Clase, mensaje: string, fuente: string, grupo: Grupo, sobre?: string): Aviso {
  return sobre === undefined ? { id, pieza, clase, mensaje, fuente, grupo } : { id, pieza, clase, mensaje, fuente, grupo, sobre };
}

/** Cuenta en las comprobaciones: ni descartada ni aparcada (spec 001, RF-15 a RF-17) */
export const vivo = (p: { madurez?: string; madurez_mesa?: string }) => cuenta(p);

/** [episodio en toda la serie, orden]; null si no está colocado */
export type P = [number, number];

export function pEvento(m: Modelo, ev: Evento): P | null {
  const p = m.indice().posEpisodio.get(ev.episodio);
  return p ? [p.global, ev.orden] : null;
}

export function pEpisodio(m: Modelo, episodio: string): P | null {
  const p = m.indice().posEpisodio.get(episodio);
  return p ? [p.global, -Infinity] : null;
}

/** Posición de una pista o revelación: su evento si lo tiene; si no, el comienzo de su episodio */
export function pPunto(m: Modelo, episodio: string, evento: string): P | null {
  const ev = evento ? m.eventos.get(evento) : undefined;
  if (ev) {
    const p = pEvento(m, ev);
    if (p) return p;
  }
  return episodio ? pEpisodio(m, episodio) : null;
}

export const cmp = (a: P, b: P) => a[0] - b[0] || (a[1] === b[1] ? 0 : a[1] < b[1] ? -1 : 1);

export const signo = (v: string) => (v === "+" ? "+" : "−");
export const titulo = (p: { titulo: string }) => p.titulo.trim() || "Sin título";

/** Eventos vivos y colocados de un arco */
export function eventosArco(m: Modelo, arcoId: string): Evento[] {
  return c.eventosColocadosDeArco(m, arcoId).filter(vivo);
}

/** Protagonistas de un arco como conjunto de nombres limpios */
export function protagonistas(a: Arco): Set<string> {
  const lista = a.tipo_arco === "personaje" ? [a.personaje] : a.protagonistas;
  return new Set(lista.map((x) => x.replace(/^\s*\[\[|\]\]\s*$/g, "").trim().toLowerCase()).filter(Boolean));
}

/** La principal de una temporada (D7), si está elegida y existe */
export function principalDe(m: Modelo, temporadaId: string): Arco | undefined {
  const id = m.temporadas.get(temporadaId)?.principal;
  const a = id ? m.arcos.get(id) : undefined;
  return a && vivo(a) ? a : undefined;
}

/**
 * Subtrama (plan 3.6, M9): arco B o C de trama o relación que no es la
 * principal, ni su arco padre, ni uno de sus tramos.
 */
export function esSubtrama(a: Arco, principal?: Arco): boolean {
  if (!vivo(a) || a.tipo_trama === "A" || a.tipo_arco === "personaje") return false;
  if (!principal) return true;
  return a.id !== principal.id && a.id !== principal.tramo_de && a.tramo_de !== principal.id;
}

/** Eventos vivos colocados de una temporada */
export function eventosTemporada(m: Modelo, temporadaId: string): Evento[] {
  return c
    .episodiosDeTemporada(m, temporadaId)
    .flatMap((e) => c.eventosDeEpisodio(m, e.id))
    .filter(vivo);
}
