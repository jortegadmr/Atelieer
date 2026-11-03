// El texto del autor dentro de un planteamiento para la sala (spec 012, RF-22,
// RF-26, RF-27): se copia como texto, nunca como Markdown que se interprete, y si
// no cabe se recorta por piezas enteras, nunca a mitad de una línea ni de un carácter.

/** El tope de un planteamiento, en unidades de texto (RF-27) */
export const MAX_PLANTEAMIENTO = 100_000;

// Controles (salvo salto de línea y tabulador) y marcas de dirección que cambian cómo se ve el texto
const CONTROL = /[\p{Cc}]/gu;
const hex = (...h: number[]) => h.map((c) => String.fromCharCode(c)).join("");
const DIRECCION = new RegExp("[" + hex(0x061c, 0x200b, 0x200e, 0x200f, 0x2060, 0xfeff) + hex(0x202a) + "-" + hex(0x202e) + hex(0x2066) + "-" + hex(0x2069) + "]", "g");
const SEPARADORES = new RegExp("[" + hex(0x2028, 0x2029) + "]", "g");

/**
 * Quita los controles y las marcas de dirección y conserva los saltos de línea
 * y los tabuladores. Los separadores de línea y de párrafo de Unicode son saltos.
 */
export function limpiar(texto: string): string {
  return texto
    .replace(/\r\n?|\r/g, "\n")
    .replace(SEPARADORES, "\n")
    .replace(CONTROL, (c) => (c === "\n" || c === "\t" ? c : ""))
    .replace(DIRECCION, "");
}

/**
 * El texto del autor en una valla que no se puede cerrar desde dentro: de más
 * acentos graves que cualquier racha del propio texto. Dentro, `---`, `#`, `>`
 * o ``` son letras. Vacío (o solo espacios) devuelve "".
 */
export function entrecomillar(texto: string): string {
  const limpio = limpiar(texto).replace(/\s+$/, "");
  if (!limpio.trim()) return "";
  const racha = Math.max(0, ...[...limpio.matchAll(/`+/g)].map((m) => m[0].length));
  const valla = "`".repeat(Math.max(3, racha + 1));
  return `${valla}\n${limpio}\n${valla}`;
}

/** Longitud en unidades de texto (UTF-16), no en grafemas: lo que cuenta un portapapeles */
export const unidades = (texto: string): number => texto.length;

export type ClaveSeccion = "estado" | "ficha" | "avisos" | "causas" | "quien-sabe" | "cambios" | "alternativas" | "notas";

export interface Seccion {
  clave: ClaveSeccion;
  titulo: string;
  /** Cada línea es una pieza que se quita entera al recortar (una nota va en una sola, ya entrecomillada) */
  lineas: string[];
  /** Las líneas son el texto del autor: van todas juntas dentro de una valla */
  literal?: boolean;
}

export function componerSeccion(s: Seccion): string {
  const cuerpo = s.literal ? entrecomillar(s.lineas.join("\n")) : s.lineas.join("\n");
  return `## ${s.titulo}\n\n${cuerpo}`;
}

/** La cabecera (título), las secciones en su orden, el aviso de recorte si lo hay y la última línea */
export function componer(cabecera: string, secciones: Seccion[], cierre: string, aviso?: string | null): string {
  return [cabecera, ...(aviso ? [aviso] : []), ...secciones.map(componerSeccion), cierre].join("\n\n") + "\n";
}

/** De menos a más importante: lo primero que se quita (RF-27). Estado y avisos no se quitan nunca */
export const ORDEN_RECORTE: ClaveSeccion[] = ["notas", "alternativas", "ficha", "cambios", "quien-sabe", "causas"];

const NOMBRE_RECORTE: Record<ClaveSeccion, string> = {
  notas: "notas de la pizarra",
  alternativas: "alternativas descartadas",
  ficha: "ficha",
  cambios: "cambios",
  "quien-sabe": "quién sabe qué",
  causas: "causas y efectos",
  estado: "estado",
  avisos: "avisos",
};

/**
 * Si el planteamiento pasa de `max`, quita piezas enteras empezando por lo menos
 * importante (la ficha, por el final) hasta que quepa, y devuelve la línea de
 * aviso que lo dice. El título, el estado, los avisos y la última línea se quedan.
 */
export function recortarPlanteamiento(
  cabecera: string,
  secciones: Seccion[],
  cierre: string,
  max = MAX_PLANTEAMIENTO,
): { secciones: Seccion[]; aviso: string | null; recortado: boolean } {
  if (unidades(componer(cabecera, secciones, cierre)) <= max) return { secciones, aviso: null, recortado: false };
  let actual = secciones.map((s) => ({ ...s, lineas: [...s.lineas] }));
  const quitadas = new Set<ClaveSeccion>();
  const aviso = () => `> Aviso: el planteamiento pasaba de ${max.toLocaleString("es")} caracteres y se recortó (se quitó parte de: ${[...quitadas].map((k) => NOMBRE_RECORTE[k]).join(", ")}).`;
  const largo = () => unidades(componer(cabecera, actual.filter((s) => s.lineas.length), cierre, aviso()));
  // El aviso ocupa sitio: se cuenta con lo que se haya quitado hasta ahora
  for (const clave of ORDEN_RECORTE) {
    const s = actual.find((x) => x.clave === clave);
    if (!s?.lineas.length) continue;
    const antes = s.lineas.length;
    quitadas.add(clave);
    while (s.lineas.length && largo() > max) {
      // Se quita de golpe lo que sobra, pieza a pieza entera, y se vuelve a medir
      let falta = largo() - max;
      while (s.lineas.length && falta > 0) falta -= unidades(s.lineas.pop()!) + 1;
    }
    if (s.lineas.length === antes) quitadas.delete(clave);
    if (largo() <= max) break;
  }
  const quedan = actual.filter((s) => s.lineas.length);
  return { secciones: quedan, aviso: aviso(), recortado: true };
}
