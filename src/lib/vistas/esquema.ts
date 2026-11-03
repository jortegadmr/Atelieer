// Esquema (spec 010, RF-38 a RF-41): la temporada como texto, episodio →
// acto → escena, escrita como en las tarjetas del visor; y como Markdown para
// copiar. Nunca lleva «La verdad» de un secreto: solo usa escenas y episodios.

import * as c from "../modelo/consultas";
import { estadoDe } from "../modelo/estados";
import type { Modelo } from "../modelo/modelo";
import type { Evento } from "../modelo/tipos";
import { textoSeguro } from "../wiki/md";
import { actosDe, NOMBRE_ACTO, ORDEN_ACTOS, type ActoVisor } from "./actos";
import { textoCarga } from "./textos";

export interface EscenaEsquema {
  id: string;
  /** Su puesto en el episodio (o en la bandeja), como en la tarjeta */
  numero: number;
  titulo: string;
  valor: string;
  carga: string;
  aparcada: boolean;
}

export interface ActoEsquema {
  acto: ActoVisor;
  nombre: string;
  escenas: EscenaEsquema[];
}

export interface EpisodioEsquema {
  id: string;
  codigo: string;
  titulo: string;
  actos: ActoEsquema[];
}

export interface Esquema {
  codigo: string;
  titulo: string;
  episodios: EpisodioEsquema[];
  bandeja: EscenaEsquema[];
}

const escena = (ev: Evento, numero: number): EscenaEsquema => ({
  id: ev.id,
  numero,
  titulo: ev.titulo.trim() || "Sin título",
  valor: ev.valor.trim(),
  carga: textoCarga(ev.cambio),
  aparcada: estadoDe(ev) === "aparcado",
});

const fuera = (ev: Evento) => estadoDe(ev) === "descartado";

export function esquema(m: Modelo, temporada: string): Esquema {
  const t = m.temporadas.get(temporada);
  const episodios = c.episodiosDeTemporada(m, temporada).map((ep): EpisodioEsquema => {
    const numero = new Map(c.eventosDeEpisodio(m, ep.id).map((ev, i) => [ev.id, i + 1]));
    const grupos = actosDe(m, ep.id);
    const actos = ORDEN_ACTOS.map((acto) => ({
      acto,
      nombre: NOMBRE_ACTO[acto],
      escenas: grupos[acto].filter((ev) => !fuera(ev)).map((ev) => escena(ev, numero.get(ev.id)!)),
    })).filter((a) => a.escenas.length);
    return { id: ep.id, codigo: c.codigo(m, ep.id), titulo: ep.titulo.trim(), actos };
  });
  const bandeja = c
    .bandeja(m, temporada)
    .map((ev, i) => [ev, i + 1] as const)
    .filter(([ev]) => !fuera(ev))
    .map(([ev, i]) => escena(ev, i));
  return { codigo: c.codigo(m, temporada), titulo: t?.titulo.trim() ?? "", episodios, bandeja };
}

export const estaVacio = (e: Esquema) => !e.episodios.length && !e.bandeja.length;

/** La línea de una escena: «3. Título — valor · + → − (aparcada)» */
export function lineaEscena(e: EscenaEsquema): string {
  return `${e.numero}. ${e.titulo}` + (e.valor ? ` — ${e.valor}` : "") + (e.carga ? ` · ${e.carga}` : "") + (e.aparcada ? " (aparcada)" : "");
}

const cabecera = (codigo: string, titulo: string) => [codigo, titulo].filter(Boolean).map(textoSeguro).join(" · ") || "Sin título";

/** Markdown para copiar (RF-41): títulos para temporada, episodios y actos; lista para escenas */
export function esquemaMarkdown(e: Esquema): string {
  const item = (x: EscenaEsquema) =>
    `- ${x.numero}\\. ${textoSeguro(x.titulo)}` +
    (x.valor ? ` — ${textoSeguro(x.valor)}` : "") +
    (x.carga ? ` · ${x.carga}` : "") +
    (x.aparcada ? " (aparcada)" : "");
  const l: string[] = [`# ${cabecera(e.codigo, e.titulo)}`];
  for (const ep of e.episodios) {
    l.push("", `## ${cabecera(ep.codigo, ep.titulo)}`);
    for (const a of ep.actos) l.push("", `### ${a.nombre}`, ...a.escenas.map(item));
  }
  if (e.bandeja.length) l.push("", "## Bandeja", ...e.bandeja.map(item));
  return l.join("\n") + "\n";
}
