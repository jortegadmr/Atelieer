// La nota de una pieza tal como la escribe Atelier, sin la fecha de la ficha
// (spec 006): la base de cada pieza de la variante y con lo que se compara para
// saber si cambió en la serie. Así un cambio solo de formato (Obsidian pasa las
// listas a bloque) no cuenta, y un campo que la app no entiende sí.

import { escribirPieza, leerPieza } from "../modelo/ficheros";
import type { Pieza } from "../modelo/tipos";
import type { TipoPieza } from "../modelo/vocabulario";

const escritas = new WeakMap<Pieza, string>();

/** escribirPieza sin `wiki_mtime` (lo pone Atelier al escribir la ficha: no es un cambio del autor) */
export function notaNormal(p: Pieza): string {
  let t = escritas.get(p);
  if (t === undefined) {
    t = escribirPieza("wiki_mtime" in p ? ({ ...p, wiki_mtime: "" } as Pieza) : p);
    escritas.set(p, t);
  }
  return t;
}

/** El texto de una nota del disco, normalizado igual; null si no se puede leer */
export function textoNormal(texto: string, tipo: TipoPieza, id: string): string | null {
  try {
    return notaNormal(leerPieza(texto, tipo, id));
  } catch {
    return null;
  }
}
