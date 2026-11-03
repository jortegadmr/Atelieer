// El modelo de la serie de prueba (`scripts/datos-prueba.ts`) en memoria, sin disco.

import { piezasDePrueba } from "../../scripts/datos-prueba";
import { Modelo, type DatosModelo } from "../../src/lib/modelo/modelo";
import type { Pieza } from "../../src/lib/modelo/tipos";

const LISTA: Record<string, keyof DatosModelo> = { punto: "puntos", temporada: "temporadas", episodio: "episodios", arco: "arcos", evento: "eventos", secreto: "secretos" };

export function modeloDePrueba(): Modelo {
  const d: DatosModelo = { serie: null as never, puntos: [], temporadas: [], episodios: [], arcos: [], eventos: [], secretos: [] };
  for (const p of piezasDePrueba() as Pieza[]) {
    if (p.tipo === "serie") d.serie = p;
    else (d[LISTA[p.tipo]] as Pieza[]).push(p);
  }
  return new Modelo(d);
}
