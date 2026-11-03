// El visor con zoom (spec 002): en qué nivel está (serie › temporada ›
// episodio), cómo se sube y qué vista de la v1 va debajo. Funciones puras
// sobre el modelo; el nivel vive en memoria (EstadoApp), nunca en disco.

import * as c from "../modelo/consultas";
import type { Modelo } from "../modelo/modelo";
import type { Aviso } from "../comprobaciones/tipos";
import { tramaDominante } from "../modelo/dominante";
import { estadoDe } from "../modelo/estados";
import type { Evento, ParCarga, Temporada } from "../modelo/tipos";
import { actosDe, NOMBRE_ACTO, ORDEN_ACTOS, resumenDeActo, type ActoVisor } from "./actos";
import { codigosDeEscenas, type CodigoEscena } from "../guion/codigos";
import { ESTADO_ESCRITURA, ESTADO_TEMPORADA, etiqueta, type Estado } from "../modelo/vocabulario";

export type Vista = "serie" | "tramas" | "temporada" | "episodios" | "sincronizacion" | "wiki" | "historia" | "analisis" | "pizarra" | "guion" | "guia";

export type Nivel =
  | { tipo: "serie" }
  | { tipo: "temporada"; temporada: string }
  | { tipo: "episodio"; temporada: string; episodio: string };

export const NIVEL_SERIE: Nivel = { tipo: "serie" };

export const mismoNivel = (a: Nivel, b: Nivel) =>
  a.tipo === b.tipo && (a.tipo === "serie" || (a.temporada === (b as typeof a).temporada && (a.tipo !== "episodio" || a.episodio === (b as typeof a).episodio)));

/**
 * La temporada que enseñan Temporada y Episodios: la elegida si existe; si no,
 * la primera «en marcha» en orden de emisión; si no, la primera.
 */
export function temporadaVisible(m: Modelo, actual: string | null): Temporada | null {
  const elegida = actual ? m.temporadas.get(actual) : undefined;
  if (elegida) return elegida;
  const ts = c.temporadasEnOrden(m);
  return ts.find((t) => t.estado === "en marcha") ?? ts[0] ?? null;
}

/** Un nivel más arriba; null en la serie (RF-18) */
export function subir(n: Nivel): Nivel | null {
  if (n.tipo === "episodio") return { tipo: "temporada", temporada: n.temporada };
  if (n.tipo === "temporada") return NIVEL_SERIE;
  return null;
}

/** Miga de pan del nivel: `Serie › T01 › E03` (RF-14) */
export function migas(m: Modelo, n: Nivel): { nivel: Nivel; texto: string }[] {
  const r: { nivel: Nivel; texto: string }[] = [{ nivel: NIVEL_SERIE, texto: "Serie" }];
  if (n.tipo === "serie") return r;
  r.push({ nivel: { tipo: "temporada", temporada: n.temporada }, texto: c.codigo(m, n.temporada) || "Temporada" });
  if (n.tipo === "episodio") r.push({ nivel: n, texto: c.codigo(m, n.episodio).replace(/^T\d+/, "") || "Episodio" });
  return r;
}

/**
 * El primer nivel que sigue valiendo (RF-24): un episodio que ya no existe o
 * que ahora es de otra temporada sube a la temporada del nivel; una temporada
 * que ya no existe sube a la serie.
 */
export function nivelValido(m: Modelo, n: Nivel): Nivel {
  if (n.tipo === "serie") return n;
  if (!m.temporadas.has(n.temporada)) return NIVEL_SERIE;
  if (n.tipo === "episodio" && m.episodios.get(n.episodio)?.temporada !== n.temporada) return { tipo: "temporada", temporada: n.temporada };
  return n;
}

/** La vista de la v1 que va debajo de cada nivel (RF-20) */
export function vistaDeNivel(n: Nivel): "serie" | "temporada" | "episodios" {
  return n.tipo === "serie" ? "serie" : n.tipo === "temporada" ? "temporada" : "episodios";
}

/**
 * Nivel al cambiar de vista con los pasos o el selector de temporada (RF-21):
 * Serie, el nivel serie; Temporada o Episodios, el de la temporada que
 * enseñan. Tramas, Wiki, Sincronización, la línea de la historia, Análisis, la Pizarra y el Guion no lo cambian (RF-22).
 */
export function nivelAlCambiarVista(m: Modelo, vista: Vista, temporada: string | null, anterior: Nivel): Nivel {
  if (vista === "serie") return NIVEL_SERIE;
  if (vista === "temporada" || vista === "episodios") {
    const t = temporadaVisible(m, temporada);
    return t ? { tipo: "temporada", temporada: t.id } : NIVEL_SERIE;
  }
  return anterior;
}

export interface Columna {
  id: string;
  tipo: "temporada" | "episodio" | "evento";
  /** T01 · E03 · 4 */
  codigo: string;
  titulo: string;
  estado: Estado;
  /** Prevista, en marcha o cerrada y nº de episodios; estado de escritura */
  detalle: string[];
  /** Carga al empezar y al acabar; en un evento, su cambio de valor */
  carga: ParCarga;
  dominante?: { nombre: string; color: number };
  /** Logline (temporada) o idea central (episodio); el visor lo recorta a dos líneas */
  texto: string;
  /** Avisos de la guía en esa pieza: sin sugerencias ni silenciados (RF-8) */
  avisos: number;
  /** Escena que empieza y acaba con el mismo valor (spec 003, RF-11) */
  igual?: boolean;
}

/** Una columna de acto del nivel episodio (spec 003, RF-7 a RF-10) */
export interface ColumnaActo {
  acto: ActoVisor;
  nombre: string;
  /** Lo escrito en el episodio para ese acto; el visor lo recorta a dos líneas */
  resumen: string;
  escenas: Columna[];
}

/** Avisos de la guía por pieza, sin sugerencias */
function contarAvisos(avisos: Aviso[]): (id: string) => number {
  const cuantos = new Map<string, number>();
  for (const a of avisos) if (a.clase === "aviso") cuantos.set(a.pieza, (cuantos.get(a.pieza) ?? 0) + 1);
  return (id) => cuantos.get(id) ?? 0;
}

/** La tarjeta de una escena; `numero` = su puesto en el episodio (o en la bandeja) */
function columnaEscena(ev: Evento, numero: number, nAvisos: (id: string) => number, codigos?: Map<string, CodigoEscena>): Columna {
  const [desde, hasta] = ev.cambio;
  return {
    id: ev.id,
    tipo: "evento",
    codigo: codigos?.get(ev.id)?.corto ?? String(numero),
    titulo: ev.titulo,
    estado: estadoDe(ev),
    detalle: [],
    carga: ev.cambio,
    texto: "",
    avisos: nAvisos(ev.id),
    igual: !!desde && desde === hasta,
  };
}

/**
 * Las columnas de acto del episodio: Teaser, Inicio, Desarrollo y Desenlace
 * siempre; Sin acto solo si tiene escenas o `conSinActo` (se está arrastrando
 * una que salió de ella, RF-8).
 */
export function columnasActos(m: Modelo, ep: string, avisos: Aviso[], conSinActo = false): ColumnaActo[] {
  const nAvisos = contarAvisos(avisos);
  const episodio = m.episodios.get(ep);
  const numero = new Map(c.eventosDeEpisodio(m, ep).map((e, i) => [e.id, i + 1]));
  const codigos = codigosDeEscenas(m);
  const g = actosDe(m, ep);
  return ORDEN_ACTOS.filter((a) => a !== "" || g[""].length > 0 || conSinActo).map((acto) => ({
    acto,
    nombre: NOMBRE_ACTO[acto],
    resumen: episodio ? resumenDeActo(episodio, acto) : "",
    escenas: g[acto].map((e) => columnaEscena(e, numero.get(e.id)!, nAvisos, codigos)),
  }));
}

/** La bandeja de la temporada en el visor: también las de episodios que ya no existen (RF-29) */
export function bandejaVisor(m: Modelo, temporada: string, avisos: Aviso[]): Columna[] {
  const nAvisos = contarAvisos(avisos);
  return c.bandeja(m, temporada).map((e, i) => columnaEscena(e, i + 1, nAvisos));
}

export const TEXTO_BANDEJA_VACIA = "Bandeja vacía · las ideas caen aquí";
export const TEXTO_ACTO_VACIO = "Aún no hay escenas";

/** Las columnas del nivel (RF-2 a RF-8). `avisos` = los de `comprobar` (ya sin los silenciados) */
export function columnas(m: Modelo, n: Nivel, avisos: Aviso[]): Columna[] {
  const nAvisos = contarAvisos(avisos);

  if (n.tipo === "serie") {
    return c.temporadasEnOrden(m).map((t) => {
      const eps = c.episodiosDeTemporada(m, t.id).length;
      return {
        id: t.id,
        tipo: "temporada",
        codigo: c.codigo(m, t.id),
        titulo: t.titulo,
        estado: estadoDe(t),
        detalle: [etiqueta(ESTADO_TEMPORADA, t.estado), `${eps} ep`],
        carga: t.carga,
        texto: t.logline,
        avisos: nAvisos(t.id),
      };
    });
  }

  if (n.tipo === "temporada") {
    return c.episodiosDeTemporada(m, n.temporada).map((e) => {
      const dom = m.arcos.get(tramaDominante(m, e.id));
      return {
        id: e.id,
        tipo: "episodio",
        codigo: c.codigo(m, e.id).replace(/^T\d+/, ""),
        titulo: e.titulo,
        estado: estadoDe(e),
        detalle: [etiqueta(ESTADO_ESCRITURA, e.estado)],
        carga: e.carga,
        dominante: dom ? { nombre: dom.titulo, color: dom.color } : undefined,
        texto: e.idea_central,
        avisos: nAvisos(e.id),
      };
    });
  }

  const codigos = codigosDeEscenas(m);
  return c.eventosDeEpisodio(m, n.episodio).map((ev, i) => columnaEscena(ev, i + 1, nAvisos, codigos));
}

/** Lo que dice el visor si el nivel no tiene piezas (RF-10) */
export function textoVacio(m: Modelo, n: Nivel): string {
  if (n.tipo === "serie") return "Aún no hay temporadas";
  if (n.tipo === "episodio") return "Aún no hay escenas";
  const previstos = m.temporadas.get(n.temporada)?.episodios_previstos ?? 0;
  return previstos > 0 ? `Aún no hay episodios · ${previstos} previstos` : "Aún no hay episodios";
}
