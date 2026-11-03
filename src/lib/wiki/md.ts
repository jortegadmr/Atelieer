// Ayudas para leer y tocar notas de Obsidian: propiedades y tablas.

import { parse } from "yaml";

/** Separa las propiedades YAML del cuerpo */
export function separar(texto: string): { propiedades: Record<string, unknown>; yaml: string; cuerpo: string } {
  const md = texto.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { propiedades: {}, yaml: "", cuerpo: md };
  let propiedades: Record<string, unknown> = {};
  try {
    const d = parse(m[1]);
    if (d && typeof d === "object" && !Array.isArray(d)) propiedades = d as Record<string, unknown>;
  } catch {
    // Propiedades rotas: como si no hubiera
  }
  return { propiedades, yaml: m[1], cuerpo: md.slice(m[0].length) };
}

/** Celdas de una línea de tabla Markdown; `\|` es una barra dentro de la celda */
export function celdas(linea: string): string[] {
  return linea
    .trim()
    .replace(/^\|/, "")
    .replace(/(?<!\\)\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.replace(/\\\|/g, "|").trim());
}

export const esSeparador = (linea: string) => /^\|?\s*:?-{2,}/.test(linea.trim());

/** Filas (sin cabecera ni separador) de la primera tabla cuya cabecera empieza por `primeraColumna` */
export function filasDeTabla(cuerpo: string, primeraColumna: string): string[][] {
  const lineas = cuerpo.split("\n");
  const r: string[][] = [];
  let dentro = false;
  for (const l of lineas) {
    if (!dentro) {
      if (l.trim().startsWith("|") && celdas(l)[0]?.toLowerCase() === primeraColumna.toLowerCase()) dentro = true;
      continue;
    }
    if (!l.trim().startsWith("|")) break;
    if (esSeparador(l)) continue;
    r.push(celdas(l));
  }
  return r;
}

/** Texto útil: "[PENDIENTE]" y vacío cuentan como nada */
export const util = (s: string | undefined) => {
  const t = (s ?? "").trim();
  return /^\[PENDIENTE\]$/i.test(t) ? "" : t;
};

/**
 * Nombre limpio (spec 009): sin [[ ]] de fuera (de [[X|texto]] vale X), sin
 * negritas ni cursivas en los extremos y con los espacios juntados
 */
export function nombreLimpio(s: string): string {
  let t = s.trim();
  for (let antes = ""; antes !== t; ) {
    antes = t;
    t = t.replace(/^(\*\*|__|\*|_)([\s\S]*)\1$/, "$2").trim();
    const enlace = t.match(/^\[\[([^\]]*)\]\]$/);
    if (enlace) t = enlace[1].split("|")[0].trim();
  }
  return t.replace(/\s+/g, " ");
}

/** Para comparar nombres: sin corchetes, acentos ni mayúsculas */
export const clave = (s: string) =>
  s
    .replace(/^\s*\[\[|\]\]\s*$/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Para comparar épocas (spec 009): el nombre limpio, sin acentos ni mayúsculas */
export const claveLimpia = (s: string) => clave(nombreLimpio(s));

/**
 * Texto de una sola línea para una celda o el Log (revisión de seguridad de la
 * spec 009): los saltos de todo tipo (también el retorno suelto, que Obsidian
 * toma como salto) y los tabuladores pasan a espacio; los caracteres de control
 * y los de dirección (bidi) se quitan.
 */
export const enUnaLinea = (s: string) =>
  s
    .replace(/[\t\n\v\f\r\u0085\u2028\u2029]+/g, " ")
    .replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .trim();

/**
 * Texto que se lee tal cual en Obsidian (spec 010, RF-41): en una línea y con
 * `\` delante de todo lo que Obsidian interpreta (títulos, enlaces, incrustados,
 * tablas, HTML, comentarios, resaltado…) y de la marca de lista inicial.
 */
export const textoSeguro = (s: string) =>
  enUnaLinea(s)
    .replace(/[\\#*_[\]!|`$%=~<>&]/g, "\\$&")
    .replace(/^([-+])/, "\\$1")
    .replace(/^(\d+)([.)])/, "$1\\$2");

/** `texto` como código en línea, con un delimitador más largo que sus acentos graves */
export function codigoEnLinea(texto: string): string {
  const racha = Math.max(0, ...(texto.match(/`+/g) ?? []).map((x) => x.length));
  const marca = "`".repeat(racha + 1);
  const borde = texto.startsWith("`") || texto.endsWith("`") ? " " : "";
  return `${marca}${borde}${texto}${borde}${marca}`;
}
