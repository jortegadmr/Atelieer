// Las guías sobre una ficha (spec 015, RF-9): las comprobaciones que ya existen
// para los arcos de un personaje se enseñan en la pantalla de su ficha, con la
// regla, la fuente y el sitio. No hay reglas nuevas: se filtran las de siempre.
// Las tres salidas (corregir, cambiar, seguir así) se hacen en el arco.

import { comprobar, type Aviso } from "../comprobaciones";
import { protagonistas } from "../comprobaciones/base";
import type { Modelo } from "../modelo/modelo";

export interface AvisoDeFicha {
  aviso: Aviso;
  arco: string;
  tituloArco: string;
}

const limpio = (s: string) => s.replace(/^\s*\[\[|\]\]\s*$/g, "").trim().toLowerCase();

/** Los avisos de los arcos en los que el personaje (por su nombre o un alias) es protagonista */
export function avisosDeFicha(m: Modelo, nombre: string, aliases: readonly string[] = []): AvisoDeFicha[] {
  const suyos = new Set([nombre, ...aliases].map(limpio).filter(Boolean));
  const arcos = new Map<string, string>();
  for (const a of m.arcos.values()) {
    if ([...protagonistas(a)].some((p) => suyos.has(p))) arcos.set(a.id, a.titulo.trim() || "Sin título");
  }
  if (!arcos.size) return [];
  return comprobar(m)
    .avisos.filter((a) => arcos.has(a.pieza))
    .map((aviso) => ({ aviso, arco: aviso.pieza, tituloArco: arcos.get(aviso.pieza)! }));
}
