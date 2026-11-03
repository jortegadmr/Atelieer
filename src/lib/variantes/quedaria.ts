// «Cómo quedaría» (spec 006): la serie de ahora con las piezas de la variante
// encima. Lo que la variante no toca sigue a la serie, también si cambia fuera.

import { copiaModelo } from "../consecuencias/copia";
import { leerPieza } from "../modelo/ficheros";
import type { Modelo } from "../modelo/modelo";
import type { DatosVariante } from "./tipos";

/** Un modelo nuevo: la serie (mismas piezas, sin clonar) y encima lo de la variante */
export function modeloQuedaria(serie: Modelo, v: Pick<DatosVariante, "piezas">): Modelo {
  const m = copiaModelo(serie);
  for (const [id, p] of v.piezas) {
    if (p.pieza) m.poner(p.pieza);
    else m.quitar(id);
  }
  return m;
}

/**
 * «Antes de aplicar» de una aplicada (RF-44): la serie de ahora con las bases
 * de la variante encima. Las piezas que creó no están; una base que no se lee
 * se deja como está en la serie.
 */
export function modeloAntes(serie: Modelo, v: Pick<DatosVariante, "piezas">): Modelo {
  const m = copiaModelo(serie);
  for (const [id, p] of v.piezas) {
    if (p.base === null) {
      m.quitar(id);
      continue;
    }
    try {
      m.poner(leerPieza(p.base, p.tipo, id));
    } catch {
      // Sin base legible: se ve lo de ahora
    }
  }
  return m;
}

/**
 * Copia a «Cómo quedaría» lo que cambió en la serie desde `antes` (la serie
 * de la última vez) y la variante no toca. Compara por referencia: las piezas
 * son valores. Devuelve los ids que ha puesto o quitado.
 */
export function seguirSerie(quedaria: Modelo, serie: Modelo, antes: Modelo, v: Pick<DatosVariante, "piezas">): string[] {
  const cambiadas: string[] = [];
  const vistas = new Set<string>();
  const mirar = (id: string) => {
    if (vistas.has(id)) return;
    vistas.add(id);
    if (v.piezas.has(id)) return;
    const ahora = serie.pieza(id);
    if (ahora === antes.pieza(id)) return;
    if (ahora) quedaria.poner(ahora);
    else quedaria.quitar(id);
    cambiadas.push(id);
  };
  for (const p of serie.todas()) mirar(p.id);
  for (const p of antes.todas()) mirar(p.id);
  return cambiadas;
}

/** Piezas que salen de la variante: en «Cómo quedaría», lo de la serie de ahora (o nada, si no existe) */
export function sacarDeVariante(quedaria: Modelo, serie: Modelo, ids: Iterable<string>): void {
  for (const id of ids) {
    const p = serie.pieza(id);
    if (p) quedaria.poner(p);
    else quedaria.quitar(id);
  }
}
