// Códigos visibles T01 y T01E06 (D4). Se calculan por el orden que guarda la
// pieza madre (M2): serie.temporadas y temporada.episodios. Nunca se guardan.

import type { Episodio, Serie, Temporada } from "./tipos";

const dos = (n: number) => String(n).padStart(2, "0");

export function codigoTemporada(indice: number): string {
  return `T${dos(indice + 1)}`;
}

export function codigoEpisodio(indiceTemporada: number, indiceEpisodio: number): string {
  return `${codigoTemporada(indiceTemporada)}E${dos(indiceEpisodio + 1)}`;
}

/**
 * Ids en orden: primero los de la lista de la madre que existen; después, los
 * que existen pero la lista no nombra (por ejemplo, un fichero copiado a mano),
 * en el orden en que llegan.
 */
function ordenar(lista: string[], existentes: string[]): string[] {
  const hay = new Set(existentes);
  const vistos = new Set<string>();
  const r: string[] = [];
  for (const id of lista) {
    if (hay.has(id) && !vistos.has(id)) {
      r.push(id);
      vistos.add(id);
    }
  }
  for (const id of existentes) if (!vistos.has(id)) r.push(id);
  return r;
}

export function ordenTemporadas(serie: Serie, temporadas: Temporada[]): string[] {
  return ordenar(serie.temporadas, temporadas.map((t) => t.id));
}

/** `episodios` puede traer los de todas las temporadas: se quedan los suyos */
export function ordenEpisodios(temporada: Temporada, episodios: Episodio[]): string[] {
  return ordenar(
    temporada.episodios,
    episodios.filter((e) => e.temporada === temporada.id).map((e) => e.id),
  );
}

/** Código de cada temporada y episodio de la serie, por id */
export function codigosDeSerie(serie: Serie, temporadas: Temporada[], episodios: Episodio[]): Map<string, string> {
  const c = new Map<string, string>();
  const porId = new Map(temporadas.map((t) => [t.id, t]));
  ordenTemporadas(serie, temporadas).forEach((idT, iT) => {
    c.set(idT, codigoTemporada(iT));
    ordenEpisodios(porId.get(idT)!, episodios).forEach((idE, iE) => c.set(idE, codigoEpisodio(iT, iE)));
  });
  return c;
}
