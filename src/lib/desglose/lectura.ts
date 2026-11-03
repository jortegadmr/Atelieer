// Lectura de los guiones para el desglose (spec 014, RNF-2): se leen del disco
// de cuatro en cuatro, sin tocar lo «conocido» del almacén (eso es de quien
// edita), y se puede cancelar. Un guion ilegible, enorme o vacío cuenta como
// «sin guion»: el desglose no lo toca.

import type { AlmacenGuion } from "../almacen/almacen-guion";
import { MAX_FICHERO_GUION } from "../almacen/almacen-guion";
import { leerGuion } from "../guion/formato";

const LECTURAS = 4;

export interface OpcionesLectura {
  lecturas?: number;
  /** Se llama tras cada lectura, con las hechas y el total */
  alAvanzar?: (hechas: number, total: number) => void;
  /** Si devuelve true se deja de leer y el resultado es lo leído hasta entonces */
  cancelado?: () => boolean;
}

/** El texto del guion de una escena, o null si no lo tiene (o no se puede leer) */
export async function leerTexto(guion: AlmacenGuion, id: string): Promise<string | null> {
  try {
    const crudo = await guion.leerCrudo(id);
    if (crudo === null || crudo.length > MAX_FICHERO_GUION) return null;
    const r = leerGuion(crudo);
    if ("ilegible" in r || !/\S/.test(r.guion.texto)) return null;
    return r.guion.texto;
  } catch {
    return null;
  }
}

export async function leerTextos(guion: AlmacenGuion, ids: readonly string[], opciones: OpcionesLectura = {}): Promise<Map<string, string | null>> {
  const r = new Map<string, string | null>();
  const lecturas = Math.max(1, opciones.lecturas ?? LECTURAS);
  let siguiente = 0;
  let hechas = 0;
  const trabajador = async () => {
    while (siguiente < ids.length && !opciones.cancelado?.()) {
      const id = ids[siguiente++]!;
      r.set(id, await leerTexto(guion, id));
      opciones.alAvanzar?.(++hechas, ids.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(lecturas, ids.length) }, trabajador));
  return r;
}
