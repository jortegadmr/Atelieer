// Quién sabe qué (spec 010, RF-31 a RF-34): por secreto y episodio de la
// temporada, lo que sabe el público al acabar el episodio y qué personajes lo
// saben. Las pistas cuentan por toda la serie, en orden de emisión.

import { fechasDe } from "../modelo/conocen-desde";
import * as c from "../modelo/consultas";
import { estadoDe } from "../modelo/estados";
import type { Modelo } from "../modelo/modelo";
import type { Episodio, Secreto } from "../modelo/tipos";
import { claveLimpia, nombreLimpio } from "../wiki/md";
import { alias, clavePersonaje, personajesDeSerie, type FuentePersonajes } from "./lente";
import { escenaViva } from "./presencia";

export type Publico = "revelado" | "pistas" | "falsas" | "nada";

export interface CasillaSabe {
  publico: Publico;
  /** Pistas y pistas falsas acumuladas hasta este episodio */
  pistas: number;
  falsas: number;
  /** Una pista, pista falsa o la revelación cae en este episodio */
  nuevo: boolean;
  texto: string;
  /** Nombres de los que lo saben en este episodio, y de ellos los que se enteran en él */
  saben: string[];
  seEnteran: string[];
}

export interface FilaSabe {
  secreto: Secreto;
  casillas: CasillaSabe[];
  /** «Lo conocen sin fecha» (RF-34): sin fecha o con una que no es un episodio */
  sinFecha: string[];
  /** Con fecha en un episodio sin temporada: van aparte para que nadie desaparezca */
  fuera: { nombre: string; codigo: string }[];
}

export interface QuienSabe {
  episodios: Episodio[];
  filas: FilaSabe[];
}

type Pos = c.Pos;
const antesOIgual = (a: Pos | null, b: Pos) => !!a && c.compararPos(a, b) <= 0;
const igual = (a: Pos | null, b: Pos) => !!a && c.compararPos(a, b) === 0;

/** Episodio en que el público ve una pista o la revelación; null si no cuenta (definiciones) */
function posDe(m: Modelo, x: { episodio: string; evento: string }): Pos | null {
  const ev = x.evento ? m.eventos.get(x.evento) : undefined;
  if (ev && (!escenaViva(ev) || !ev.episodio)) return null;
  const ep = x.episodio || ev?.episodio || "";
  return ep ? c.posicionEpisodio(m, ep) : null;
}

export function textoPublico(p: Pick<CasillaSabe, "publico" | "pistas" | "falsas">): string {
  if (p.publico === "revelado") return "Revelado";
  if (p.publico === "pistas") return `Pistas: ${p.pistas}` + (p.falsas ? ` · Falsas: ${p.falsas}` : "");
  if (p.publico === "falsas") return `Falsas: ${p.falsas}`;
  return "No lo sabe";
}

export function quienSabe(m: Modelo, wiki: FuentePersonajes | null, temporada: string): QuienSabe {
  const episodios = c.episodiosDeTemporada(m, temporada);
  const posEp = episodios.map((e) => c.posicionEpisodio(m, e.id)!);
  const al = alias(wiki);
  const nombres = personajesDeSerie(m, wiki);
  const nombre = (k: string, escrito: string) => nombres.get(k)?.nombre ?? nombreLimpio(escrito);
  const filas: (FilaSabe & { rev: Pos | null })[] = [];
  for (const s of m.secretos.values()) {
    if (estadoDe(s) === "descartado") continue;
    const pistas = s.pistas.map((x) => posDe(m, x));
    const falsas = s.falsas.map((x) => posDe(m, x));
    const rev = posDe(m, s.revelado_en);
    // Personajes por clave (un alias es el mismo): la fecha más temprana
    const fechas = fechasDe(s);
    const quien = new Map<string, { nombre: string; pos: Pos | null; codigo: string; conFecha: boolean }>();
    for (const escrito of s.conocen) {
      const k = clavePersonaje(al, escrito);
      if (!k) continue;
      const f = fechas.get(claveLimpia(escrito));
      const ep = f && "episodio" in f && m.episodios.has(f.episodio) ? f.episodio : "";
      const pos = ep ? c.posicionEpisodio(m, ep) : null;
      const prev = quien.get(k);
      const mejor = !prev || (ep && (!prev.conFecha || (pos && (!prev.pos || c.compararPos(pos, prev.pos) < 0))));
      if (mejor) quien.set(k, { nombre: nombre(k, escrito), pos, codigo: ep ? c.codigo(m, ep) : "", conFecha: !!ep });
    }
    const casillas = posEp.map((pe): CasillaSabe => {
      const n = pistas.filter((p) => antesOIgual(p, pe)).length;
      const mm = falsas.filter((p) => antesOIgual(p, pe)).length;
      const publico: Publico = antesOIgual(rev, pe) ? "revelado" : n ? "pistas" : mm ? "falsas" : "nada";
      const saben: string[] = [];
      const seEnteran: string[] = [];
      for (const q of quien.values()) {
        if (!antesOIgual(q.pos, pe)) continue;
        saben.push(q.nombre);
        if (igual(q.pos, pe)) seEnteran.push(q.nombre);
      }
      return {
        publico,
        pistas: n,
        falsas: mm,
        // Tras la revelación, una pista ya no cambia lo que sabe el público
        nuevo: !(rev && c.compararPos(rev, pe) < 0) && [...pistas, ...falsas, rev].some((p) => igual(p, pe)),
        texto: textoPublico({ publico, pistas: n, falsas: mm }),
        saben,
        seEnteran,
      };
    });
    const sinFecha = [...quien.values()].filter((q) => !q.conFecha).map((q) => q.nombre);
    const fuera = [...quien.values()].filter((q) => q.conFecha && !q.pos).map((q) => ({ nombre: q.nombre, codigo: q.codigo }));
    filas.push({ secreto: s, casillas, sinFecha, fuera, rev });
  }
  const titulo = (s: Secreto) => s.titulo.trim() || "Sin título";
  filas.sort((a, b) => {
    if (a.rev && b.rev) return c.compararPos(a.rev, b.rev) || titulo(a.secreto).localeCompare(titulo(b.secreto), "es");
    if (a.rev || b.rev) return a.rev ? -1 : 1;
    return titulo(a.secreto).localeCompare(titulo(b.secreto), "es");
  });
  return { episodios, filas: filas.map(({ rev: _, ...f }) => f) };
}
