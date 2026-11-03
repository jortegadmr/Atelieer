// Series de prueba para «Si lo dejas así…» (spec 005): un Constructor guardado
// en el disco en memoria y abierto como sesión.

import { Almacen } from "../../src/lib/almacen/almacen";
import { FsMemoria } from "../../src/lib/almacen/fs-memoria";
import { Sesion } from "../../src/lib/app/sesion";
import type { Pieza } from "../../src/lib/modelo/tipos";
import { Constructor } from "../fixtures/constructor";

export const RAIZ = "/appDatos";

/** Una temporada con dos episodios: tres escenas en el primero y una en el segundo */
export function serieBasica() {
  const b = new Constructor();
  const t = b.temporada({ titulo: "Primera" }, 2);
  const [e1, e2] = t.eps;
  const a = b.arco({ titulo: "El eco", tipo_trama: "A", tipo_arco: "trama" });
  const s1 = b.evento({ titulo: "Uno", episodio: e1, arcos: [[a, "abre"]] });
  const s2 = b.evento({ titulo: "Dos", episodio: e1 });
  const s3 = b.evento({ titulo: "Tres", episodio: e1 });
  const s4 = b.evento({ titulo: "Cuatro", episodio: e2, arcos: [[a, "cierra"]] });
  return { b, t: t.id, e1, e2, a, s1, s2, s3, s4 };
}

/** Guarda las piezas del constructor en un disco en memoria y abre la serie */
export async function abrir(b: Constructor): Promise<{ s: Sesion; fs: FsMemoria; almacen: Almacen }> {
  const fs = new FsMemoria();
  const almacen = new Almacen(fs, RAIZ);
  await almacen.crearSerie("s", { titulo: "S" });
  const piezas: Pieza[] = [b.serie, ...b.puntos, ...b.temporadas, ...b.episodios, ...b.arcos, ...b.eventos, ...b.secretos];
  for (const p of piezas) await almacen.guardar("s", p);
  const s = await Sesion.abrir(almacen, "s", "PC");
  return { s, fs, almacen };
}

/** Congela a fondo: si algo cambia una pieza en su sitio, lanza (los módulos van en modo estricto) */
export function congelar<T>(x: T): T {
  if (x && typeof x === "object" && !Object.isFrozen(x)) {
    Object.freeze(x);
    for (const v of Object.values(x)) congelar(v);
  }
  return x;
}
