// El punto de partida de «Si lo dejas así…» (spec 005): una copia del modelo
// con las mismas piezas. Las piezas son valores (se copian antes de cambiarlas
// y se ponen con `poner`), así que basta con copiar los mapas: nada se clona.

import type { Cambiada } from "../modelo/deshacer";
import { Modelo } from "../modelo/modelo";

/** Un modelo nuevo con las mismas piezas (las mismas referencias) */
export function copiaModelo(m: Modelo): Modelo {
  return new Modelo({
    serie: m.serie,
    puntos: [...m.puntos.values()],
    temporadas: [...m.temporadas.values()],
    episodios: [...m.episodios.values()],
    arcos: [...m.arcos.values()],
    eventos: [...m.eventos.values()],
    secretos: [...m.secretos.values()],
  });
}

/** La copia con las piezas de un paso devueltas a como estaban antes de él (al crear, RF-23) */
export function antesDelPaso(m: Modelo, piezas: readonly Cambiada[]): Modelo {
  const copia = copiaModelo(m);
  for (const p of piezas) {
    if (p.antes) copia.poner(p.antes);
    else copia.quitar(p.id);
  }
  return copia;
}
