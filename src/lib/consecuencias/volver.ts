// «Volver a como estaba» (spec 005, RF-18 a RF-20): el cambio que deja la
// abierta, y lo que cambió con ella, exactamente como en el punto de partida.
// Puro: no toca el modelo; la sesión lo aplica entero o nada.

import type { Cambio, Modelo } from "../modelo/modelo";
import type { Pieza } from "../modelo/tipos";
import { mismaPieza, type Comparacion } from "./comparacion";

export type Volver = { cambio: Cambio; devueltas: number } | { error: string };

const nombre = (p: Pieza) => `«${("titulo" in p ? p.titulo.trim() : "") || "Sin título"}»`;

/**
 * Si devolver esta pieza cambia algo canon bloqueado: ella misma (renumerarla
 * no es cambiarla) o el episodio bloqueado en el que entra, sale o se reordena.
 */
function bloqueoDe(antes: Pieza | undefined, ahora: Pieza | undefined, m: Modelo, bloqueada: (id: string) => boolean): string | null {
  const p = (ahora ?? antes)!;
  if (bloqueada(p.id)) {
    const sinOrden = (x: Pieza | undefined) => (x?.tipo === "evento" ? { ...x, orden: 0 } : x);
    if (!antes || !ahora || !mismaPieza(sinOrden(antes), sinOrden(ahora))) return p.id;
  }
  if (p.tipo === "evento") {
    const [a, b] = [antes?.tipo === "evento" ? antes : undefined, ahora?.tipo === "evento" ? ahora : undefined];
    const estructura = !a || !b || a.episodio !== b.episodio || a.orden !== b.orden || a.acto !== b.acto;
    if (estructura) for (const ep of [a?.episodio, b?.episodio]) if (ep && bloqueada(ep) && m.episodios.has(ep)) return ep;
  }
  return null;
}

/**
 * El cambio que devuelve la abierta y lo que cambió con ella. Lo que existía
 * vuelve a su versión de la base; lo creado desde entonces, a la papelera.
 * Si alguna cambió fuera o es canon bloqueado, no devuelve nada (RF-20).
 */
export function cambioVolver(comp: Comparacion, m: Modelo, bloqueada: (id: string) => boolean): Volver {
  const cambio: Cambio = { guardar: [], borrar: [] };
  for (const id of new Set([comp.piezaId, ...comp.conLaAbierta])) {
    const antes = comp.base.pieza(id);
    const ahora = m.pieza(id);
    if (mismaPieza(antes, ahora)) continue;
    const p = (ahora ?? antes)!;
    const fuera = comp.deFuera.get(id);
    if (fuera === "canon-wiki") return { error: `${nombre(p)} pasó a canon desde la wiki después de abrir la pieza: no se puede volver sin cambiar su ficha.` };
    if (fuera) return { error: `${nombre(p)} cambió fuera de Atelier después de abrir la pieza: no se puede volver sin perder ese cambio.` };
    const bloqueo = bloqueoDe(antes, ahora, m, bloqueada);
    if (bloqueo) {
      const b = m.pieza(bloqueo) ?? comp.base.pieza(bloqueo)!;
      return { error: `${nombre(b)} es canon: desbloquéala para volver.` };
    }
    // La fecha de la ficha se queda la de ahora: es la de su última escritura
    if (antes) cambio.guardar.push(ahora && "wiki_mtime" in ahora && "wiki_mtime" in antes ? ({ ...antes, wiki_mtime: ahora.wiki_mtime } as Pieza) : antes);
    else cambio.borrar.push(ahora!);
  }
  return { cambio, devueltas: cambio.guardar.length + cambio.borrar.length };
}
