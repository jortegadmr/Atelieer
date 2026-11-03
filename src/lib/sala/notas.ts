// Las notas de la pizarra que van con una pieza (spec 012, RF-23.8): las notas
// unidas a la tarjeta de la pieza por una flecha directa, en cualquier sentido.
// Función pura sobre la pizarra; no lee ni escribe nada.

import type { Pizarra } from "../pizarra/tipos";
import type { NotaSala } from "./planteamiento";

/** Sin tarjeta de esa pieza, o sin notas unidas a ella, la lista sale vacía */
export function notasUnidas(p: Pizarra, pieza: string): NotaSala[] {
  const tarjeta = p.elementos.find((e) => e.tipo === "tarjeta" && e.pieza === pieza);
  if (!tarjeta) return [];
  const notas = new Map(p.elementos.flatMap((e) => (e.tipo === "nota" ? [[e.id, e] as const] : [])));
  const r: NotaSala[] = [];
  for (const f of p.flechas) {
    // «llega»: de la nota a la pieza; «sale»: de la pieza a la nota
    const otra = f.a === tarjeta.id ? notas.get(f.de) : f.de === tarjeta.id ? notas.get(f.a) : undefined;
    if (!otra) continue;
    r.push({ texto: otra.texto, etiqueta: f.etiqueta, direccion: f.a === tarjeta.id ? "llega" : "sale", x: otra.x, y: otra.y });
  }
  return r.sort((a, b) => a.y - b.y || a.x - b.x);
}
