// La comparación de «Si lo dejas así…» (spec 005): cómo estaba la serie al
// abrir la pieza y quién ha cambiado qué desde entonces.

import type { Aviso } from "../comprobaciones";
import type { Modelo } from "../modelo/modelo";

/**
 * La misma pieza, sin contar `wiki_mtime`: es la fecha de la ficha que apunta
 * Atelier al escribirla, no un cambio del autor (volver con fichas la renueva).
 */
export function mismaPieza(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  const sinFecha = (x: unknown) => (x && typeof x === "object" && "wiki_mtime" in x ? { ...x, wiki_mtime: "" } : x);
  return JSON.stringify(sinFecha(a)) === JSON.stringify(sinFecha(b));
}

/** De dónde viene un cambio: del autor, de fuera de Atelier o de la revisión de fichas */
export type Origen = "autor" | "fuera" | "canon-wiki";

export class Comparacion {
  /** Piezas que cambiaron con la abierta: en sus pasos y, en cadena, en los posteriores que tocaron alguna */
  readonly conLaAbierta = new Set<string>();
  /** Piezas que cambiaron de fuera desde el punto de partida (RF-22) */
  readonly deFuera = new Map<string, Exclude<Origen, "autor">>();

  constructor(
    /** La pieza abierta */
    readonly piezaId: string,
    /** La serie justo antes de abrirla (o de crearla) */
    readonly base: Modelo,
    /** Los avisos de la base, ya sin silenciados */
    readonly avisosBase: readonly Aviso[],
  ) {}

  /** Apunta las piezas de un cambio ya aplicado */
  anotar(ids: readonly string[], origen: Origen): void {
    if (!ids.length) return;
    if (origen !== "autor") {
      for (const id of ids) this.deFuera.set(id, origen);
      return;
    }
    // Un paso que toca la abierta, o algo que ya cambió con ella, va con ella (decisión del autor)
    if (ids.some((id) => id === this.piezaId || this.conLaAbierta.has(id))) for (const id of ids) this.conLaAbierta.add(id);
  }
}
