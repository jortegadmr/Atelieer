// Lo que distingue «Cómo quedaría» de «Ahora» (spec 006, RF-17 a RF-21): la
// comparación de la spec 005 con la serie como punto de partida y la variante
// como lo de ahora. Sin pieza abierta: todas las piezas salen en la lista.

import type { Aviso, Resultado } from "../comprobaciones";
import { compararAvisos } from "../consecuencias/avisos";
import { camposCambiados } from "../consecuencias/campos-vistos";
import { reglasDelAviso } from "../consecuencias/efectos";
import { afectadas, rangos, type Afectada } from "../consecuencias/huellas";
import type { Guia, Regla } from "../guia/guia-md";
import type { Modelo } from "../modelo/modelo";

export interface PiezaDiferente extends Afectada {
  /** Es una pieza de la variante (no solo afectada por ella) */
  deLaVariante: boolean;
  /** Campos cambiados, con cómo están ahora → cómo quedarían (RF-8 de la 005) */
  campos: string[];
  /** «Pisa lo de ahora» (RF-30c): campos de la variante que pisan lo cambiado en la serie */
  pisa: string[];
}

export interface Diferencias {
  /** «Avisos que saltarían», con sus reglas (RF-20, grupo 2) */
  avisos: { aviso: Aviso; reglas: Regla[] }[];
  /** «Lo que cambia la variante»: primero sus piezas, luego las afectadas (RF-20, grupo 3) */
  piezas: PiezaDiferente[];
  /** «Dejarían de avisar» (RF-20, grupo 4) */
  dejan: Aviso[];
  /** Entradas de los grupos 2 y 3 (la cifra de la pestaña suma también los choques) */
  total: number;
  /** Algún aviso que saltaría es de clase aviso */
  conAviso: boolean;
  /** Piezas de la variante con diferencias («cambia N piezas», RF-32) */
  enVariante: number;
  /** Campos que pisan lo de ahora (RF-32: «Pisa lo de ahora en K campos») */
  pisan: number;
}

const EN_VARIANTE: Record<string, string> = { Nueva: "Nueva en la variante", "A la papelera": "Sale en la variante" };

/**
 * `serie` y `quedaria` con sus resultados de Comprobar; `deLaVariante`, los
 * ids de las piezas de la variante.
 */
export function diferencias(
  serie: Modelo,
  quedaria: Modelo,
  resSerie: Resultado,
  resQuedaria: Resultado,
  deLaVariante: ReadonlySet<string>,
  guia: Guia | null,
  pisa: ReadonlyMap<string, Record<string, unknown>> = new Map(),
): Diferencias {
  const orden = rangos(quedaria);
  const ordenSerie = rangos(serie);
  const rango = (id: string) => orden.get(id) ?? ordenSerie.get(id) ?? Infinity;

  const av = compararAvisos(resSerie.avisos, resQuedaria, quedaria);
  const avisos = av.saltan.map((aviso) => ({ aviso, reglas: reglasDelAviso(aviso, quedaria, guia) })).sort((a, b) => rango(a.aviso.pieza) - rango(b.aviso.pieza));
  const dejan = av.dejan.sort((a, b) => rango(a.pieza) - rango(b.pieza));

  const lista = afectadas(serie, quedaria, resSerie.avisos, resQuedaria.avisos, "");
  const piezas: PiezaDiferente[] = lista.map((a) => {
    const deVariante = deLaVariante.has(a.id);
    const antes = serie.pieza(a.id);
    const despues = quedaria.pieza(a.id);
    const campos = deVariante && antes && despues ? camposCambiados(antes, despues, serie, quedaria, guia) : [];
    let frases = a.frases.map((f) => EN_VARIANTE[f] ?? f);
    // «Cambió su nota» sobra si ya se dice qué campo cambió
    if (campos.length) frases = frases.filter((f) => f !== "Cambió su nota");
    // Lo que pisa: la pieza de la variante con los valores de la serie, comparada con la de la variante
    const p = pisa.get(a.id);
    const pisaFrases = p && despues ? camposCambiados({ ...despues, ...p } as typeof despues, despues, serie, quedaria, guia).map((f) => `Pisa lo de ahora · ${f}`) : [];
    return { ...a, frases, campos, deLaVariante: deVariante, pisa: pisaFrases };
  });
  // Primero las de la variante, después las afectadas; cada grupo en el orden de la serie
  piezas.sort((a, b) => Number(b.deLaVariante) - Number(a.deLaVariante));

  return {
    avisos,
    piezas,
    dejan,
    total: avisos.length + piezas.length,
    conAviso: avisos.some((x) => x.aviso.clase === "aviso"),
    enVariante: piezas.filter((p) => p.deLaVariante).length,
    pisan: piezas.reduce((n, p) => n + p.pisa.length, 0),
  };
}
