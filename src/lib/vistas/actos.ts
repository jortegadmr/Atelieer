// El episodio por actos (spec 003): cada escena (evento de la v1) en su acto,
// y cómo se mueve o se crea una dejando el orden del episodio siguiendo a los
// actos. Funciones puras sobre el modelo; sin campos nuevos en disco.

import * as c from "../modelo/consultas";
import type { Cambio, Modelo } from "../modelo/modelo";
import { crearEvento } from "../modelo/operaciones";
import type { Episodio, Evento, Pieza } from "../modelo/tipos";
import type { Acto } from "../modelo/vocabulario";

/** Acto en el visor: "" es «Sin acto» (también un acto que la app no conoce) */
export type ActoVisor = Acto | "";

/** Teaser, Inicio, Desarrollo, Desenlace y, al final, Sin acto (RF-4) */
export const ORDEN_ACTOS: readonly ActoVisor[] = ["teaser", "1", "2", "3", ""];

export const NOMBRE_ACTO: Record<ActoVisor, string> = { teaser: "Teaser", "1": "Inicio", "2": "Desarrollo", "3": "Desenlace", "": "Sin acto" };

export const AVISO_ESCENA_CANON = "La escena es canon: desbloquéala para moverla";
export const AVISO_EPISODIO_CANON = "El episodio es canon: desbloquéalo para cambiar sus escenas";

/** Lo escrito en el episodio para ese acto (RF-9) */
export function resumenDeActo(ep: Episodio, acto: ActoVisor): string {
  const campo = ({ teaser: "teaser", "1": "inicio", "2": "desarrollo", "3": "desenlace" } as const)[acto as Acto];
  return campo ? ep.actos[campo].trim() : "";
}

const vacios = (): Record<ActoVisor, Evento[]> => ({ teaser: [], "1": [], "2": [], "3": [], "": [] });

/** Cada escena del episodio en su acto, en el orden del episodio */
export function actosDe(m: Modelo, ep: string): Record<ActoVisor, Evento[]> {
  const g = vacios();
  for (const e of c.eventosDeEpisodio(m, ep)) (g[e.acto] ?? g[""]).push(e);
  return g;
}

/**
 * Numera el episodio entero por actos (RF-5) con `ev` en `puesto` de `acto`,
 * y devuelve las piezas que cambian (la escena, con su acto, episodio y
 * temporada nuevos; las demás, solo si cambia su número).
 */
function renumerar(m: Modelo, ev: Evento, ep: string, acto: ActoVisor, puesto?: number): Evento[] {
  const temporada = m.episodios.get(ep)!.temporada;
  const grupos = vacios();
  for (const [k, l] of Object.entries(actosDe(m, ep)) as [ActoVisor, Evento[]][]) grupos[k] = l.filter((e) => e.id !== ev.id);
  const fila = grupos[acto];
  fila.splice(Math.max(0, Math.min(puesto ?? fila.length, fila.length)), 0, ev);
  const guardar: Evento[] = [];
  ORDEN_ACTOS.flatMap((a) => grupos[a]).forEach((e, i) => {
    const orden = i + 1;
    const esta = e.id === ev.id;
    if (e.orden === orden && (!esta || (e.acto === acto && e.episodio === ep && e.temporada === temporada && m.eventos.has(e.id)))) return;
    const n = structuredClone(e);
    n.orden = orden;
    if (esta) Object.assign(n, { acto, episodio: ep, temporada });
    guardar.push(n);
  });
  return guardar;
}

/**
 * Pone la escena en `puesto` de `acto` del episodio (por defecto, al final),
 * venga de donde venga (de su acto, de otro, de otro episodio o de la bandeja).
 * Soltarla en su sitio no cambia nada (RF-26), aunque el orden esté cruzado.
 * Sacarla de otro episodio no renumera el de origen (como en la v1).
 */
export function colocarEscena(m: Modelo, id: string, ep: string, acto: ActoVisor, puesto?: number): Cambio {
  const ev = m.eventos.get(id);
  if (!ev || !m.episodios.has(ep)) return { guardar: [], borrar: [] };
  if (ev.episodio === ep && ev.acto === acto) {
    const actual = actosDe(m, ep)[acto].findIndex((e) => e.id === id);
    const largo = actosDe(m, ep)[acto].length - 1;
    if (Math.max(0, Math.min(puesto ?? largo, largo)) === actual) return { guardar: [], borrar: [] };
  }
  const guardar: Pieza[] = renumerar(m, ev, ep, acto, puesto);
  return guardar.length ? { guardar, borrar: [], mueve: id } : { guardar: [], borrar: [] };
}

/**
 * Escena nueva al final de su acto en el episodio, en estado idea (RF-37).
 * Las ideas de Ctrl I no pasan por aquí: `crearEvento`, sin reordenar (RF-38).
 */
export function crearEscena(m: Modelo, ep: string, acto: ActoVisor, datos: Partial<Evento> = {}): { pieza: Evento; cambio: Cambio } {
  const temporada = m.episodios.get(ep)?.temporada ?? datos.temporada ?? "";
  const { pieza } = crearEvento(m, { ...datos, episodio: ep, temporada, acto });
  if (!m.episodios.has(ep)) return { pieza, cambio: { guardar: [pieza], borrar: [] } };
  // La nueva siempre va en `guardar` (aún no está en el modelo)
  const guardar = renumerar(m, pieza, ep, acto);
  return { pieza: guardar.find((p) => p.id === pieza.id)!, cambio: { guardar, borrar: [] } };
}

export type Tecla = "arriba" | "abajo" | "izquierda" | "derecha";

/**
 * Adónde va la escena con Alt + flecha (RF-18 a RF-20): un puesto arriba o
 * abajo en su acto, o al final del acto de al lado entre Teaser y Desenlace;
 * desde Sin acto, a la izquierda, al final de Desenlace. null en los bordes.
 */
export function pasoTeclado(m: Modelo, id: string, tecla: Tecla): { episodio: string; acto: ActoVisor; puesto?: number } | null {
  const ev = m.eventos.get(id);
  if (!ev || !ev.episodio || !m.episodios.has(ev.episodio)) return null;
  const acto: ActoVisor = ORDEN_ACTOS.includes(ev.acto) ? ev.acto : "";
  const fila = actosDe(m, ev.episodio)[acto];
  const i = fila.findIndex((e) => e.id === id);
  if (tecla === "arriba") return i > 0 ? { episodio: ev.episodio, acto, puesto: i - 1 } : null;
  if (tecla === "abajo") return i < fila.length - 1 ? { episodio: ev.episodio, acto, puesto: i + 1 } : null;
  if (acto === "") return tecla === "izquierda" ? { episodio: ev.episodio, acto: "3" } : null;
  const j = ORDEN_ACTOS.indexOf(acto) + (tecla === "izquierda" ? -1 : 1);
  return j >= 0 && j <= 3 ? { episodio: ev.episodio, acto: ORDEN_ACTOS[j] } : null;
}

/** Por qué no se puede mover la escena a ese episodio (RF-23, RF-33); null si se puede */
export function porQueNoSeMueve(m: Modelo, id: string, destino: string, bloqueada: (id: string) => boolean): string | null {
  const ev = m.eventos.get(id);
  if (!ev) return null;
  if (bloqueada(id)) return AVISO_ESCENA_CANON;
  if ((ev.episodio && bloqueada(ev.episodio)) || (destino && bloqueada(destino))) return AVISO_EPISODIO_CANON;
  return null;
}

export interface TramoCurva {
  id: string;
  numero: number;
  desde: "+" | "-" | null;
  hasta: "+" | "-" | null;
  /** Empieza y acaba igual (RF-11, RF-16) */
  igual: boolean;
}

/** Un tramo por escena, en el orden del episodio; sin uno de los dos valores, hueco (RF-16) */
export function curva(escenas: Evento[]): TramoCurva[] {
  return escenas.map((e, i) => {
    const [desde, hasta] = e.cambio;
    return { id: e.id, numero: i + 1, desde: desde || null, hasta: hasta || null, igual: !!desde && desde === hasta };
  });
}

/** Dónde ha quedado la escena: «Escena 4 · Desarrollo, 2.ª» (RF-22) */
export function anuncio(m: Modelo, id: string): string {
  const ev = m.eventos.get(id);
  if (!ev) return "";
  if (!ev.episodio || !m.episodios.has(ev.episodio)) return "Escena en la bandeja";
  const numero = c.eventosDeEpisodio(m, ev.episodio).findIndex((e) => e.id === id) + 1;
  const acto: ActoVisor = ORDEN_ACTOS.includes(ev.acto) ? ev.acto : "";
  const puesto = actosDe(m, ev.episodio)[acto].findIndex((e) => e.id === id) + 1;
  return `Escena ${numero} · ${NOMBRE_ACTO[acto]}, ${puesto}.ª`;
}

/**
 * Puesto en el que cae la tarjeta al soltarla: cuántas tarjetas del acto
 * (sin la arrastrada) tienen su mitad por encima del puntero (RF-17).
 */
export function puestoAlSoltar(mitades: number[], y: number): number {
  return mitades.filter((m) => m < y).length;
}
