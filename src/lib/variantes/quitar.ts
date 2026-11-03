// «Quitar de la variante» (spec 006, RF-24, RF-24b): qué piezas hay que quitar
// para que la variante siga entera. Con la elegida se van lo que depende de
// ella (lo nuevo que contiene o la nombra) y las escenas que solo renumeró un
// movimiento. Se para cuando ningún episodio tocado queda peor que en la serie
// de ahora (más números repetidos) ni hay escenas sin su episodio.

import type { Modelo } from "../modelo/modelo";
import type { Evento, Pieza } from "../modelo/tipos";
import { copiaModelo } from "../consecuencias/copia";
import { notaNormal } from "./normal";
import { sacarDeVariante } from "./quedaria";
import { referenciasDe } from "./referencias";
import type { DatosVariante } from "./tipos";

/** Dónde va una escena en el orden: su episodio o la bandeja de su temporada */
const sitioDe = (m: Modelo, e: Evento) => (e.episodio && m.episodios.has(e.episodio) ? e.episodio : `bandeja:${e.temporada}`);

/** La escena de la variante solo cambia su número respecto a la de la serie */
function soloRenumerada(v: Pieza | null, s: Pieza | undefined): boolean {
  if (!v || !s || v.tipo !== "evento" || s.tipo !== "evento") return false;
  return v.orden !== s.orden && JSON.stringify({ ...v, orden: 0 }) === JSON.stringify({ ...s, orden: 0 });
}

/** Listas de orden de un contenedor: al quitar una pieza nueva solo sale su entrada */
const LISTAS: Partial<Record<Pieza["tipo"], "temporadas" | "episodios">> = { serie: "temporadas", temporada: "episodios" };

/** El contenedor sin la entrada de esa pieza en su lista; null si la nombra en otros campos */
function sinEntrada(p: Pieza, id: string): Pieza | null {
  const campo = LISTAS[p.tipo];
  if (!campo) return null;
  const lista = (p as unknown as Record<string, unknown>)[campo];
  if (!Array.isArray(lista) || !lista.includes(id)) return null;
  const otra = { ...p, [campo]: lista.filter((x) => x !== id) } as Pieza;
  return referenciasDe(otra).includes(id) ? null : otra;
}

/** Cuántos números de escena se repiten en un sitio */
function repetidos(m: Modelo, sitio: string): number {
  const nums = [...m.eventos.values()].filter((e) => sitioDe(m, e) === sitio).map((e) => e.orden);
  return nums.length - new Set(nums).size;
}

export interface Quitar {
  /** Todas las que se quitan, la elegida primero */
  ids: string[];
  /** Las que se quitan además de la elegida (para confirmar) */
  otras: string[];
  /** Contenedores que se quedan en la variante, sin la entrada de lo que se quita en su lista */
  recortes: Map<string, string[]>;
}

export function quitar(v: Pick<DatosVariante, "piezas">, id: string, quedaria: Modelo, serie: Modelo): Quitar {
  const fuera = new Set<string>();
  const recortes = new Map<string, string[]>();
  const cola = [id];
  const meter = (x: string) => {
    if (!fuera.has(x) && v.piezas.has(x)) cola.push(x);
  };

  for (;;) {
    while (cola.length) {
      const x = cola.shift()!;
      if (fuera.has(x) || !v.piezas.has(x)) continue;
      fuera.add(x);
      const e = v.piezas.get(x)!;
      // Lo nuevo no puede quedar sin lo que lo contiene: lo de la variante que la nombra se va con ella
      // (salvo un contenedor que solo la tiene en su lista y cambia algo más: se queda sin esa entrada)
      if (e.base === null) {
        for (const [otra, p] of v.piezas) {
          if (!p.pieza || !referenciasDe(p.pieza).includes(x)) continue;
          const recortado = sinEntrada(p.pieza, x);
          if (recortado && (p.base === null || notaNormal(recortado) !== p.base)) recortes.set(otra, [...(recortes.get(otra) ?? []), x]);
          else meter(otra);
        }
      }
      // Una escena que cambia de sitio arrastra las que solo renumeró, allí de donde salió y allí adonde llega
      const enVariante = e.pieza;
      const enSerie = serie.pieza(x);
      if (enVariante?.tipo === "evento" || enSerie?.tipo === "evento") {
        const sitios = new Set<string>();
        if (enVariante?.tipo === "evento") sitios.add(sitioDe(quedaria, enVariante));
        if (enSerie?.tipo === "evento") sitios.add(sitioDe(serie, enSerie));
        for (const [otra, p] of v.piezas) {
          if (p.pieza?.tipo !== "evento" || !soloRenumerada(p.pieza, serie.pieza(otra))) continue;
          if (sitios.has(sitioDe(quedaria, p.pieza))) meter(otra);
        }
      }
    }
    // ¿Queda entera? Se prueba quitándolas de una copia de «Cómo quedaría»
    const prueba = copiaModelo(quedaria);
    sacarDeVariante(prueba, serie, fuera);
    let mas = false;
    const sitios = new Set<string>();
    for (const x of fuera) {
      for (const m of [prueba, serie, quedaria]) {
        const p = m.eventos.get(x);
        if (p) sitios.add(sitioDe(m, p));
      }
    }
    for (const s of sitios) {
      if (repetidos(prueba, s) <= repetidos(serie, s)) continue;
      // Peor que ahora: se quitan también las escenas de la variante de ese sitio
      for (const [otra, p] of v.piezas) if (p.pieza?.tipo === "evento" && sitioDe(quedaria, p.pieza) === s) (meter(otra), (mas = true));
    }
    // Escenas de la variante que se quedan sin su episodio
    for (const [otra, p] of v.piezas) {
      if (fuera.has(otra) || p.pieza?.tipo !== "evento") continue;
      const ev = prueba.eventos.get(otra);
      if (ev?.episodio && !prueba.episodios.has(ev.episodio)) (meter(otra), (mas = true));
    }
    if (!mas || !cola.length) break;
  }
  const ids = [id, ...[...fuera].filter((x) => x !== id)];
  for (const x of fuera) recortes.delete(x);
  return { ids, otras: ids.slice(1), recortes };
}
