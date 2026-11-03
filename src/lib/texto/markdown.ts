// Texto visual (spec 018): un intérprete propio de un subconjunto de Markdown
// para MOSTRAR el texto formateado, sin HTML ni librerías. Devuelve un árbol que
// la interfaz pinta con elementos normales: nada del texto del autor se ejecuta.
// El texto original no se toca; esto solo lo lee.

export type Inline =
  | { t: "txt"; s: string }
  | { t: "neg"; c: Inline[] }
  | { t: "cur"; c: Inline[] }
  | { t: "cod"; s: string }
  | { t: "enl"; nombre: string; texto: string }
  | { t: "pend" };

export type Bloque =
  | { t: "h"; n: 1 | 2 | 3 | 4; c: Inline[] }
  | { t: "p"; c: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; items: Inline[][] }
  | { t: "cita"; c: Inline[] }
  | { t: "hr" };

/**
 * Los comentarios `<!-- … -->` cerrados, vaciados: con `rellenar` se sustituyen por espacios
 * (y se conservan los saltos de línea, para que los números de línea no cambien); sin él, se quitan.
 * Un `<!--` que no se cierra es texto. Sin expresiones regulares para buscar: lineal.
 */
function sinComentariosCon(md: string, rellenar: boolean): string {
  let salida = "";
  let desde = 0;
  while (desde < md.length) {
    const a = md.indexOf("<!--", desde);
    if (a === -1) break;
    const b = md.indexOf("-->", a + 4);
    if (b === -1) break;
    salida += md.slice(desde, a);
    if (rellenar) salida += md.slice(a, b + 3).replace(/[^\n]/g, " ");
    desde = b + 3;
  }
  return salida + md.slice(desde);
}

/** Quita los comentarios, solo para mostrar */
export const sinComentarios = (md: string) => sinComentariosCon(md, false);

// ---- Inline

// Una expresión nueva en cada llamada: la recursión (negrita dentro de cursiva) no comparte posición.
// Los enlaces se acotan a 200 caracteres para que un texto hostil no la haga cuadrática.
const PATRON = () => /\[\[([^\]\n]{1,200}?)\]\]|\[PENDIENTE\]|`([^`\n]+)`|\*\*(?!\s)([^*\n]+?)(?<!\s)\*\*|(?<![*\w])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![*\w])|(?<!\w)_(?!\s)([^_\n]+?)(?<!\s)_(?!\w)/g;

export function inline(texto: string): Inline[] {
  const r: Inline[] = [];
  let desde = 0;
  const patron = PATRON();
  for (let m = patron.exec(texto); m; m = patron.exec(texto)) {
    if (m.index > desde) r.push({ t: "txt", s: texto.slice(desde, m.index) });
    if (m[1] !== undefined) {
      const [destino, alias] = m[1].split("|");
      const nombre = (destino ?? "").split("#")[0]!.split("/").pop()!.trim();
      r.push({ t: "enl", nombre, texto: (alias ?? destino ?? "").trim() });
    } else if (m[0] === "[PENDIENTE]") r.push({ t: "pend" });
    else if (m[2] !== undefined) r.push({ t: "cod", s: m[2] });
    else if (m[3] !== undefined) r.push({ t: "neg", c: inline(m[3]) });
    else r.push({ t: "cur", c: inline((m[4] ?? m[5])!) });
    desde = m.index + m[0].length;
  }
  if (desde < texto.length) r.push({ t: "txt", s: texto.slice(desde) });
  return r;
}

// ---- Bloques

const esHr = (l: string) => /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(l);
const ARRANQUE = /^(#{1,6}\s|\s*[-*+]\s|\s*\d+[.)]\s|\s*>)/;

/** Título de una línea `## Texto ##`, o null. Sin expresiones que se enreden con rachas de espacios */
function titulo(l: string): { n: number; texto: string } | null {
  const m = /^(#{1,6})[ \t]+(\S.*)$/.exec(l);
  if (!m) return null;
  let t = m[2]!.trimEnd();
  let k = t.length;
  while (k > 0 && t[k - 1] === "#") k--;
  if (k < t.length && k > 0 && (t[k - 1] === " " || t[k - 1] === "\t")) t = t.slice(0, k).trimEnd();
  return { n: m[1]!.length, texto: t };
}

/** Interpreta un trozo de Markdown sin tablas: títulos, párrafos, listas, citas y líneas */
export function bloques(md: string): Bloque[] {
  // Cualquier salto de línea (también \r sueltos y los separadores Unicode) separa líneas
  const lineas = sinComentarios(md).replace(/\r\n|[\r\u2028\u2029]/g, "\n").split("\n");
  const r: Bloque[] = [];
  let i = 0;
  while (i < lineas.length) {
    const l = lineas[i]!;
    if (!l.trim()) {
      i++;
      continue;
    }
    const h = titulo(l);
    if (h) {
      r.push({ t: "h", n: Math.min(h.n, 4) as 1 | 2 | 3 | 4, c: inline(h.texto) });
      i++;
    } else if (esHr(l)) {
      r.push({ t: "hr" });
      i++;
    } else if (/^\s*[-*+]\s+/.test(l)) {
      const items: Inline[][] = [];
      while (i < lineas.length && /^\s*[-*+]\s+/.test(lineas[i]!)) items.push(inline(lineas[i++]!.replace(/^\s*[-*+]\s+/, "")));
      r.push({ t: "ul", items });
    } else if (/^\s*\d+[.)]\s+/.test(l)) {
      const items: Inline[][] = [];
      while (i < lineas.length && /^\s*\d+[.)]\s+/.test(lineas[i]!)) items.push(inline(lineas[i++]!.replace(/^\s*\d+[.)]\s+/, "")));
      r.push({ t: "ol", items });
    } else if (/^\s*>/.test(l)) {
      const partes: string[] = [];
      while (i < lineas.length && /^\s*>/.test(lineas[i]!)) partes.push(lineas[i++]!.replace(/^\s*>\s?/, ""));
      r.push({ t: "cita", c: inline(partes.join(" ").trim()) });
    } else {
      // Siempre avanza al menos una línea, aunque parezca el arranque de otra cosa
      const partes: string[] = [lineas[i++]!.trim()];
      while (i < lineas.length && lineas[i]!.trim() && !ARRANQUE.test(lineas[i]!) && !esHr(lineas[i]!)) partes.push(lineas[i++]!.trim());
      r.push({ t: "p", c: inline(partes.join(" ")) });
    }
  }
  return r;
}

// ---- Tablas como formulario

export interface TablaMd {
  filas: string[][];
  /** Marcas de alineación de la línea separadora (`---`, `:---`, `---:`, `:---:`), una por columna */
  separadores?: string[];
}

/** Trozo del texto: o una tabla (con las líneas que ocupa) o Markdown corriente */
export type Trozo = { tipo: "texto"; ini: number; fin: number; fuente: string } | { tipo: "tabla"; ini: number; fin: number; fuente: string; tabla: TablaMd };

const esFilaTabla = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const esSeparador = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l) && l.includes("-");

export function celdas(linea: string): string[] {
  const t = linea.trim().replace(/^\|/, "").replace(/\|$/, "");
  const marca = "\u0000";
  return t
    .replace(/\\\|/g, marca)
    .split("|")
    .map((c) => c.split(marca).join("|").trim());
}

const celda = (c: string) => c.replace(/\|/g, "\\|").replace(/\r?\n|\r/g, " ");

/** Parte el texto en tablas y trozos corrientes, por líneas (los números sirven para reponer cada tabla en su sitio). Una tabla dentro de un comentario no cuenta */
export function partirTrozos(md: string): Trozo[] {
  const normal = md.replace(/\r\n/g, "\n");
  const lineas = normal.split("\n");
  const visibles = sinComentariosCon(normal, true).split("\n");
  const r: Trozo[] = [];
  let i = 0;
  let desde = 0;
  const cerrar = (hasta: number) => {
    if (hasta > desde) r.push({ tipo: "texto", ini: desde, fin: hasta, fuente: lineas.slice(desde, hasta).join("\n") });
  };
  while (i < lineas.length) {
    if (esFilaTabla(visibles[i]!) && i + 1 < lineas.length && esSeparador(visibles[i + 1]!)) {
      cerrar(i);
      let j = i + 2;
      while (j < lineas.length && esFilaTabla(visibles[j]!)) j++;
      const filas = [celdas(visibles[i]!), ...visibles.slice(i + 2, j).map(celdas)];
      const ancho = filas.reduce((m, f) => Math.max(m, f.length), 0);
      for (const f of filas) while (f.length < ancho) f.push("");
      const separadores = celdas(visibles[i + 1]!);
      r.push({ tipo: "tabla", ini: i, fin: j, fuente: lineas.slice(i, j).join("\n"), tabla: { filas, separadores } });
      i = desde = j;
    } else i++;
  }
  cerrar(lineas.length);
  return r;
}

export function tablaATexto(t: TablaMd): string {
  const [cab, ...resto] = t.filas;
  if (!cab) return "";
  const fila = (f: string[]) => `| ${f.map(celda).join(" | ")} |`;
  // Se conserva la alineación de cada columna; las columnas nuevas llevan «---»
  const sep = cab.map((_, j) => (/^:?-{2,}:?$/.test(t.separadores?.[j] ?? "") ? t.separadores![j]! : "---"));
  return [fila(cab), `| ${sep.join(" | ")} |`, ...resto.map(fila)].join("\n");
}

const terminador = (linea: string) => /\r?\n$/.exec(linea)?.[0] ?? "";

/**
 * El texto entero con una tabla cambiada; el resto, byte a byte como estaba. Cada línea de la
 * tabla conserva su final de línea (aunque el texto mezcle \n y \r\n); las nuevas usan el de la última.
 */
export function conTabla(md: string, trozo: Extract<Trozo, { tipo: "tabla" }>, nueva: TablaMd): string {
  const originales = md.split(/(?<=\n)/);
  const nuevas = tablaATexto(nueva).split("\n");
  const ultimo = terminador(originales[trozo.fin - 1] ?? "");
  const eol = md.includes("\r\n") ? "\r\n" : "\n";
  const lineas = nuevas.map((l, k) => {
    const esUltima = k === nuevas.length - 1;
    if (esUltima) return l + ultimo;
    // Entre líneas siempre hay salto
    const base = trozo.ini + k < trozo.fin ? terminador(originales[trozo.ini + k] ?? "") : ultimo;
    return l + (base || eol);
  });
  return originales.slice(0, trozo.ini).join("") + lineas.join("") + originales.slice(trozo.fin).join("");
}

/** La n-ésima tabla del texto, o undefined */
function tablaN(md: string, n: number): Extract<Trozo, { tipo: "tabla" }> | undefined {
  return partirTrozos(md).filter((t): t is Extract<Trozo, { tipo: "tabla" }> => t.tipo === "tabla")[n];
}

/** Cambia una celda de la n-ésima tabla del texto QUE HAY AHORA (no de un texto viejo). La fila 0 es la cabecera */
export function conCelda(md: string, nTabla: number, fila: number, col: number, valor: string): string {
  const t = tablaN(md, nTabla);
  if (!t || t.tabla.filas[fila]?.[col] === undefined) return md;
  const filas = t.tabla.filas.map((f) => [...f]);
  filas[fila]![col] = valor;
  return conTabla(md, t, { ...t.tabla, filas });
}

/** Añade una fila vacía al final de la n-ésima tabla del texto que hay ahora */
export function conFilaNueva(md: string, nTabla: number): string {
  const t = tablaN(md, nTabla);
  if (!t) return md;
  const ancho = t.tabla.filas[0]?.length ?? 2;
  return conTabla(md, t, { ...t.tabla, filas: [...t.tabla.filas.map((f) => [...f]), Array.from({ length: ancho }, () => "")] });
}
