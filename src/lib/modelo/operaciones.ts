// Operaciones de edición. No tocan el modelo: dicen qué piezas quedan por
// guardar y cuáles por borrar (Cambio). La sesión las aplica, y así deshacer
// (T7.3) tiene el antes y el después.

import { ordenEpisodios, ordenTemporadas } from "./codigos";
import * as c from "./consultas";
import type { Cambio, Modelo } from "./modelo";
import type { Arco, Episodio, Evento, Pieza, Punto, Secreto, Temporada } from "./tipos";

const copia = <T extends Pieza>(p: T): T => structuredClone(p);

/** Copia la pieza, le aplica `fn` y la deja lista para guardar */
export function editar(m: Modelo, id: string, fn: (p: Pieza) => void): Cambio {
  const actual = m.pieza(id);
  if (!actual) throw new Error(`No existe la pieza ${id}`);
  const p = copia(actual);
  fn(p);
  return { guardar: [p], borrar: [] };
}

export function crearTemporada(m: Modelo, datos: Partial<Temporada> = {}): { pieza: Temporada; cambio: Cambio } {
  const pieza = m.nueva("temporada", { estado: "prevista", ...datos });
  const serie = copia(m.serie);
  serie.temporadas = [...ordenTemporadas(m.serie, [...m.temporadas.values()]), pieza.id];
  return { pieza, cambio: { guardar: [pieza, serie], borrar: [] } };
}

/** Pone la temporada en la posición `indice` del orden de emisión (M2: solo cambia la serie) */
export function moverTemporada(m: Modelo, id: string, indice: number): Cambio {
  const orden = ordenTemporadas(m.serie, [...m.temporadas.values()]).filter((x) => x !== id);
  orden.splice(Math.max(0, Math.min(indice, orden.length)), 0, id);
  const serie = copia(m.serie);
  serie.temporadas = orden;
  return { guardar: [serie], borrar: [], mueve: id };
}

/** Orden de los arcos de la serie: el guardado y, detrás, los que no estén en él */
function ordenArcos(m: Modelo): string[] {
  return c.arcosEnOrden(m).map((a) => a.id);
}

export function crearArco(m: Modelo, datos: Partial<Arco> = {}): { pieza: Arco; cambio: Cambio } {
  const pieza = m.nueva("arco", datos);
  const serie = copia(m.serie);
  serie.arcos = [...ordenArcos(m), pieza.id];
  return { pieza, cambio: { guardar: [pieza, serie], borrar: [] } };
}

/** Tramo de un arco de serie en una temporada (spec 4.3): misma historia, mismo protagonista y tipo */
export function crearTramo(m: Modelo, arcoId: string, temporadaId: string): { pieza: Arco; cambio: Cambio } {
  const a = m.arcos.get(arcoId);
  if (!a) throw new Error(`No existe el arco ${arcoId}`);
  const codigo = c.codigo(m, temporadaId);
  return crearArco(m, {
    titulo: `${a.titulo || "Arco"}${codigo ? ` en ${codigo}` : ""}`,
    madurez: "idea",
    tipo_arco: a.tipo_arco,
    nivel: "temporada",
    temporada: temporadaId,
    tipo_trama: a.tipo_trama,
    color: a.color,
    tramo_de: a.id,
    protagonistas: [...a.protagonistas],
    personaje: a.personaje,
  });
}

/** Pone el arco en la posición `indice` del orden de las listas (solo cambia la serie) */
export function moverArco(m: Modelo, id: string, indice: number): Cambio {
  const orden = ordenArcos(m).filter((x) => x !== id);
  orden.splice(Math.max(0, Math.min(indice, orden.length)), 0, id);
  const serie = copia(m.serie);
  serie.arcos = orden;
  return { guardar: [serie], borrar: [], mueve: id };
}

/** Inserta un episodio en la posición `indice` de su temporada (M2: se escribe él y su temporada) */
export function insertarEpisodio(
  m: Modelo,
  temporadaId: string,
  indice: number,
  datos: Partial<Episodio> = {},
): { pieza: Episodio; cambio: Cambio } {
  const t = m.temporadas.get(temporadaId);
  if (!t) throw new Error(`No existe la temporada ${temporadaId}`);
  const pieza = m.nueva("episodio", { ...datos, temporada: temporadaId });
  const orden = ordenEpisodios(t, [...m.episodios.values()]);
  orden.splice(Math.max(0, Math.min(indice, orden.length)), 0, pieza.id);
  const nt = copia(t);
  nt.episodios = orden;
  return { pieza, cambio: { guardar: [pieza, nt], borrar: [] } };
}

/** Pone el episodio en la posición `indice` de su temporada (solo cambia la temporada) */
export function moverEpisodio(m: Modelo, id: string, indice: number): Cambio {
  const ep = m.episodios.get(id);
  const t = ep && m.temporadas.get(ep.temporada);
  if (!t) return { guardar: [], borrar: [] };
  const orden = ordenEpisodios(t, [...m.episodios.values()]).filter((x) => x !== id);
  orden.splice(Math.max(0, Math.min(indice, orden.length)), 0, id);
  const nt = copia(t);
  nt.episodios = orden;
  return { guardar: [nt], borrar: [], mueve: id };
}

/** Evento nuevo, el último de su celda (o de la bandeja de su temporada) */
export function crearEvento(m: Modelo, datos: Partial<Evento> = {}): { pieza: Evento; cambio: Cambio } {
  const ep = datos.episodio ?? "";
  const vecinos = ep ? c.eventosDeEpisodio(m, ep) : c.bandeja(m, datos.temporada ?? "");
  const orden = Math.max(0, ...vecinos.map((e) => e.orden)) + 1;
  const pieza = m.nueva("evento", { orden, ...datos, episodio: ep });
  return { pieza, cambio: { guardar: [pieza], borrar: [] } };
}

/**
 * Mueve un evento a un episodio ("" = la bandeja de su temporada), en la
 * posición `indice` de su celda (por defecto, al final). Renumera el orden de
 * la celda y solo guarda lo que cambia. Nunca toca sus arcos (M10).
 */
export function moverEvento(m: Modelo, id: string, episodio: string, indice?: number): Cambio {
  const ev = m.eventos.get(id);
  if (!ev) return { guardar: [], borrar: [] };
  const destino = episodio ? m.episodios.get(episodio) : undefined;
  const temporada = destino ? destino.temporada : ev.temporada;
  const vecinos = (episodio ? c.eventosDeEpisodio(m, episodio) : c.bandeja(m, temporada)).filter((e) => e.id !== id);
  const lugar = indice === undefined ? vecinos.length : Math.max(0, Math.min(indice, vecinos.length));
  const fila = [...vecinos];
  fila.splice(lugar, 0, ev);
  const guardar: Pieza[] = [];
  fila.forEach((e, i) => {
    const orden = i + 1;
    const cambia = e.id === id ? e.episodio !== episodio || e.temporada !== temporada || e.orden !== orden : e.orden !== orden;
    if (!cambia) return;
    const n = copia(e);
    n.orden = orden;
    if (e.id === id) {
      n.episodio = episodio;
      n.temporada = temporada;
    }
    guardar.push(n);
  });
  return { guardar, borrar: [], mueve: id };
}

export function crearSecreto(m: Modelo, datos: Partial<Secreto> = {}): { pieza: Secreto; cambio: Cambio } {
  const pieza = m.nueva("secreto", datos);
  return { pieza, cambio: { guardar: [pieza], borrar: [] } };
}

export function crearPunto(m: Modelo, datos: Partial<Punto> = {}): { pieza: Punto; cambio: Cambio } {
  const pieza = m.nueva("punto", datos);
  return { pieza, cambio: { guardar: [pieza], borrar: [] } };
}

/**
 * Borrar una pieza (a la papelera). Una temporada se lleva sus episodios, sus
 * eventos y sus puntos clave; un episodio manda sus eventos a la bandeja de su
 * temporada y sus puntos clave a la temporada entera.
 */
export function borrarPieza(m: Modelo, id: string): Cambio {
  const p = m.pieza(id);
  if (!p || p.tipo === "serie") return { guardar: [], borrar: [] };
  const cambio: Cambio = { guardar: [], borrar: [p] };

  if (p.tipo === "temporada") {
    const serie = copia(m.serie);
    serie.temporadas = serie.temporadas.filter((x) => x !== id);
    cambio.guardar.push(serie);
    for (const e of m.episodios.values()) if (e.temporada === id) cambio.borrar.push(e);
    for (const ev of m.eventos.values()) if (ev.temporada === id) cambio.borrar.push(ev);
    for (const pt of m.puntos.values()) if (pt.posicion.temporada === id) cambio.borrar.push(pt);
  }

  if (p.tipo === "episodio") {
    const t = m.temporadas.get(p.temporada);
    if (t) {
      const nt = copia(t);
      nt.episodios = nt.episodios.filter((x) => x !== id);
      cambio.guardar.push(nt);
    }
    for (const ev of c.eventosDeEpisodio(m, id)) {
      const ne = copia(ev);
      ne.episodio = "";
      cambio.guardar.push(ne);
    }
    for (const pt of m.puntos.values()) {
      if (pt.posicion.episodio !== id) continue;
      const np = copia(pt);
      np.posicion.episodio = "";
      cambio.guardar.push(np);
    }
  }

  if (p.tipo === "arco") {
    const serie = copia(m.serie);
    serie.arcos = serie.arcos.filter((x) => x !== id);
    cambio.guardar.push(serie);
    for (const ev of c.eventosDeArco(m, id)) {
      const ne = copia(ev);
      ne.arcos = ne.arcos.filter((x) => x.arco !== id);
      cambio.guardar.push(ne);
    }
    for (const t of c.tramos(m, id)) {
      const nt = copia(t);
      nt.tramo_de = "";
      cambio.guardar.push(nt);
    }
    for (const t of m.temporadas.values()) {
      if (t.principal !== id) continue;
      const nt = copia(t);
      nt.principal = "";
      cambio.guardar.push(nt);
    }
  }

  return cambio;
}
