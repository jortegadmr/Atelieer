// Cuadre guion–escena (spec 014, RF-16 a RF-19): qué personajes y lugares dice el
// guion que no están en los campos de la escena, y al revés. Es información, no
// un aviso de las guías. Solo «Añadir a la escena» escribe, y lo hace por el
// camino de siempre (un Cambio de la spec 002: un paso del deshacer, entero o nada).

import type { Cambio, Modelo } from "../modelo/modelo";
import { editar } from "../modelo/operaciones";
import type { Evento } from "../modelo/tipos";
import { claveLimpia } from "../wiki/md";
import { analizarGuion } from "./analisis";
import { delaEscena, delGuion, mencionado, nombreBonito, sinMarcas, type Resolutor } from "./desglose";

export interface ItemCuadre {
  clave: string;
  nombre: string;
  /** Tiene ficha en el mundo */
  ficha: boolean;
}

export interface Lista {
  personajes: ItemCuadre[];
  lugares: ItemCuadre[];
}

export interface CuadreEscena {
  id: string;
  /** Lo que dice el guion y la escena no tiene: se puede añadir */
  enGuionNoEscena: Lista;
  /** Lo que tiene la escena y el guion no dice: solo se informa */
  enEscenaNoGuion: Lista;
  cuadra: boolean;
}

export { nombreBonito };

/**
 * El cuadre de una escena con guion; null si no tiene guion (no se hace con escenas sin guion, RF-16).
 * Un nombre que el guion escribe en una acción sin corchetes cuenta como dicho, para no dar falsos «solo en la escena».
 */
export function cuadrarEscena(ev: Pick<Evento, "id" | "lugares" | "personajes">, texto: string | null, res: Resolutor): CuadreEscena | null {
  if (texto === null || !/\S/.test(texto)) return null;
  const guion = delGuion(analizarGuion(texto), res);
  const escena = delaEscena(ev, res);
  const plano = sinMarcas(texto);
  const item = (x: { clave: string; nombre: string; ficha: boolean }): ItemCuadre => ({ clave: x.clave, nombre: x.ficha ? x.nombre : nombreBonito(x.nombre), ficha: x.ficha });
  const claves = (l: readonly { clave: string }[]) => new Set(l.map((x) => x.clave));
  const eP = claves(escena.personajes);
  const eL = claves(escena.locaciones);
  const gP = claves(guion.personajes);
  const gL = claves(guion.locaciones);
  const dicho = (x: ItemCuadre) => mencionado(plano, res.formas.get(x.clave) ?? [x.clave]);
  const r: CuadreEscena = {
    id: ev.id,
    enGuionNoEscena: { personajes: guion.personajes.filter((x) => !eP.has(x.clave)).map(item), lugares: guion.locaciones.filter((x) => !eL.has(x.clave)).map(item) },
    enEscenaNoGuion: {
      personajes: escena.personajes.filter((x) => !gP.has(x.clave)).map(item).filter((x) => !dicho(x)),
      lugares: escena.locaciones.filter((x) => !gL.has(x.clave)).map(item).filter((x) => !dicho(x)),
    },
    cuadra: false,
  };
  r.cuadra = ![...r.enGuionNoEscena.personajes, ...r.enGuionNoEscena.lugares, ...r.enEscenaNoGuion.personajes, ...r.enEscenaNoGuion.lugares].length;
  return r;
}

/** Cómo se escribe un nombre en el campo de la escena */
export const comoEnCampo = (nombre: string) => `[[${nombre.replace(/[\][|\n\r]/g, " ").replace(/\s+/g, " ").trim()}]]`;

/**
 * El cambio que añade esos personajes y lugares a la escena (RF-17): uno solo, para un solo paso del deshacer.
 * null si no hay nada que añadir. No quita ni cambia nada de lo que la escena ya tiene.
 */
export function cambioAnadir(m: Modelo, id: string, items: Partial<Lista>): Cambio | null {
  const ev = m.eventos.get(id);
  if (!ev) return null;
  const nuevos = (actuales: string[], aAnadir: readonly ItemCuadre[] | undefined) => {
    const hay = new Set(actuales.map(claveLimpia));
    const r: string[] = [];
    for (const x of aAnadir ?? []) {
      const valor = comoEnCampo(x.nombre);
      const k = claveLimpia(valor);
      if (k && !hay.has(k)) (hay.add(k), r.push(valor));
    }
    return r;
  };
  const personajes = nuevos(ev.personajes, items.personajes);
  const lugares = nuevos(ev.lugares, items.lugares);
  if (!personajes.length && !lugares.length) return null;
  return editar(m, id, (p) => {
    const e = p as Evento;
    e.personajes = [...e.personajes, ...personajes];
    e.lugares = [...e.lugares, ...lugares];
  });
}
