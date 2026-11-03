// Presencia (spec 010, RF-17 a RF-21): personajes × episodios de una
// temporada; cada casilla cuenta las escenas vivas del episodio que llevan al
// personaje. Las claves son las de la lente: un alias es el mismo personaje.

import * as c from "../modelo/consultas";
import { estadoDe } from "../modelo/estados";
import type { Modelo } from "../modelo/modelo";
import type { Episodio, Evento } from "../modelo/tipos";
import { alias, clavePersonaje, personajesDeSerie, type FuentePersonajes } from "./lente";

/** Casillas seguidas de una ausencia larga, por posición en `episodios` (solo los que tienen escenas) */
export interface Ausencia {
  desde: number;
  hasta: number;
  n: number;
}

export interface FilaPresencia {
  clave: string;
  nombre: string;
  /** Escenas por episodio, en el orden de `episodios` */
  casillas: number[];
  ausencias: Ausencia[];
  escenas: number;
  episodiosCon: number;
}

export interface Presencia {
  episodios: Episodio[];
  /** El episodio tiene alguna escena viva (los que no, no cuentan para las ausencias) */
  activos: boolean[];
  filas: FilaPresencia[];
}

/** Ausencia larga: 3 episodios seguidos o más (decidido en la spec) */
export const AUSENCIA_LARGA = 3;

export const escenaViva = (ev: Evento) => {
  const e = estadoDe(ev);
  return e !== "aparcado" && e !== "descartado";
};

export function presencia(m: Modelo, wiki: FuentePersonajes | null, temporada: string): Presencia {
  const episodios = c.episodiosDeTemporada(m, temporada);
  const activos = episodios.map(() => false);
  const al = alias(wiki);
  const porClave = new Map<string, number[]>();
  episodios.forEach((ep, i) => {
    for (const ev of c.eventosDeEpisodio(m, ep.id)) {
      if (!escenaViva(ev)) continue;
      activos[i] = true;
      for (const k of new Set(ev.personajes.map((x) => clavePersonaje(al, x)))) {
        if (!k) continue;
        let fila = porClave.get(k);
        if (!fila) porClave.set(k, (fila = episodios.map(() => 0)));
        fila[i]++;
      }
    }
  });
  const nombres = porClave.size ? personajesDeSerie(m, wiki) : new Map();
  const filas: FilaPresencia[] = [...porClave].map(([clave, casillas]) => ({
    clave,
    nombre: nombres.get(clave)?.nombre ?? clave,
    casillas,
    ausencias: ausencias(casillas, activos),
    escenas: casillas.reduce((a, b) => a + b, 0),
    episodiosCon: casillas.filter((x) => x > 0).length,
  }));
  filas.sort((a, b) => b.escenas - a.escenas || a.nombre.localeCompare(b.nombre, "es"));
  return { episodios, activos, filas };
}

/** Rachas de huecos entre la primera y la última aparición, saltando episodios sin escenas (RF-21) */
function ausencias(casillas: number[], activos: boolean[]): Ausencia[] {
  const r: Ausencia[] = [];
  const primera = casillas.findIndex((x) => x > 0);
  let ultima = casillas.length - 1;
  while (ultima > primera && casillas[ultima] === 0) ultima--;
  let desde = -1;
  let hasta = -1;
  let n = 0;
  for (let i = primera + 1; i <= ultima; i++) {
    if (!activos[i]) continue;
    if (casillas[i] === 0) {
      if (!n) desde = i;
      hasta = i;
      n++;
      continue;
    }
    if (n >= AUSENCIA_LARGA) r.push({ desde, hasta, n });
    n = 0;
  }
  return r;
}

/** La casilla `i` está dentro de una ausencia larga (y su episodio tiene escenas) */
export function enAusencia(p: Presencia, fila: FilaPresencia, i: number): Ausencia | undefined {
  return p.activos[i] ? fila.ausencias.find((a) => a.desde <= i && i <= a.hasta) : undefined;
}
