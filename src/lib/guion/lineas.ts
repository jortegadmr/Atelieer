// Tipo de cada línea de un guion (spec 013, RF-3, RF-4 y RF-31). Texto plano
// inspirado en Fountain: el tipo sale de la línea y de su contexto (la anterior
// y la siguiente); un prefijo estricto lo fuerza. Funciones puras.

import type { TipoLinea } from "./tipos";

export interface LineaClasificada {
  tipo: TipoLinea;
  /** El texto sin el prefijo forzado */
  texto: string;
  forzado: boolean;
}

/** Los tipos que se pueden forzar, y su prefijo en disco */
export const PREFIJOS = { encabezado: ".", accion: "!", personaje: "@", transicion: ">" } as const;
export type TipoForzable = keyof typeof PREFIJOS;

const LETRA_O_DIGITO = /^[\p{L}\p{N}]/u;
const LETRA = /^\p{L}/u;

/** El prefijo estricto de una línea: «...y entonces», «.5 segundos» o «!!» no cuentan como forzados */
function forzada(linea: string): { tipo: TipoForzable; texto: string } | null {
  const c = linea[0];
  const resto = linea.slice(1);
  if (c === "." && LETRA.test(resto)) return { tipo: "encabezado", texto: resto };
  if (c === "!" && LETRA_O_DIGITO.test(resto)) return { tipo: "accion", texto: resto };
  if (c === "@" && LETRA.test(resto)) return { tipo: "personaje", texto: resto };
  if (c === ">" && (resto === "" || /^[ \p{L}\p{N}]/u.test(resto))) return { tipo: "transicion", texto: resto.trimStart() };
  return null;
}

/** ¿Se puede escribir este texto con el tipo forzado y que se vuelva a leer igual? */
export function puedeForzar(texto: string, tipo: TipoForzable): boolean {
  const f = forzada(PREFIJOS[tipo] + texto);
  return !!f && f.tipo === tipo && f.texto === (tipo === "transicion" ? texto.trimStart() : texto);
}

export function conPrefijo(texto: string, tipo: TipoForzable): string {
  return PREFIJOS[tipo] + texto;
}

const ENCABEZADO = /^(?:INT\.\/EXT|EXT\.\/INT|INT\/EXT|EXT\/INT|I\/E|INT|EXT)\.[ \t]+\S/i;
const EXTENSION_FINAL = /[ \t]*\([^()]*\)[ \t]*$/;
const MAX_PERSONAJE = 40;

const esBlanca = (l: string) => /^\s*$/.test(l);

function todoMayusculas(s: string): boolean {
  return s !== s.toLowerCase() ? s === s.toUpperCase() : false;
}

/** Regla 7 sin mirar la línea siguiente (para Enter: ¿lo escrito es un personaje?) */
export function parecePersonaje(linea: string): boolean {
  // Una referencia [[Vera]] se ve en mayúsculas en una línea de personaje: cuenta como VERA
  const t = linea.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, (_m, nombre: string) => enMayusculas(nombre)).trim();
  if (!t || t.length > MAX_PERSONAJE || /[.!?]$/.test(t)) return false;
  const nombre = t.replace(EXTENSION_FINAL, "");
  return !!nombre && todoMayusculas(nombre) && !ENCABEZADO.test(t);
}

/** Clasifica un guion línea a línea (RF-3). Las reglas, en orden, están en el plan */
export function clasificar(lineas: string[]): LineaClasificada[] {
  const r: LineaClasificada[] = [];
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i]!;
    const anterior = r[i - 1]?.tipo;
    const dentroDeDialogo = anterior === "personaje" || anterior === "parentesis" || anterior === "dialogo";
    const f = forzada(l);
    if (f) r.push({ tipo: f.tipo, texto: f.texto, forzado: true });
    else if (esBlanca(l)) r.push({ tipo: "blanco", texto: l, forzado: false });
    else if (ENCABEZADO.test(l)) r.push({ tipo: "encabezado", texto: l, forzado: false });
    else if (dentroDeDialogo && /^\s*\(.*\)\s*$/.test(l)) r.push({ tipo: "parentesis", texto: l, forzado: false });
    else if (dentroDeDialogo) r.push({ tipo: "dialogo", texto: l, forzado: false });
    else if (todoMayusculas(l.trim()) && l.trim().endsWith(":")) r.push({ tipo: "transicion", texto: l, forzado: false });
    else if ((i === 0 || anterior === "blanco") && parecePersonaje(l) && i + 1 < lineas.length && !esBlanca(lineas[i + 1]!))
      r.push({ tipo: "personaje", texto: l, forzado: false });
    else r.push({ tipo: "accion", texto: l, forzado: false });
  }
  return r;
}

export const clasificarTexto = (texto: string): LineaClasificada[] => clasificar(texto.split("\n"));

// ---- Enter y Tab (RF-4)

export type TipoPendiente = "accion" | "personaje" | "dialogo";

export interface ContextoEnter {
  /** El tipo de la línea donde está el cursor (el pendiente si está vacía y lo tiene) */
  tipo: TipoLinea;
  /** La línea no tiene texto */
  vacia: boolean;
  alFinal: boolean;
  alPrincipio: boolean;
}

export type AccionEnter =
  /** Un blanco y una línea nueva en acción */
  | { que: "blanco-y-linea"; pendiente: TipoPendiente }
  /** Una línea nueva pegada a la actual */
  | { que: "linea-pegada"; pendiente: TipoPendiente }
  /** Se quita la línea vacía; queda un blanco y una línea nueva */
  | { que: "cerrar-dialogo"; pendiente: TipoPendiente }
  /** No hace nada (no se apilan líneas vacías) */
  | { que: "nada" }
  /** Parte la línea en dos; la segunda recibe el tipo que le toque */
  | { que: "partir" }
  /** Un blanco encima; la línea conserva su tipo */
  | { que: "blanco-encima" };

/** Qué hace Enter sin selección (con selección, primero se borra y luego se aplica esto) */
export function siguienteAlEnter(c: ContextoEnter, textoLinea = ""): AccionEnter {
  if (!c.alFinal) return c.alPrincipio && !c.vacia ? { que: "blanco-encima" } : { que: "partir" };
  if (c.vacia) {
    if (c.tipo === "dialogo" || c.tipo === "parentesis") return { que: "cerrar-dialogo", pendiente: "personaje" };
    return { que: "nada" };
  }
  if (c.tipo === "personaje" || c.tipo === "parentesis" || c.tipo === "dialogo") return { que: "linea-pegada", pendiente: "dialogo" };
  if ((c.tipo === "accion" || c.tipo === "blanco") && parecePersonaje(textoLinea)) return { que: "linea-pegada", pendiente: "dialogo" };
  return { que: "blanco-y-linea", pendiente: "accion" };
}

const CICLO: Array<TipoForzable | undefined> = [undefined, "accion", "personaje", "encabezado", "transicion"];

/** Tab (adelante) y Mayús + Tab (atrás): auto → acción → personaje → encabezado → transición → auto */
export function cambiarForzado(actual: TipoForzable | undefined, atras = false): TipoForzable | undefined {
  const i = CICLO.indexOf(actual);
  return CICLO[(i + (atras ? CICLO.length - 1 : 1)) % CICLO.length];
}

/** Lo escrito en un personaje pendiente se guarda en mayúsculas (plan, «línea vacía con tipo pendiente») */
export const enMayusculas = (s: string): string => s.toLocaleUpperCase("es");

// ---- Cambios por fuera (RF-31)

export interface CambioDeTipo {
  /** Línea, desde 1, del texto nuevo */
  linea: number;
  de: TipoLinea;
  a: TipoLinea;
}

/**
 * Qué líneas cambian de tipo entre dos versiones de un guion (por ejemplo, tras
 * un cambio de blancos hecho en Obsidian). Se comparan por posición, hasta la
 * más corta de las dos.
 */
export function cambiosDeTipo(antes: string, despues: string): CambioDeTipo[] {
  const a = clasificarTexto(antes);
  const d = clasificarTexto(despues);
  const r: CambioDeTipo[] = [];
  for (let i = 0; i < Math.min(a.length, d.length); i++) if (a[i]!.tipo !== d[i]!.tipo) r.push({ linea: i + 1, de: a[i]!.tipo, a: d[i]!.tipo });
  return r;
}
