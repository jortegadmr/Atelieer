// Las marcas de «Si lo dejas así…» y de las variantes fuera del visor (spec 009,
// RF-30, RF-31, RF-33): Tramas, la rejilla y la línea de la historia. Funciones
// puras sobre (base, actual, ids), como `marcasVisor`: base es lo de antes (o la
// serie), actual lo que se ve, ids las piezas que cuentan como cambiadas.

import type { Modelo } from "../modelo/modelo";
import type { Arco, Evento } from "../modelo/tipos";
import { donde } from "../vistas/textos";
import { CAMPOS_VISTOS, comoEstaba, recortar, type CampoVisto } from "./campos-vistos";
import { columnaDeEscena, columnasHistoria, type FuenteEpocas, type IdColumna } from "../vistas/historia";

const titulo = (t: string) => t.trim() || "Sin título";

export interface MarcasHistoria {
  /** Por columna, las escenas que estaban en ella y ahora están en otra */
  estabanAqui: Map<IdColumna, { id: string; titulo: string }[]>;
  /** Escenas que no estaban */
  nuevas: Set<string>;
}

/** La línea (RF-30): «Estaba aquí» en la columna de donde salió una escena, «Nueva» en las nuevas */
export function marcasHistoria(base: Modelo, actual: Modelo, ids: Iterable<string>, fuente: FuenteEpocas, filtro: string): MarcasHistoria {
  const r: MarcasHistoria = { estabanAqui: new Map(), nuevas: new Set() };
  const enIds = new Set(ids);
  const antes = columnasHistoria(base, fuente, filtro);
  const ahora = columnasHistoria(actual, fuente, filtro);
  for (const col of ahora) for (const ev of col.escenas) if (enIds.has(ev.id) && !base.eventos.has(ev.id)) r.nuevas.add(ev.id);
  for (const col of antes) {
    for (const ev of col.escenas) {
      if (!enIds.has(ev.id) || !actual.eventos.has(ev.id)) continue;
      const donde = columnaDeEscena(ahora, ev.id);
      // Si ahora no se ve (otra temporada con el filtro), también se fue de aquí
      if (donde?.id === col.id) continue;
      const lista = r.estabanAqui.get(col.id) ?? [];
      lista.push({ id: ev.id, titulo: titulo(ev.titulo) });
      r.estabanAqui.set(col.id, lista);
    }
  }
  return r;
}

export interface MarcasRejilla {
  /** Por `evento|arco`, el papel que tenía en ese arco */
  papelAntes: Map<string, string>;
  /** Por celda (`arco|episodio`, arco vacío en «Sin trama»), las escenas que estaban en ella y se fueron */
  estabanAqui: Map<string, { id: string; titulo: string }[]>;
  /** Escenas que no estaban */
  nuevas: Set<string>;
}

/** Las celdas de la rejilla de una temporada donde sale una escena */
function celdas(m: Modelo, ev: Evento, temporada: string): string[] {
  const ep = m.episodios.get(ev.episodio);
  if (!ep || ep.temporada !== temporada) return [];
  const arcos = ev.arcos.filter((x) => m.arcos.has(x.arco)).map((x) => x.arco);
  return (arcos.length ? arcos : [""]).map((a) => `${a}|${ep.id}`);
}

/** La rejilla (RF-30): el papel de antes, «Estaba aquí» donde estaba una escena y «Nueva» */
export function marcasRejilla(base: Modelo, actual: Modelo, ids: Iterable<string>, temporada: string): MarcasRejilla {
  const r: MarcasRejilla = { papelAntes: new Map(), estabanAqui: new Map(), nuevas: new Set() };
  for (const id of new Set(ids)) {
    const ahora = actual.eventos.get(id);
    const antes = base.eventos.get(id);
    if (!ahora) continue;
    if (!antes) {
      if (celdas(actual, ahora, temporada).length) r.nuevas.add(id);
      continue;
    }
    const donde = new Set(celdas(actual, ahora, temporada));
    // El papel cambiado se marca en la fila de su arco, aunque la escena cambiara también de episodio
    if (donde.size) {
      for (const x of ahora.arcos) {
        const papel = antes.arcos.find((y) => y.arco === x.arco)?.papel;
        if (papel && papel !== x.papel) r.papelAntes.set(`${id}|${x.arco}`, papel);
      }
    }
    for (const celda of celdas(base, antes, temporada)) {
      if (donde.has(celda)) continue;
      const lista = r.estabanAqui.get(celda) ?? [];
      lista.push({ id, titulo: titulo(antes.titulo) });
      r.estabanAqui.set(celda, lista);
    }
  }
  return r;
}

export interface MarcasTramas {
  /** Arcos que no estaban */
  nuevos: Set<string>;
  /** Arcos que estaban y ya no, para el final de la lista */
  yaNoEsta: { id: string; titulo: string }[];
  /** Del arco que se ve, cómo estaba cada campo cambiado, por su etiqueta en «Lo cambiado» */
  campos: Map<string, string>;
  /** Por temporada, cómo estaba su fila de «Estado por temporada» */
  estados: Map<string, string>;
  /** Por beat (su índice), dónde caía o qué pasaba */
  beats: Map<number, string>;
}

/** Tramas (RF-30): «Nueva» y «Ya no está» en la lista; en las tarjetas del arco que se ve, cómo estaba */
export function marcasTramas(base: Modelo, actual: Modelo, ids: Iterable<string>, arco: string | null): MarcasTramas {
  const r: MarcasTramas = { nuevos: new Set(), yaNoEsta: [], campos: new Map(), estados: new Map(), beats: new Map() };
  const enIds = new Set(ids);
  for (const id of enIds) {
    const antes = base.arcos.get(id);
    const ahora = actual.arcos.get(id);
    if (ahora && !antes) r.nuevos.add(id);
    if (antes && !ahora) r.yaNoEsta.push({ id, titulo: titulo(antes.titulo) });
  }
  const a = arco && enIds.has(arco) ? base.arcos.get(arco) : undefined;
  const b = arco ? actual.arcos.get(arco) : undefined;
  if (!a || !b) return r;
  for (const cv of (CAMPOS_VISTOS.arco ?? []) as CampoVisto<Arco>[]) {
    const t = comoEstaba(cv, a, b, base);
    if (t) r.campos.set(cv.etiqueta, t);
  }
  const fila = (x: Arco, t: string) => x.estados.find((e) => e.temporada === t) ?? { inicio: "", fin: "" };
  for (const t of new Set([...a.estados, ...b.estados].map((e) => e.temporada))) {
    const ea = fila(a, t);
    const eb = fila(b, t);
    if (ea.inicio.trim() === eb.inicio.trim() && ea.fin.trim() === eb.fin.trim()) continue;
    r.estados.set(t, `${recortar(ea.inicio) || "—"} / ${recortar(ea.fin) || "—"}`);
  }
  a.beats.forEach((ba, i) => {
    const bb = b.beats[i];
    if (!bb) return;
    const dA = donde(base, ba);
    // Lo que enseña la tarjeta es dónde cae; si solo cambió qué pasa, eso
    if (dA !== donde(actual, bb) || ba.temporada !== bb.temporada || ba.episodio !== bb.episodio) r.beats.set(i, dA || "sin fijar");
    else if (ba.texto.trim() !== bb.texto.trim()) r.beats.set(i, `«${recortar(ba.texto) || "vacío"}»`);
  });
  return r;
}
