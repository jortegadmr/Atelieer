// La tabla «Alternativas descartadas» de la ficha de un arco (spec 009, RF-45
// a RF-48). Se trabaja línea a línea sobre el texto crudo: lo que no es la
// fila añadida o quitada queda igual, con el BOM y el fin de línea de la nota.

import { sigueAbierto } from "./apartados";
import { celdas, clave, enUnaLinea, esSeparador } from "./md";

const TITULO = "Alternativas descartadas";
const CABECERA = ["| Idea | Por qué se descartó |", "| --- | --- |"];

interface Linea {
  texto: string;
  /** "\r\n", "\n" o "" (la última, sin salto) */
  fin: string;
}

interface Nota {
  bom: string;
  ls: Linea[];
  /** El fin de línea de la nota, para lo que se añade */
  fin: string;
  /** Primera línea después de las propiedades */
  cuerpo: number;
}

function partir(t: string): Nota {
  const bom = t.charCodeAt(0) === 0xfeff ? t[0] : "";
  const resto = t.slice(bom.length);
  const ls: Linea[] = [];
  let i = 0;
  while (i < resto.length) {
    const n = resto.indexOf("\n", i);
    if (n < 0) {
      ls.push({ texto: resto.slice(i), fin: "" });
      break;
    }
    const cr = n > i && resto[n - 1] === "\r";
    ls.push({ texto: resto.slice(i, cr ? n - 1 : n), fin: cr ? "\r\n" : "\n" });
    i = n + 1;
  }
  let cuerpo = 0;
  if (ls[0]?.texto.trimEnd() === "---") {
    const cierre = ls.findIndex((l, k) => k > 0 && l.texto.trimEnd() === "---");
    if (cierre > 0) cuerpo = cierre + 1;
  }
  return { bom, ls, fin: resto.includes("\r\n") ? "\r\n" : "\n", cuerpo };
}

const juntar = (n: Nota) => n.bom + n.ls.map((l) => l.texto + l.fin).join("");

const esFila = (l: Linea | undefined) => !!l && l.texto.trim().startsWith("|");

/** Las líneas de dentro de un bloque de código o de un comentario `<!-- -->`: no se ven como texto */
function ocultas(n: Nota): Set<number> {
  const r = new Set<number>();
  let valla: string | null = null;
  let comentario = false;
  for (let i = n.cuerpo; i < n.ls.length; i++) {
    const t = n.ls[i].texto;
    if (comentario) {
      r.add(i);
      comentario = sigueAbierto(t, true);
      continue;
    }
    const v = t.match(/^ {0,3}(`{3,}|~{3,})/);
    if (valla) {
      r.add(i);
      if (v && v[1][0] === valla[0] && v[1].length >= valla.length) valla = null;
      continue;
    }
    if (v) {
      r.add(i);
      valla = v[1];
      continue;
    }
    comentario = sigueAbierto(t, false);
    if (comentario || t.includes("<!--")) r.add(i);
  }
  return r;
}

/** Los títulos `#`…`######` del cuerpo; los de dentro de un bloque de código o un comentario no cuentan */
function titulos(n: Nota, fuera = ocultas(n)): { i: number; texto: string }[] {
  const r: { i: number; texto: string }[] = [];
  for (let i = n.cuerpo; i < n.ls.length; i++) {
    if (fuera.has(i)) continue;
    const t = n.ls[i].texto;
    const m = t.match(/^ {0,3}#{1,6}[ \t]+(.*?)[ \t#]*$/);
    if (m) r.push({ i, texto: m[1] });
  }
  return r;
}

const esCabecera = (n: Nota, i: number) => esFila(n.ls[i]) && esSeparador(n.ls[i + 1]?.texto ?? "");

/**
 * Dónde está la tabla: la de debajo del título (de cualquier nivel) o, si no
 * hay título, la primera cuya primera columna es «Idea» (RF-46). `titulo` es
 * el índice del título cuando lo hay pero sin tabla debajo.
 */
function buscar(n: Nota): { cabecera: number } | { titulo: number } | null {
  const fuera = ocultas(n);
  const ts = titulos(n, fuera);
  const cabecera = (i: number) => !fuera.has(i) && esCabecera(n, i);
  const k = ts.findIndex((t) => clave(t.texto) === clave(TITULO));
  if (k >= 0) {
    const hasta = ts[k + 1]?.i ?? n.ls.length;
    for (let i = ts[k].i + 1; i < hasta; i++) if (cabecera(i)) return { cabecera: i };
    return { titulo: ts[k].i };
  }
  for (let i = n.cuerpo; i < n.ls.length; i++) if (cabecera(i) && clave(celdas(n.ls[i].texto)[0] ?? "") === "idea") return { cabecera: i };
  return null;
}

/** Las filas de la tabla: [primera, después de la última) */
function filas(n: Nota, cabecera: number): [number, number] {
  let fin = cabecera + 2;
  while (fin < n.ls.length && esFila(n.ls[fin])) fin++;
  return [cabecera + 2, fin];
}

const celda = (s: string) => enUnaLinea(s).replace(/\|/g, "\\|");

/** «| título | porqué |», con «Sin título» si no tiene */
export function filaAlternativa(titulo: string, porque: string): string {
  return `|${[celda(titulo) || "Sin título", celda(porque)].map((c) => (c ? ` ${c} ` : " ")).join("|")}|`;
}

/** Las dos celdas de una fila, para comparar sin mirar espacios */
const clavesDe = (fila: string) => {
  const c = celdas(fila);
  return JSON.stringify([c[0] ?? "", c[1] ?? ""]);
};

/** Mete líneas en `i` con el fin de línea de la nota; si van al final, la última línea gana su salto */
function meter(n: Nota, i: number, textos: string[]): void {
  if (i > 0 && i === n.ls.length && n.ls[i - 1].fin === "") n.ls[i - 1].fin = n.fin;
  n.ls.splice(i, 0, ...textos.map((texto) => ({ texto, fin: n.fin })));
}

const enBlanco = (l: Linea | undefined) => !l || !l.texto.trim();

/** Las filas de la tabla «Alternativas descartadas», sin las vacías (spec 012, RF-23.7): solo lee */
export function leerAlternativas(texto: string): { titulo: string; porque: string }[] {
  const n = partir(texto);
  const donde = buscar(n);
  if (!donde || !("cabecera" in donde)) return [];
  const [desde, hasta] = filas(n, donde.cabecera);
  const r: { titulo: string; porque: string }[] = [];
  for (let i = desde; i < hasta; i++) {
    const c = celdas(n.ls[i].texto);
    if (c.every((x) => !x.trim())) continue;
    r.push({ titulo: (c[0] ?? "").trim(), porque: (c[1] ?? "").trim() });
  }
  return r;
}

/** El texto con la fila añadida; null si ya hay una fila igual (RF-47) */
export function anadirAlternativa(texto: string, titulo: string, porque: string): string | null {
  const n = partir(texto);
  const fila = filaAlternativa(titulo, porque);
  const donde = buscar(n);
  if (donde && "cabecera" in donde) {
    const [desde, hasta] = filas(n, donde.cabecera);
    const buscada = clavesDe(fila);
    for (let i = desde; i < hasta; i++) if (clavesDe(n.ls[i].texto) === buscada) return null;
    // La fila vacía de la plantilla se sustituye por la primera
    const vacia = n.ls.slice(desde, hasta).findIndex((l) => celdas(l.texto).every((c) => !c));
    if (vacia >= 0) n.ls[desde + vacia].texto = fila;
    else meter(n, hasta, [fila]);
    return juntar(n);
  }
  if (donde) {
    // Título sin tabla: la tabla de la plantilla, debajo
    const i = donde.titulo + 1;
    meter(n, i, ["", ...CABECERA, fila, ...(enBlanco(n.ls[i]) ? [] : [""])]);
    return juntar(n);
  }
  // Sin título: el apartado, antes de Fuentes o al final
  const fuentes = titulos(n).find((t) => clave(t.texto) === "fuentes");
  const i = fuentes ? fuentes.i : n.ls.length;
  const antes = enBlanco(n.ls[i - 1]) || i === 0 ? [] : [""];
  meter(n, i, [...antes, `## ${TITULO}`, "", ...CABECERA, fila, ...(fuentes ? [""] : [])]);
  return juntar(n);
}

/**
 * Quita la fila, solo si está tal cual y `otraLaDa` es false (ninguna otra
 * pieza descartada del arco da la misma fila, RF-48). Si era la única, vuelve
 * la fila vacía de la plantilla.
 */
export function quitarAlternativa(texto: string, titulo: string, porque: string, otraLaDa: boolean): { texto: string; quitada: boolean } {
  const n = partir(texto);
  const donde = buscar(n);
  if (otraLaDa || !donde || !("cabecera" in donde)) return { texto, quitada: false };
  const [desde, hasta] = filas(n, donde.cabecera);
  const buscada = clavesDe(filaAlternativa(titulo, porque));
  let i = desde;
  while (i < hasta && clavesDe(n.ls[i].texto) !== buscada) i++;
  if (i === hasta) return { texto, quitada: false };
  const [quitada] = n.ls.splice(i, 1);
  if (hasta - desde === 1) {
    const columnas = Math.max(1, celdas(n.ls[donde.cabecera].texto).length);
    n.ls.splice(i, 0, { texto: `|${" |".repeat(columnas)}`, fin: quitada.fin });
  } else if (quitada.fin === "" && i > 0) n.ls[i - 1].fin = "";
  return { texto: juntar(n), quitada: true };
}
