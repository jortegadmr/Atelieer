// Páginas y duración estimada de un guion (spec 013, RF-8, RF-23, RF-24): se
// cuenta con las medidas del formato estándar (MEDIDAS), sobre el texto
// MOSTRADO (una referencia mide su nombre o alias, no su enlace) y sin depender
// de la fuente instalada. Una página es un minuto.

import { clasificar } from "./lineas";
import { partir } from "./referencias";
import { MEDIDAS, TOPE_PAGINAS, type TipoLinea } from "./tipos";

export interface Medida {
  /** Líneas de página, con las líneas en blanco entre elementos */
  lineas: number;
  paginas: number;
  segundos: number;
  /** Pasa del tope de 500 páginas (RNF-12) */
  superaTope: boolean;
}

/** El texto como se ve: las referencias por su nombre (o alias) */
export function textoMostrado(linea: string): string {
  if (!linea.includes("[[")) return linea;
  return partir(linea)
    .map((s) => (s.t === "texto" ? s.s : (s.alias ?? s.nombre)))
    .join("");
}

const largo = (s: string) => [...s].length;

/** Cuántas líneas de página ocupa un texto a un ancho, partiendo por palabras (y por caracteres lo que no cabe) */
export function lineasDe(texto: string, ancho: number): number {
  if (largo(texto) <= ancho) return 1;
  let n = 1;
  let actual = 0;
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    let p = largo(palabra);
    if (actual === 0) {
      // sigue en la misma línea
    } else if (actual + 1 + p <= ancho) {
      actual += 1 + p;
      continue;
    } else {
      n++;
      actual = 0;
    }
    while (p > ancho) {
      n++;
      p -= ancho;
    }
    actual = p;
  }
  return n;
}

const MAYUSCULAS: TipoLinea[] = ["encabezado", "personaje", "transicion"];

export function medir(texto: string): Medida {
  const lineas = texto.split("\n");
  if (lineas.length && lineas[lineas.length - 1] === "") lineas.pop();
  let ini = 0;
  let fin = lineas.length;
  while (ini < fin && /^\s*$/.test(lineas[ini]!)) ini++;
  while (fin > ini && /^\s*$/.test(lineas[fin - 1]!)) fin--;
  const utiles = lineas.slice(ini, fin);
  const clases = clasificar(utiles);
  let total = 0;
  for (let i = 0; i < utiles.length; i++) {
    const c = clases[i]!;
    if (c.tipo === "blanco") {
      total += 1;
      continue;
    }
    let t = textoMostrado(c.texto).trim();
    if (MAYUSCULAS.includes(c.tipo)) t = t.toLocaleUpperCase("es");
    total += lineasDe(t, MEDIDAS.ancho[c.tipo]);
  }
  const paginas = total / MEDIDAS.lineasPagina;
  return { lineas: total, paginas, segundos: paginas * MEDIDAS.segundosPagina, superaTope: paginas > TOPE_PAGINAS };
}

/** «2,4 págs ≈ 2 min 24 s» (RF-23): una decimal y siempre marcada como estimación */
export function formatoMedida(m: Pick<Medida, "paginas" | "segundos">): string {
  const pag = m.paginas.toFixed(1).replace(".", ",");
  const s = Math.round(m.segundos);
  const min = Math.floor(s / 60);
  const resto = s % 60;
  const dur = min > 0 ? (resto > 0 ? `${min} min ${resto} s` : `${min} min`) : `${resto} s`;
  return `${pag} págs ≈ ${dur}`;
}
