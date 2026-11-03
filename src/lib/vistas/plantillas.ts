// Plantillas en la rejilla y en el panel (spec 011, RF-27, RF-33, RF-34,
// RF-37 a RF-40): en qué episodios cae cada momento, qué franjas lleva cada
// columna y qué momentos están atados a un episodio, con el estado de su escena.

import * as c from "../modelo/consultas";
import { estadoDe } from "../modelo/estados";
import type { Modelo } from "../modelo/modelo";
import { momento, plantilla, type DefMomento, type IdPlantilla, type Sitio } from "../modelo/plantillas";
import type { Temporada } from "../modelo/tipos";

/** Milésimas enteras: los sitios tienen como mucho un decimal (12,5 %) */
const milesimas = (p: number) => Math.round(p * 10);

/** Episodios de un sitio con N episodios en la temporada, [desde, hasta] de 1 a N (RF-27) */
export function enEpisodios(sitio: Sitio, n: number): [number, number] {
  if ("punto" in sitio) {
    const e = Math.max(1, Math.ceil((milesimas(sitio.punto) * n) / 1000));
    return [e, e];
  }
  const [a, b] = sitio.tramo;
  const desde = Math.min(n, Math.floor((milesimas(a) * n) / 1000) + 1);
  return [desde, Math.max(desde, Math.ceil((milesimas(b) * n) / 1000))];
}

export const codigoEpisodio = (n: number) => `E${String(n).padStart(2, "0")}`;

const porcentaje = (p: number) => String(p).replace(".", ",");
/** El sitio previsto, como lo lee el autor: «50 %», «10-15 %», «12,5-25 %» */
export const textoSitio = (s: Sitio) => ("punto" in s ? `${porcentaje(s.punto)} %` : `${porcentaje(s.tramo[0])}-${porcentaje(s.tramo[1])} %`);

/** Cómo sale una franja en una columna: entera, o la parte de un tramo que cruza varias */
export type Parte = "entera" | "desde" | "sigue" | "hasta";

export interface Franja {
  clave: string;
  nombre: string;
  explicacion: string;
  desde: number;
  hasta: number;
  parte: Parte;
  /** «E03», «E02-E04», «desde E02», «sigue» o «hasta E04» */
  texto: string;
}

/** La escena de un momento, vista desde su episodio (RF-33) */
export type EstadoEscena = "" | "en otro episodio" | "descartada" | "ya no está";

export interface Atado {
  clave: string;
  nombre: string;
  texto: string;
  episodio: string;
  escena: string;
  estadoEscena: EstadoEscena;
}

export type Columna = ({ tipo: "episodio"; id: string; numero: number } | { tipo: "previstos"; desde: number; hasta: number; texto: string }) & {
  franjas: Franja[];
  /** Las 4 primeras (RF-39) */
  visibles: Franja[];
  /** Las demás: «+N más» */
  resto: number;
  atados: Atado[];
};

export const VISIBLES = 4;

const rango = (d: number, h: number) => (d === h ? codigoEpisodio(d) : `${codigoEpisodio(d)}-${codigoEpisodio(h)}`);

/** El estado de la escena de un momento con ese episodio */
export function estadoEscena(m: Modelo, escena: string, episodio: string): EstadoEscena {
  if (!escena) return "";
  const ev = m.eventos.get(escena);
  if (!ev) return "ya no está";
  if (estadoDe(ev) === "descartado") return "descartada";
  return ev.episodio === episodio ? "" : "en otro episodio";
}

/** Si el episodio de un momento es de la temporada (RF-34) */
export const episodioDeLaTemporada = (m: Modelo, t: Temporada, episodio: string) => !!episodio && c.episodiosDeTemporada(m, t.id).some((e) => e.id === episodio);

/** Momentos con un episodio de la temporada que existe, en el orden de la plantilla (RF-40) */
export function atados(m: Modelo, t: Temporada, id: IdPlantilla): Atado[] {
  const r: Atado[] = [];
  for (const def of plantilla(id).momentos) {
    const v = momento(t, id, def.clave);
    if (!episodioDeLaTemporada(m, t, v.episodio)) continue;
    r.push({ clave: def.clave, nombre: def.nombre, texto: v.texto, episodio: v.episodio, escena: v.escena, estadoEscena: estadoEscena(m, v.escena, v.episodio) });
  }
  return r;
}

/** Episodios que cuenta la plantilla: los creados o los previstos, lo que sea más */
export function episodiosPlantilla(m: Modelo, t: Temporada) {
  const creados = c.episodiosDeTemporada(m, t.id);
  return { creados, n: Math.max(creados.length, t.episodios_previstos || 0) };
}

/**
 * Las columnas de la rejilla con la plantilla (RF-37 a RF-40): una por episodio
 * creado y, si N es mayor, una de «Previstos» al final. Un tramo sale en cada
 * columna que toca; uno que cruza a los previstos, también en «Previstos».
 */
export function columnasPlantilla(m: Modelo, t: Temporada, id: IdPlantilla): Columna[] {
  const { creados, n } = episodiosPlantilla(m, t);
  if (!n) return [];
  const sitios = plantilla(id).momentos.map((def) => ({ def, r: enEpisodios(def.sitio, n) }));
  const ata = atados(m, t, id);
  const franja = (def: DefMomento, [d, h]: [number, number], parte: Parte, texto: string): Franja => ({
    clave: def.clave,
    nombre: def.nombre,
    explicacion: def.explicacion,
    desde: d,
    hasta: h,
    parte,
    texto,
  });
  const completar = (franjas: Franja[]) => ({ franjas, visibles: franjas.slice(0, VISIBLES), resto: Math.max(0, franjas.length - VISIBLES) });

  const r: Columna[] = creados.map((e, i) => {
    const k = i + 1;
    const franjas: Franja[] = [];
    for (const { def, r: [d, h] } of sitios) {
      if (k < d || k > h) continue;
      const parte: Parte = d === h ? "entera" : k === d ? "desde" : k === h ? "hasta" : "sigue";
      const texto = parte === "entera" ? rango(d, h) : parte === "desde" ? `desde ${codigoEpisodio(d)}` : parte === "hasta" ? `hasta ${codigoEpisodio(h)}` : "sigue";
      franjas.push(franja(def, [d, h], parte, texto));
    }
    return { tipo: "episodio", id: e.id, numero: k, ...completar(franjas), atados: ata.filter((a) => a.episodio === e.id) };
  });

  if (n > creados.length) {
    const desde = creados.length + 1;
    const franjas: Franja[] = [];
    for (const { def, r: [d, h] } of sitios) {
      if (h < desde) continue;
      // Si viene de los creados, aquí acaba; si no, sale con su rango
      franjas.push(d < desde ? franja(def, [d, h], "hasta", `hasta ${codigoEpisodio(h)}`) : franja(def, [d, h], "entera", rango(d, h)));
    }
    r.push({ tipo: "previstos", desde, hasta: n, texto: `Previstos: ${rango(desde, n)}`, ...completar(franjas), atados: [] });
  }
  return r;
}
