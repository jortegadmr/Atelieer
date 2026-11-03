// A qué piezas apunta una pieza (spec 006, choques de referencia): los campos
// del esquema que guardan ids de otras piezas, uno a uno. Los nombres de la
// wiki (protagonistas, personajes, lugares) y los códigos («T01E03») no cuentan.

import type { Pieza } from "../modelo/tipos";
import type { TipoPieza } from "../modelo/vocabulario";

/** Ruta de cada campo de referencia; «[]» recorre una lista */
export const CAMPOS_REFERENCIA: Record<TipoPieza, readonly string[]> = {
  serie: ["temporadas[]", "arcos[]"],
  punto: ["posicion.temporada", "posicion.episodio"],
  temporada: ["principal", "episodios[]", "estructura.detonante.episodio", "estructura.punto_medio.episodio", "estructura.crisis.episodio", "estructura.climax.episodio"],
  episodio: ["temporada", "dominante_manual"],
  arco: [
    "temporada",
    "tramo_de",
    "inicio.temporada",
    "inicio.episodio",
    "fin.temporada",
    "fin.episodio",
    "bomba_vence.temporada",
    "bomba_vence.episodio",
    "beats[].temporada",
    "beats[].episodio",
    "estados[].temporada",
  ],
  evento: ["temporada", "episodio", "arcos[].arco"],
  secreto: ["revelado_en.episodio", "revelado_en.evento", "pistas[].episodio", "pistas[].evento", "falsas[].episodio", "falsas[].evento"],
};

/** Los valores de una ruta («beats[].episodio») dentro de un objeto */
export function valoresEn(x: unknown, ruta: string): unknown[] {
  let actuales: unknown[] = [x];
  for (const parte of ruta.split(".")) {
    const lista = parte.endsWith("[]");
    const clave = lista ? parte.slice(0, -2) : parte;
    const siguientes: unknown[] = [];
    for (const a of actuales) {
      if (!a || typeof a !== "object") continue;
      const v = (a as Record<string, unknown>)[clave];
      if (lista) {
        if (Array.isArray(v)) siguientes.push(...v);
      } else siguientes.push(v);
    }
    actuales = siguientes;
  }
  return actuales;
}

/** Ids de las piezas a las que apunta (sin vacíos ni repetidos) */
export function referenciasDe(p: Pieza): string[] {
  const ids = new Set<string>();
  for (const ruta of CAMPOS_REFERENCIA[p.tipo]) {
    for (const v of valoresEn(p, ruta)) if (typeof v === "string" && v.trim()) ids.add(v.trim());
  }
  return [...ids];
}
