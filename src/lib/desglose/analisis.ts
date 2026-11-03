// Qué dice un guion, para el desglose (spec 014): el encabezado (locación,
// interior/exterior, momento del día), quién habla y cuánto, y las referencias
// a fichas. Solo lee: usa el clasificador y las medidas de la spec 013.

import { clasificarTexto } from "../guion/lineas";
import { lineasDe, medir, textoMostrado } from "../guion/paginas";
import { partir } from "../guion/referencias";
import { MEDIDAS } from "../guion/tipos";
import { clave } from "../wiki/md";

export type Momento = "día" | "noche" | "amanecer" | "atardecer" | "continuo";
export type InteriorExterior = "INT" | "EXT" | "INT/EXT";

export interface EncabezadoLeido {
  /** La línea tal como está */
  texto: string;
  ie: InteriorExterior | null;
  /** El lugar como se ve (una referencia, por su nombre o alias) */
  lugar: string;
  /** Nombre de la ficha, si el lugar es una referencia [[…]] */
  lugarRef: string | null;
  momento: Momento | null;
}

export interface Habla {
  /** Como está escrito en la línea del personaje, sin extensión: «TELMO», «Vera» */
  nombre: string;
  /** Si es una referencia, el nombre de su ficha */
  ref: string | null;
  /** Líneas de página de sus diálogos */
  lineas: number;
}

export interface AnalisisGuion {
  /** El primer encabezado del guion, o null: de él salen interior/exterior y momento */
  encabezado: EncabezadoLeido | null;
  /** Todos los encabezados, en orden: cada lugar distinto es una locación de la escena */
  encabezados: EncabezadoLeido[];
  /** Quién habla, en orden de aparición */
  hablan: Habla[];
  /** Nombres de fichas citados con [[…]] fuera de las líneas de personaje y del encabezado */
  citados: string[];
  /** El texto de las líneas de acción, tal como se ve, una por línea: para encontrar nombres escritos sin corchetes */
  acciones: string;
  segundos: number;
}

const SALTO = String.fromCharCode(10);
const MOMENTOS: Record<string, Momento> = { dia: "día", noche: "noche", amanecer: "amanecer", atardecer: "atardecer", continuo: "continuo" };
const SEPARADOR = /[ \t]+[-–—][ \t]+/;
const PREFIJO_IE = /^(INT\.\/EXT|EXT\.\/INT|INT\/EXT|EXT\/INT|I\/E|INT|EXT)\.?[ \t]+/i;
/** Rachas de espacios y tabuladores a un espacio: evita el backtracking cuadrático de las expresiones de arriba y de abajo */
const compactar = (s: string) => s.replace(/[ \t]{2,}/g, " ");
const EXTENSION =/[ \t]*\([^()]*\)[ \t]*$/;

/** El momento del día de un trozo de encabezado, o null */
export function momentoDe(trozo: string): Momento | null {
  return MOMENTOS[clave(trozo.replace(EXTENSION, ""))] ?? null;
}

/** Interpreta la línea de un encabezado (RF-2): `INT. CASA DE TELMO - NOCHE` */
export function leerEncabezado(texto: string): EncabezadoLeido {
  let resto = compactar(texto).trim();
  let ie: InteriorExterior | null = null;
  const m = PREFIJO_IE.exec(resto);
  if (m) {
    const p = m[1]!.toUpperCase();
    ie = p === "INT" ? "INT" : p === "EXT" ? "EXT" : "INT/EXT";
    resto = resto.slice(m[0].length);
  }
  const trozos = resto.split(SEPARADOR);
  let momento: Momento | null = null;
  if (trozos.length > 1) {
    const ultimo = momentoDe(trozos[trozos.length - 1]!);
    if (ultimo) {
      momento = ultimo;
      trozos.pop();
    }
  }
  const lugarCrudo = trozos.join(" - ").trim();
  const ref = partir(lugarCrudo).find((s) => s.t === "ref");
  return { texto: texto.trim(), ie, lugar: textoMostrado(lugarCrudo).trim(), lugarRef: ref && ref.t === "ref" ? ref.nombre : null, momento };
}

/** Quién habla en una línea de personaje: sin extensión «(V.O.)»; una referencia, por su ficha */
function personajeDe(linea: string): { nombre: string; ref: string | null } {
  const sinExt = compactar(linea).replace(EXTENSION, "").trim();
  const ref = partir(sinExt).find((s) => s.t === "ref");
  return { nombre: textoMostrado(sinExt).trim(), ref: ref && ref.t === "ref" ? ref.nombre : null };
}

export function analizarGuion(texto: string): AnalisisGuion {
  const lineas = clasificarTexto(texto);
  const encabezados: EncabezadoLeido[] = [];
  const hablan = new Map<string, Habla>();
  const citados = new Set<string>();
  const acciones: string[] = [];
  let actual: Habla | null = null;
  for (const l of lineas) {
    if (l.tipo === "encabezado") {
      encabezados.push(leerEncabezado(l.texto));
      actual = null;
      continue;
    }
    if (l.tipo === "personaje") {
      const p = personajeDe(l.texto);
      const k = clave(p.ref ?? p.nombre);
      let h = hablan.get(k);
      if (!h) hablan.set(k, (h = { nombre: p.nombre, ref: p.ref, lineas: 0 }));
      else if (!h.ref && p.ref) h.ref = p.ref;
      actual = h;
      continue;
    }
    if (l.tipo === "dialogo" || l.tipo === "parentesis") {
      if (actual) actual.lineas += lineasDe(textoMostrado(l.texto).trim(), MEDIDAS.ancho[l.tipo]);
    } else {
      actual = null;
    }
    if (l.tipo === "accion") acciones.push(textoMostrado(l.texto));
    if (l.texto.includes("[[")) for (const s of partir(l.texto)) if (s.t === "ref") citados.add(s.nombre);
  }
  return { encabezado: encabezados[0] ?? null, encabezados, hablan: [...hablan.values()], citados: [...citados], acciones: acciones.join(SALTO), segundos: medir(texto).segundos };
}

/** Segundos de habla de unas líneas de página */
export const segundosDeLineas = (lineas: number) => (lineas / MEDIDAS.lineasPagina) * MEDIDAS.segundosPagina;
