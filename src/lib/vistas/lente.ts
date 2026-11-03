// La lente (spec 010, RF-1 a RF-11): un personaje, un arco o un secreto, y lo
// que está relacionado con él. Todo lo que habla de personajes usa la misma
// clave (`clavePersonaje`): un alias de la ficha es el mismo personaje.

import * as c from "../modelo/consultas";
import { estadoDe } from "../modelo/estados";
import type { Modelo } from "../modelo/modelo";
import type { Evento } from "../modelo/tipos";
import type { Ficha, TipoFicha } from "../wiki/fichas";
import { claveLimpia, nombreLimpio } from "../wiki/md";
import { ordenEmision } from "./historia";
import type { Nivel } from "./visor";

export type Lente = { tipo: "personaje"; clave: string; nombre: string } | { tipo: "arco"; id: string } | { tipo: "secreto"; id: string };

/** Lo que está relacionado con la lente, por id (casillas de la rejilla: `casilla(arco, episodio)`) */
export interface Relacion {
  escenas: Set<string>;
  episodios: Set<string>;
  arcos: Set<string>;
  secretos: Set<string>;
  casillas: Set<string>;
}

/** Lo que la lente necesita de la wiki: sus fichas de personaje */
export type FuentePersonajes = { de(tipo: TipoFicha): Ficha[] };

export const casilla = (arco: string, episodio: string) => `${arco}\u0000${episodio}`;

const vivo = (p: { madurez: string; madurez_mesa: string }) => estadoDe(p as Parameters<typeof estadoDe>[0]) !== "descartado";

/** Clave de cada nombre y alias de una ficha de personaje → la clave del nombre de su ficha */
export function alias(wiki: FuentePersonajes | null): Map<string, string> {
  const r = new Map<string, string>();
  for (const f of wiki?.de("personaje") ?? []) {
    const k = claveLimpia(f.nombre);
    if (!k) continue;
    for (const n of [f.nombre, ...f.aliases]) {
      const a = claveLimpia(n);
      if (a && !r.has(a)) r.set(a, k);
    }
  }
  return r;
}

/** La clave de un personaje escrito de cualquier forma («Telmo», «[[Telmo]]», «telmo» o un alias) */
export function clavePersonaje(al: ReadonlyMap<string, string>, texto: string): string {
  const k = claveLimpia(texto);
  return al.get(k) ?? k;
}

export interface Personaje {
  nombre: string;
  /** Formas escritas, en el orden en que aparecen */
  formas: string[];
}

/**
 * Personajes de la serie: los de escenas no descartadas (en orden de emisión),
 * los de «Lo conocen» de secretos no descartados y los que tienen ficha. El
 * nombre que se enseña es el de la ficha; si no, la primera forma escrita.
 */
export function personajesDeSerie(m: Modelo, wiki: FuentePersonajes | null): Map<string, Personaje> {
  const al = alias(wiki);
  const r = new Map<string, Personaje>();
  const anotar = (texto: string) => {
    const n = nombreLimpio(texto);
    const k = clavePersonaje(al, texto);
    if (!k || !n) return;
    const p = r.get(k);
    if (!p) r.set(k, { nombre: n, formas: [n] });
    else if (!p.formas.includes(n)) p.formas.push(n);
  };
  const orden = ordenEmision(m);
  for (const ev of [...m.eventos.values()].filter(vivo).sort(orden)) for (const x of ev.personajes) anotar(x);
  for (const s of m.secretos.values()) if (vivo(s)) for (const x of s.conocen) anotar(x);
  for (const f of wiki?.de("personaje") ?? []) {
    const k = claveLimpia(f.nombre);
    if (!k) continue;
    const p = r.get(k);
    if (p) p.nombre = f.nombre.trim();
    else r.set(k, { nombre: f.nombre.trim(), formas: [] });
  }
  return r;
}

export interface Objetivo {
  lente: Lente;
  nombre: string;
  tipo: "personaje" | "arco" | "secreto";
}

/** Lo que se puede enfocar (RF-1): personajes, arcos y secretos no descartados */
export function objetivosLente(m: Modelo, wiki: FuentePersonajes | null): Objetivo[] {
  const r: Objetivo[] = [];
  for (const [k, p] of personajesDeSerie(m, wiki)) r.push({ lente: { tipo: "personaje", clave: k, nombre: p.nombre }, nombre: p.nombre, tipo: "personaje" });
  for (const a of c.arcosEnOrden(m)) if (vivo(a)) r.push({ lente: { tipo: "arco", id: a.id }, nombre: a.titulo.trim() || "Sin título", tipo: "arco" });
  for (const s of m.secretos.values()) if (vivo(s)) r.push({ lente: { tipo: "secreto", id: s.id }, nombre: s.titulo.trim() || "Sin título", tipo: "secreto" });
  return r;
}

/** Lo que está relacionado con la lente (definiciones de la spec 010) */
export function relacion(m: Modelo, al: ReadonlyMap<string, string>, lente: Lente): Relacion {
  const r: Relacion = { escenas: new Set(), episodios: new Set(), arcos: new Set(), secretos: new Set(), casillas: new Set() };
  const escena = (ev: Evento | undefined) => {
    if (!ev) return;
    r.escenas.add(ev.id);
    if (ev.episodio) r.episodios.add(ev.episodio);
  };
  if (lente.tipo === "personaje") {
    for (const ev of m.eventos.values()) if (ev.personajes.some((x) => clavePersonaje(al, x) === lente.clave)) escena(ev);
    for (const s of m.secretos.values()) if (s.conocen.some((x) => clavePersonaje(al, x) === lente.clave)) r.secretos.add(s.id);
  } else if (lente.tipo === "arco") {
    r.arcos.add(lente.id);
    for (const t of c.tramos(m, lente.id)) r.arcos.add(t.id);
    for (const ev of m.eventos.values()) if (ev.arcos.some((x) => r.arcos.has(x.arco))) escena(ev);
  } else {
    const s = m.secretos.get(lente.id);
    if (s) {
      r.secretos.add(s.id);
      for (const x of [...s.pistas, ...s.falsas, s.revelado_en]) {
        // Escena borrada: cuenta su episodio marcado, como en Quién sabe qué
        const ev = x.evento ? m.eventos.get(x.evento) : undefined;
        if (ev) escena(ev);
        else if (x.episodio) r.episodios.add(x.episodio);
      }
    }
  }
  // Rejilla: una casilla está relacionada si alguna de sus escenas lo está
  for (const id of r.escenas) {
    const ev = m.eventos.get(id)!;
    if (ev.episodio) for (const x of ev.arcos) r.casillas.add(casilla(x.arco, ev.episodio));
  }
  return r;
}

/** El objetivo existe en lo que se ve o, con una variante abierta, en el otro lado (RF-10) */
export function existeLente(mVisto: Modelo, mOtro: Modelo | null, wiki: FuentePersonajes | null, lente: Lente): boolean {
  const en = (m: Modelo) => {
    if (lente.tipo === "personaje") return personajesDeSerie(m, wiki).has(lente.clave);
    const p = lente.tipo === "arco" ? m.arcos.get(lente.id) : m.secretos.get(lente.id);
    return !!p && vivo(p);
  };
  return en(mVisto) || (!!mOtro && en(mOtro));
}

/** El nombre de la lente para la pastilla y los avisos */
export function nombreLente(m: Modelo, lente: Lente): string {
  if (lente.tipo === "personaje") return lente.nombre;
  const p = lente.tipo === "arco" ? m.arcos.get(lente.id) : m.secretos.get(lente.id);
  return p?.titulo.trim() || "Sin título";
}

/** Nada de lo que se ve está relacionado con la lente (RF-11) */
export function sinNadaQueVer(rel: Relacion, visibles: Iterable<string>): boolean {
  for (const id of visibles) if (rel.escenas.has(id) || rel.episodios.has(id) || rel.arcos.has(id) || rel.secretos.has(id)) return false;
  return true;
}

/** Lo que se ve en un nivel del visor (RF-11): episodios y bandeja en la serie y la temporada; escenas en el episodio */
export function visiblesDeNivel(m: Modelo, nivel: Nivel): string[] {
  if (nivel.tipo === "episodio") return c.eventosDeEpisodio(m, nivel.episodio).map((e) => e.id);
  const ts = nivel.tipo === "serie" ? c.temporadasEnOrden(m).map((t) => t.id) : [nivel.temporada];
  return ts.flatMap((t) => [...c.episodiosDeTemporada(m, t).map((e) => e.id), ...c.bandeja(m, t).map((e) => e.id)]);
}

/** «Telmo no sale en esta temporada» (RF-11) */
export function textoSinNada(nombre: string, nivel: Nivel): string {
  const donde = nivel.tipo === "serie" ? "en la serie" : nivel.tipo === "temporada" ? "en esta temporada" : "en este episodio";
  return `${nombre} no sale ${donde}`;
}

/** Si una columna del visor queda fuera de la lente (RF-4): la temporada, si
 * ninguno de sus episodios ni de las escenas de su bandeja está relacionado */
export function fueraDeLente(m: Modelo, rel: Relacion, tipo: "temporada" | "episodio" | "evento", id: string): boolean {
  if (tipo === "evento") return !rel.escenas.has(id);
  if (tipo === "episodio") return !rel.episodios.has(id);
  return !c.episodiosDeTemporada(m, id).some((e) => rel.episodios.has(e.id)) && !c.bandeja(m, id).some((e) => rel.escenas.has(e.id));
}
