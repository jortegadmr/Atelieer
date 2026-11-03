// Lo que el visor enseña con la pestaña «Si lo dejas así…» abierta (spec 005,
// RF-27, RF-28): qué columnas se resaltan en el nivel que se ve, cómo estaba
// lo que cambió («antes»), dónde estaban las escenas que se fueron y qué ya no
// está. Solo de lo que cada columna ya enseña.

import * as c from "../modelo/consultas";
import { tramaDominante } from "../modelo/dominante";
import type { Modelo } from "../modelo/modelo";
import type { Evento, ParCarga, Pieza } from "../modelo/tipos";
import { ORDEN_ACTOS, type ActoVisor } from "../vistas/actos";
import type { Nivel } from "../vistas/visor";

/** Cómo estaba una columna, solo en lo que cambió */
export interface Antes {
  /** Número de la escena en su episodio o en la bandeja */
  numero?: number;
  /** Episodios de la temporada (nivel serie) */
  episodios?: number;
  /** Carga (o cambio de valor de una escena), como la enseña el visor */
  carga?: ParCarga;
  /** Trama dominante del episodio; "" = ninguna */
  dominante?: string;
}

/** Una escena que estaba en este sitio y se fue (a otro episodio, acto o a/desde la bandeja) */
export interface EstabaAqui {
  id: string;
  titulo: string;
  /** Su acto en el episodio (nivel episodio); en la bandeja, "" */
  acto: ActoVisor;
  /** Delante de qué puesto de las tarjetas de ahora de ese acto (o de la bandeja) va la marca */
  puesto: number;
}

/** Los textos de las marcas: los de la spec 005 («antes») o los de una variante (spec 006, RF-17) */
export interface TextosMarcas {
  antes: string;
  nueva: string;
  estaba: string;
  yaNo: string;
}

export const TEXTOS_ANTES: TextosMarcas = { antes: "antes", nueva: "Nueva", estaba: "Estaba aquí", yaNo: "Ya no está" };

export interface MarcasVisor {
  /** Discontinuo de acento (cómo quedaría, spec 006) en vez de gris; y sus textos */
  fantasma?: boolean;
  textos?: TextosMarcas;
  resaltadas: Set<string>;
  antes: Map<string, Antes>;
  nuevas: Set<string>;
  estabanAqui: EstabaAqui[];
  yaNoEsta: { id: string; titulo: string }[];
  /** Por columna, de qué lado pasa solo el arco o el secreto elegido (spec 009, RF-34) */
  solo?: Map<string, "ahora" | "variante">;
}

const titulo = (p: Pieza | undefined) => (p && "titulo" in p ? p.titulo.trim() : "") || "Sin título";
const acto = (e: Evento): ActoVisor => (ORDEN_ACTOS.includes(e.acto) ? e.acto : "");
const igualCarga = (a: ParCarga, b: ParCarga) => a[0] === b[0] && a[1] === b[1];

/** Episodios (ids) por los que pasa una pieza en un modelo: los suyos, los de sus escenas, pistas o revelación */
export function episodiosDe(m: Modelo, p: Pieza | undefined): string[] {
  if (!p) return [];
  switch (p.tipo) {
    case "episodio":
      return [p.id];
    case "evento":
      return p.episodio ? [p.episodio] : [];
    case "arco":
      return [...new Set(c.eventosColocadosDeArco(m, p.id).map((e) => e.episodio))];
    case "secreto": {
      const ep = (episodio: string, evento: string) => (evento && m.eventos.get(evento)?.episodio) || episodio;
      return [...p.pistas.map((x) => ep(x.episodio, x.evento)), ep(p.revelado_en.episodio, p.revelado_en.evento)].filter(Boolean);
    }
    default:
      return [];
  }
}

/** Temporadas (ids) en las que está una pieza en un modelo */
export function temporadasDe(m: Modelo, p: Pieza | undefined): string[] {
  if (!p) return [];
  const r = new Set<string>();
  if (p.tipo === "temporada") r.add(p.id);
  if (p.tipo === "episodio" || p.tipo === "evento") r.add(p.temporada);
  if (p.tipo === "punto") r.add(p.posicion.temporada);
  if (p.tipo === "arco" && p.nivel === "temporada") r.add(p.temporada);
  for (const e of episodiosDe(m, p)) {
    const t = m.episodios.get(e)?.temporada;
    if (t) r.add(t);
  }
  r.delete("");
  return [...r];
}

/** Las escenas de un sitio (episodio o bandeja de una temporada), en orden */
const escenasDe = (m: Modelo, sitio: { episodio: string } | { bandeja: string }) =>
  "episodio" in sitio ? c.eventosDeEpisodio(m, sitio.episodio) : c.bandeja(m, sitio.bandeja);

/**
 * Las marcas del visor en el nivel `nivel`. `ids` son la abierta y las piezas
 * afectadas (las de `efectos`): solo ellas se resaltan.
 */
export function marcasVisor(base: Modelo, m: Modelo, nivel: Nivel, ids: Iterable<string>): MarcasVisor {
  const r: MarcasVisor = { resaltadas: new Set(), antes: new Map(), nuevas: new Set(), estabanAqui: [], yaNoEsta: [] };
  const lista = [...ids];
  const enLasDos = (id: string) => [base.pieza(id), m.pieza(id)] as const;

  if (nivel.tipo === "serie") {
    for (const id of lista) {
      const [a, b] = enLasDos(id);
      for (const t of [...temporadasDe(base, a), ...temporadasDe(m, b)]) r.resaltadas.add(t);
    }
    for (const t of c.temporadasEnOrden(m)) {
      const a = base.temporadas.get(t.id);
      if (!a) {
        if (r.resaltadas.has(t.id)) r.nuevas.add(t.id);
        continue;
      }
      const x: Antes = {};
      const [na, nb] = [c.episodiosDeTemporada(base, t.id).length, c.episodiosDeTemporada(m, t.id).length];
      if (na !== nb) x.episodios = na;
      if (!igualCarga(a.carga, t.carga)) x.carga = a.carga;
      if (Object.keys(x).length) r.antes.set(t.id, x);
    }
    for (const t of c.temporadasEnOrden(base)) if (!m.temporadas.has(t.id)) r.yaNoEsta.push({ id: t.id, titulo: titulo(t) });
    return r;
  }

  const sitio: { episodio: string } | { bandeja: string } = nivel.tipo === "temporada" ? { bandeja: nivel.temporada } : { episodio: nivel.episodio };

  if (nivel.tipo === "temporada") {
    // Episodios de la temporada por los que pasa algo resaltado, antes y ahora
    const episodios = new Set([...c.episodiosDeTemporada(base, nivel.temporada), ...c.episodiosDeTemporada(m, nivel.temporada)].map((e) => e.id));
    for (const id of lista) {
      const [a, b] = enLasDos(id);
      for (const e of [...episodiosDe(base, a), ...episodiosDe(m, b)]) if (episodios.has(e)) r.resaltadas.add(e);
    }
    for (const e of c.episodiosDeTemporada(m, nivel.temporada)) {
      const a = base.episodios.get(e.id);
      if (!a) {
        if (r.resaltadas.has(e.id)) r.nuevas.add(e.id);
        continue;
      }
      if (!r.resaltadas.has(e.id)) continue;
      const x: Antes = {};
      if (!igualCarga(a.carga, e.carga)) x.carga = a.carga;
      const [da, db] = [tramaDominante(base, e.id), tramaDominante(m, e.id)];
      if (da !== db) x.dominante = base.arcos.get(da)?.titulo.trim() || (da ? "Sin título" : "");
      if (Object.keys(x).length) r.antes.set(e.id, x);
    }
    for (const e of c.episodiosDeTemporada(base, nivel.temporada)) if (!m.episodios.has(e.id)) r.yaNoEsta.push({ id: e.id, titulo: titulo(e) });
  }

  // Escenas del sitio (las del episodio, o las de la bandeja en el nivel temporada)
  const ahora = escenasDe(m, sitio);
  const antes = escenasDe(base, sitio);
  const enIds = new Set(lista);
  const numAntes = new Map(antes.map((e, i) => [e.id, i + 1]));
  ahora.forEach((e, i) => {
    if (!enIds.has(e.id)) return;
    r.resaltadas.add(e.id);
    const a = base.eventos.get(e.id);
    if (!a) return void r.nuevas.add(e.id);
    const x: Antes = {};
    // Solo si ya estaba en este sitio: si no, lo dice «Estaba aquí» donde estaba
    const n = numAntes.get(e.id);
    if (n !== undefined && n !== i + 1) x.numero = n;
    if (!igualCarga(a.cambio, e.cambio)) x.carga = a.cambio;
    if (Object.keys(x).length) r.antes.set(e.id, x);
  });
  const aqui = new Set(ahora.map((e) => e.id));
  for (const a of antes) {
    const b = m.eventos.get(a.id);
    if (!b) {
      r.yaNoEsta.push({ id: a.id, titulo: titulo(a) });
      continue;
    }
    const enBandeja = "bandeja" in sitio;
    const seFue = !aqui.has(a.id) || (!enBandeja && acto(a) !== acto(b));
    if (!seFue) continue;
    // Delante de cuántas tarjetas de ahora de su acto (o de la bandeja) que ya estaban antes que ella
    const suyas = antes.filter((x) => enBandeja || acto(x) === acto(a));
    const previas = new Set(suyas.slice(0, suyas.indexOf(a)).map((x) => x.id));
    const deAhora = ahora.filter((x) => enBandeja || acto(x) === acto(a));
    let puesto = 0;
    deAhora.forEach((x, i) => {
      if (previas.has(x.id)) puesto = i + 1;
    });
    r.estabanAqui.push({ id: a.id, titulo: titulo(a), acto: enBandeja ? "" : acto(a), puesto });
  }
  return r;
}
