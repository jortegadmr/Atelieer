// La línea de la historia (spec 009, A): las escenas por época del mundo, en
// columnas con el orden de la Timeline. Funciones puras sobre el modelo; mover
// de época solo cambia el campo `mundo` de la escena.

import * as c from "../modelo/consultas";
import type { Cambio, Modelo } from "../modelo/modelo";
import type { Evento } from "../modelo/tipos";
import { editar } from "../modelo/operaciones";
import type { Epoca } from "../wiki/fichas";
import { claveLimpia } from "../wiki/md";

export type IdColumna = "presente" | "fuera" | `e:${string}`;

export interface Columna {
  id: IdColumna;
  nombre: string;
  epoca: Epoca | null;
  escenas: Evento[];
  /** Se puede soltar en ella (RF-22, RF-26) */
  soltable: boolean;
  porQueNo?: string;
}

/** Lo que la línea necesita de la wiki */
export interface FuenteEpocas {
  epocas(): Epoca[];
  esPresente(epoca: string): boolean;
}

export const NOMBRE_FUERA = "No está en la wiki";
export const NOMBRE_PRESENTE = "Presente";

/** Un nombre así no se puede escribir como [[enlace]] (RF-26) */
const NO_ENLAZABLE = /[[\]|#^\u0000-\u001f\u007f]/;

const idDe = (e: Epoca): IdColumna => (e.presente ? "presente" : `e:${[...e.claves][0] ?? claveLimpia(e.nombre)}`);

/** Temporada de una escena: la de su episodio, la de su bandeja o "" (Sin temporada) */
export function temporadaDeEscena(m: Modelo, ev: Evento): string {
  const ep = ev.episodio ? m.episodios.get(ev.episodio) : undefined;
  if (ep && m.temporadas.has(ep.temporada)) return ep.temporada;
  return m.temporadas.has(ev.temporada) ? ev.temporada : "";
}

/** Dónde se emite (RF-8): «T01E03 · 2», «Bandeja T01» o «Sin temporada» */
export function dondeSeEmite(m: Modelo, ev: Evento): string {
  if (c.estaColocado(m, ev)) {
    const n = c.eventosDeEpisodio(m, ev.episodio).findIndex((x) => x.id === ev.id) + 1;
    return `${c.codigo(m, ev.episodio)} · ${n}`;
  }
  const t = temporadaDeEscena(m, ev);
  return t ? `Bandeja ${c.codigo(m, t)}` : "Sin temporada";
}

/** Clave de orden de emisión: temporada, episodio (la bandeja detrás) y orden */
export function ordenEmision(m: Modelo): (a: Evento, b: Evento) => number {
  const ix = m.indice();
  const posT = new Map(ix.temporadas.map((id, i) => [id, i]));
  const pos = (ev: Evento): [number, number, number] => {
    const p = ix.posEpisodio.get(ev.episodio);
    if (ev.episodio && p) return [p.iT, p.iE, ev.orden];
    const t = temporadaDeEscena(m, ev);
    return [t ? posT.get(t)! : Infinity, Infinity, ev.orden];
  };
  const cache = new Map<string, [number, number, number]>();
  const de = (ev: Evento) => cache.get(ev.id) ?? cache.set(ev.id, pos(ev)).get(ev.id)!;
  return (a, b) => c.compararPos(de(a), de(b)) || a.id.localeCompare(b.id);
}

/**
 * Las columnas de la línea (RF-4 a RF-7, RF-14): épocas de la wiki en orden,
 * «No está en la wiki» si hay escenas para ella y «Presente» al final si la
 * Timeline no lo coloca. `filtro` es una temporada, o "" para toda la serie.
 */
export function columnasHistoria(m: Modelo, fuente: FuenteEpocas, filtro: string): Columna[] {
  const epocas = fuente.epocas();
  const columnas: Columna[] = [];
  const porClave = new Map<string, Columna>();
  for (const e of epocas) {
    const enlazable = e.presente || !NO_ENLAZABLE.test(e.nombre);
    const col: Columna = {
      id: idDe(e),
      nombre: e.presente ? NOMBRE_PRESENTE : e.nombre,
      epoca: e,
      escenas: [],
      soltable: enlazable,
      porQueNo: enlazable ? undefined : `«${e.nombre}» no se puede escribir como enlace: cámbiale el nombre en la wiki.`,
    };
    columnas.push(col);
    for (const k of e.claves) if (!porClave.has(k)) porClave.set(k, col);
  }
  let presente = columnas.find((x) => x.id === "presente");
  const sinFila = !presente;
  presente ??= { id: "presente", nombre: NOMBRE_PRESENTE, epoca: null, escenas: [], soltable: true };
  const fuera: Columna = { id: "fuera", nombre: NOMBRE_FUERA, epoca: null, escenas: [], soltable: false, porQueNo: "Aquí no se puede soltar: elige una época de la wiki." };

  for (const ev of m.eventos.values()) {
    if (filtro && temporadaDeEscena(m, ev) !== filtro) continue;
    const col = fuente.esPresente(ev.mundo) ? presente : (porClave.get(claveLimpia(ev.mundo)) ?? fuera);
    col.escenas.push(ev);
  }
  const orden = ordenEmision(m);
  if (fuera.escenas.length) columnas.push(fuera);
  if (sinFila) columnas.push(presente);
  for (const col of columnas) col.escenas.sort(orden);
  return columnas;
}

/** La columna en la que está una escena */
export function columnaDeEscena(columnas: Columna[], id: string): Columna | null {
  return columnas.find((col) => col.escenas.some((e) => e.id === id)) ?? null;
}

/** Lo que se escribe en `mundo` (RF-18): el enlace a la época, o vacío para el presente */
export function valorMundo(col: Columna): string {
  return col.id === "presente" || !col.epoca ? "" : `[[${col.epoca.nombre}]]`;
}

/** Por qué no se puede mover ahí, o null (RF-22, RF-25, RF-26) */
export function porQueNoSeCambia(m: Modelo, id: string, destino: Columna, bloqueada: boolean): string | null {
  if (!m.eventos.has(id)) return "La escena ya no existe.";
  if (bloqueada) return "La escena es canon: desbloquéala para moverla";
  if (!destino.soltable) return destino.porQueNo ?? "Aquí no se puede soltar.";
  return null;
}

/** El cambio de época (RF-18, RF-21): solo `mundo`; null si ya está en esa columna (RF-23) */
export function cambioDeEpoca(m: Modelo, columnas: Columna[], id: string, destino: Columna): Cambio | null {
  if (!m.eventos.has(id) || !destino.soltable) return null;
  if (columnaDeEscena(columnas, id)?.id === destino.id) return null;
  const valor = valorMundo(destino);
  return editar(m, id, (p) => {
    (p as Evento).mundo = valor;
  });
}

/** Alt + flecha (RF-19, RF-20): la columna de al lado, saltando «No está en la wiki» */
export function pasoHistoria(columnas: Columna[], id: string, dir: "izq" | "der"): { columna: Columna } | { borde: string } {
  const validas = columnas.filter((x) => x.id !== "fuera");
  const actual = columnaDeEscena(columnas, id);
  const borde = { borde: dir === "izq" ? "Ya está en la primera época" : "Ya está en la última época" };
  if (!actual) return borde;
  if (actual.id === "fuera") {
    // Desde «No está en la wiki», la de al lado en el orden de las columnas
    const pos = columnas.indexOf(actual);
    const vecinas = dir === "izq" ? columnas.slice(0, pos).reverse() : columnas.slice(pos + 1);
    const v = vecinas.find((x) => x.id !== "fuera");
    return v ? { columna: v } : borde;
  }
  const i = validas.indexOf(actual) + (dir === "izq" ? -1 : 1);
  return i >= 0 && i < validas.length ? { columna: validas[i] } : borde;
}

/** Lo que se anuncia al mover (RF-29) */
export function anuncioEpoca(col: Columna): string {
  return col.id === "presente" ? "Pasa al presente" : `Pasa a «${col.nombre}»`;
}
