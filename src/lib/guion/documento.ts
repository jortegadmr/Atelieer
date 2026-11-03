// Modelo del editor de guion (spec 013, D9, RF-5, RF-13): el documento como
// datos puros, sin DOM. Una línea es una lista de unidades; una unidad es un
// carácter (un punto de código) o una referencia entera, que cuenta como UNA
// unidad: el cursor la salta y retroceso la borra de una vez. Todas las
// operaciones devuelven un documento nuevo y dónde queda el cursor; la vista
// las aplica cuando el navegador avisa con `beforeinput`.
//
// En disco no hay nada de esto: `aTexto` da el texto del guion y `desdeTexto`
// lo vuelve a leer, idéntico. Un tipo pendiente (la línea vacía a la que Enter
// ya le ha asignado un papel) vive solo en memoria y no se escribe.

import { clasificar, enMayusculas, PREFIJOS, siguienteAlEnter, type TipoForzable, type TipoPendiente } from "./lineas";
import { partir, type Ref } from "./referencias";
import { TOPE_BORRADO, TOPE_BYTES, TOPE_PAGINAS, type TipoLinea } from "./tipos";
import { medir } from "./paginas";

export type Unidad = string | Ref;

export interface Linea {
  u: Unidad[];
  /** El tipo se fuerza con prefijo en disco (. ! @ >) */
  forzado?: TipoForzable;
  /** Línea vacía con un papel ya asignado por Enter o Tab; no se escribe */
  tipoPendiente?: TipoPendiente;
}

export type Documento = readonly Linea[];

export interface Pos {
  l: number;
  u: number;
}

export interface Resultado {
  doc: Documento;
  pos: Pos;
}

// ---- Texto <-> documento

const esRef = (x: Unidad): x is Ref => typeof x !== "string";

function unidadesDeTexto(s: string): Unidad[] {
  return partir(s).flatMap<Unidad>((seg) => (seg.t === "texto" ? [...seg.s] : [seg]));
}

export function unidadesATexto(u: readonly Unidad[]): string {
  return u.map((x) => (esRef(x) ? x.crudo : x)).join("");
}

/** ¿Escrito con este prefijo, se volvería a leer con ese tipo forzado? */
function sePuedeForzar(texto: string, tipo: TipoForzable): boolean {
  const c = clasificar([PREFIJOS[tipo] + texto])[0]!;
  return c.forzado && c.tipo === tipo;
}

export function textoDeLinea(l: Linea): string {
  const t = unidadesATexto(l.u);
  return l.forzado && t !== "" && sePuedeForzar(t, l.forzado) ? PREFIJOS[l.forzado] + t : t;
}

export function desdeTexto(texto: string): Documento {
  const lineas = texto.split("\n");
  const cl = clasificar(lineas);
  return lineas.map((l, i): Linea => {
    const c = cl[i]!;
    return c.forzado ? { u: unidadesDeTexto(l.slice(1)), forzado: c.tipo as TipoForzable } : { u: unidadesDeTexto(l) };
  });
}

export function aTexto(doc: Documento): string {
  return doc.map(textoDeLinea).join("\n");
}

export const documentoVacio = (): Documento => [{ u: [] }];

const largo = (doc: Documento, l: number) => doc[l]!.u.length;
const finDe = (doc: Documento): Pos => ({ l: doc.length - 1, u: largo(doc, doc.length - 1) });

/** Los tipos de cada línea tal como se ven, contando los pendientes (una línea vacía con papel ya lo es) */
export function tiposDelDocumento(doc: Documento): TipoLinea[] {
  // Una línea de diálogo pendiente cuenta como con texto: así el personaje de arriba ya es un personaje
  const textos = doc.map((l) => (l.u.length === 0 && l.tipoPendiente === "dialogo" ? "·" : textoDeLinea(l)));
  const tipos = clasificar(textos).map((c) => c.tipo);
  return doc.map((l, i) => {
    if (l.u.length > 0) return tipos[i]!;
    if (l.forzado) return l.forzado;
    if (l.tipoPendiente) return l.tipoPendiente;
    return tipos[i]!;
  });
}

// ---- Posiciones y rangos

export function ordenar(a: Pos, b: Pos): [Pos, Pos] {
  return a.l < b.l || (a.l === b.l && a.u <= b.u) ? [a, b] : [b, a];
}

export function limitar(doc: Documento, p: Pos): Pos {
  const l = Math.max(0, Math.min(doc.length - 1, p.l));
  return { l, u: Math.max(0, Math.min(largo(doc, l), p.u)) };
}

const igual = (a: Pos, b: Pos) => a.l === b.l && a.u === b.u;

/** La referencia que hay justo antes (`-1`) o después (`1`) del cursor, o la seleccionada entera */
export function referenciaEn(doc: Documento, p: Pos, lado: -1 | 1): Ref | null {
  const u = doc[p.l]?.u[lado === -1 ? p.u - 1 : p.u];
  return u !== undefined && esRef(u) ? u : null;
}

/** La referencia que hay en una posición del texto mostrado; null si no hay ninguna */
export function referenciaDe(doc: Documento, l: number, u: number): Ref | null {
  const x = doc[l]?.u[u];
  return x !== undefined && esRef(x) ? x : null;
}

// ---- Borrar

/** Borra de `a` a `b`; la línea que queda conserva el tipo forzado de la primera, o el de la última si la primera quedó vacía */
export function borrarRango(doc: Documento, desde: Pos, hasta: Pos): Resultado {
  const [a, b] = ordenar(limitar(doc, desde), limitar(doc, hasta));
  if (igual(a, b)) return { doc, pos: a };
  const primera = doc[a.l]!;
  const ultima = doc[b.l]!;
  const u = [...primera.u.slice(0, a.u), ...ultima.u.slice(b.u)];
  const cabeza = a.u === 0 && b.l !== a.l ? ultima : primera;
  const linea: Linea = { u, ...(cabeza.forzado ? { forzado: cabeza.forzado } : {}), ...(cabeza.tipoPendiente && u.length === 0 ? { tipoPendiente: cabeza.tipoPendiente } : {}) };
  return { doc: [...doc.slice(0, a.l), linea, ...doc.slice(b.l + 1)], pos: a };
}

/** Retroceso: una unidad (una referencia entera cuenta como una) o, al principio de línea, la une con la anterior */
export function borrarAtras(doc: Documento, p: Pos): Resultado {
  if (p.u > 0) return borrarRango(doc, { l: p.l, u: p.u - 1 }, p);
  if (p.l > 0) return borrarRango(doc, { l: p.l - 1, u: largo(doc, p.l - 1) }, p);
  return { doc, pos: p };
}

export function borrarAdelante(doc: Documento, p: Pos): Resultado {
  if (p.u < largo(doc, p.l)) return borrarRango(doc, p, { l: p.l, u: p.u + 1 });
  if (p.l < doc.length - 1) return borrarRango(doc, p, { l: p.l + 1, u: 0 });
  return { doc, pos: p };
}

// ---- Insertar

function conLinea(doc: Documento, l: number, linea: Linea): Documento {
  return [...doc.slice(0, l), linea, ...doc.slice(l + 1)];
}

/** Escribe texto en una sola línea (sin saltos). Un personaje pendiente escribe en mayúsculas */
export function insertarTexto(doc: Documento, p: Pos, texto: string): Resultado {
  p = limitar(doc, p);
  const linea = doc[p.l]!;
  const personaje = linea.tipoPendiente === "personaje" || (linea.forzado === "personaje" && linea.u.length === 0);
  const nuevas = [...(personaje ? enMayusculas(texto) : texto)];
  const u = [...linea.u.slice(0, p.u), ...nuevas, ...linea.u.slice(p.u)];
  const l: Linea = { ...linea, u };
  if (personaje) l.tipoPendiente = "personaje";
  else if (linea.tipoPendiente) delete l.tipoPendiente;
  return { doc: conLinea(doc, p.l, l), pos: { l: p.l, u: p.u + nuevas.length } };
}

export function insertarReferencia(doc: Documento, p: Pos, ref: Ref): Resultado {
  p = limitar(doc, p);
  const linea = doc[p.l]!;
  const l: Linea = { ...linea, u: [...linea.u.slice(0, p.u), ref, ...linea.u.slice(p.u)] };
  delete l.tipoPendiente;
  return { doc: conLinea(doc, p.l, l), pos: { l: p.l, u: p.u + 1 } };
}

/** Parte la línea en el cursor; la segunda no hereda tipo forzado ni pendiente */
export function partirLinea(doc: Documento, p: Pos): Resultado {
  p = limitar(doc, p);
  const linea = doc[p.l]!;
  const primera: Linea = { u: linea.u.slice(0, p.u), ...(linea.forzado ? { forzado: linea.forzado } : {}) };
  const segunda: Linea = { u: linea.u.slice(p.u) };
  return { doc: [...doc.slice(0, p.l), primera, segunda, ...doc.slice(p.l + 1)], pos: { l: p.l + 1, u: 0 } };
}

/** Pega o reemplaza un texto (de otro programa o copiado de aquí): se vuelve a reconocer entero (RF-9) */
export function reemplazar(doc: Documento, desde: Pos, hasta: Pos, texto: string): Resultado {
  const sinSel = borrarRango(doc, desde, hasta);
  const nuevo = desdeTexto(texto.replace(/\r\n?/g, "\n"));
  const p = sinSel.pos;
  const linea = sinSel.doc[p.l]!;
  if (nuevo.length === 1) {
    // Una sola línea: se escribe como texto normal, con su forzado si va a una línea vacía
    const n = nuevo[0]!;
    const cabeza = linea.u.slice(0, p.u);
    const l: Linea = { ...linea, u: [...cabeza, ...n.u, ...linea.u.slice(p.u)] };
    if (n.forzado && linea.u.length === 0 && !l.forzado) l.forzado = n.forzado;
    else if (n.forzado) l.u = [...cabeza, ...unidadesDeTexto(PREFIJOS[n.forzado]), ...n.u, ...linea.u.slice(p.u)];
    delete l.tipoPendiente;
    return { doc: conLinea(sinSel.doc, p.l, l), pos: { l: p.l, u: p.u + (l.u.length - linea.u.length) } };
  }
  const cola = linea.u.slice(p.u);
  const primeraPegada = nuevo[0]!;
  const ultimaPegada = nuevo[nuevo.length - 1]!;
  const cabezaVacia = p.u === 0;
  const primera: Linea = {
    u: [...linea.u.slice(0, p.u), ...primeraPegada.u],
    ...(cabezaVacia && primeraPegada.forzado ? { forzado: primeraPegada.forzado } : linea.forzado ? { forzado: linea.forzado } : {}),
  };
  if (primeraPegada.forzado && primera.forzado !== primeraPegada.forzado) primera.u = [...linea.u.slice(0, p.u), ...unidadesDeTexto(PREFIJOS[primeraPegada.forzado]), ...primeraPegada.u];
  const ultima: Linea = { u: [...ultimaPegada.u, ...cola], ...(ultimaPegada.forzado ? { forzado: ultimaPegada.forzado } : {}) };
  const medio = nuevo.slice(1, -1);
  const lineas = [primera, ...medio, ultima];
  return { doc: [...sinSel.doc.slice(0, p.l), ...lineas, ...sinSel.doc.slice(p.l + 1)], pos: { l: p.l + lineas.length - 1, u: ultimaPegada.u.length } };
}

/** Insertar un texto de varias líneas en el cursor (sin selección) */
export function insertarVarias(doc: Documento, p: Pos, texto: string): Resultado {
  return reemplazar(doc, p, p, texto);
}

// ---- Enter y Tab

export function enter(doc: Documento, desde: Pos, hasta: Pos = desde): Resultado {
  const sinSel = igual(desde, hasta) ? { doc, pos: limitar(doc, desde) } : borrarRango(doc, desde, hasta);
  const d = sinSel.doc;
  const p = sinSel.pos;
  const linea = d[p.l]!;
  const tipo = tiposDelDocumento(d)[p.l]!;
  const accion = siguienteAlEnter({ tipo, vacia: linea.u.length === 0, alFinal: p.u === linea.u.length, alPrincipio: p.u === 0 }, unidadesATexto(linea.u));
  const sinPendiente = (l: Linea): Linea => {
    const { tipoPendiente: _t, ...resto } = l;
    return resto;
  };
  const nueva = (t: TipoPendiente): Linea => ({ u: [], tipoPendiente: t });
  switch (accion.que) {
    case "nada":
      return { doc: d, pos: p };
    case "partir":
      return partirLinea(d, p);
    case "blanco-encima":
      return { doc: [...d.slice(0, p.l), { u: [] }, sinPendiente(linea), ...d.slice(p.l + 1)], pos: { l: p.l + 1, u: 0 } };
    case "blanco-y-linea":
      return { doc: [...d.slice(0, p.l), sinPendiente(linea), { u: [] }, nueva(accion.pendiente), ...d.slice(p.l + 1)], pos: { l: p.l + 2, u: 0 } };
    case "linea-pegada":
      return { doc: [...d.slice(0, p.l), sinPendiente(linea), nueva(accion.pendiente), ...d.slice(p.l + 1)], pos: { l: p.l + 1, u: 0 } };
    case "cerrar-dialogo":
      // La línea vacía pasa a ser el blanco y debajo empieza un personaje
      return { doc: [...d.slice(0, p.l), { u: [] }, nueva(accion.pendiente), ...d.slice(p.l + 1)], pos: { l: p.l + 1, u: 0 } };
  }
}

/** Tab / Mayús + Tab: cambia el tipo forzado de la línea (sin tipo = automático). Si la línea tiene texto que no admite el prefijo, no cambia */
export function cambiarForzadoLinea(doc: Documento, l: number, nuevo: TipoForzable | undefined): Documento {
  const linea = doc[l]!;
  const texto = unidadesATexto(linea.u);
  if (nuevo && texto !== "" && !sePuedeForzar(texto, nuevo)) return doc;
  const { forzado: _f, tipoPendiente: _t, ...resto } = linea;
  return conLinea(doc, l, nuevo ? { ...resto, forzado: nuevo } : resto);
}

/** Cuando el cursor sale de una línea con un tipo pendiente y ya tiene texto, el pendiente deja de hacer falta */
export function soltarPendientes(doc: Documento, salvo: number): Documento {
  let cambia = false;
  const r = doc.map((l, i) => {
    if (i === salvo || !l.tipoPendiente || l.u.length === 0) return l;
    cambia = true;
    const { tipoPendiente: _t, ...resto } = l;
    return resto;
  });
  return cambia ? r : doc;
}

// ---- Copiar, perder y topes

/** El texto de un rango, tal como se escribe en disco (una referencia sale como su enlace) */
export function textoDeRango(doc: Documento, desde: Pos, hasta: Pos): string {
  const [a, b] = ordenar(limitar(doc, desde), limitar(doc, hasta));
  const trozos: string[] = [];
  for (let l = a.l; l <= b.l; l++) {
    const inicio = l === a.l ? a.u : 0;
    const u = doc[l]!.u.slice(inicio, l === b.l ? b.u : undefined);
    const t = unidadesATexto(u);
    // Una línea copiada desde su principio lleva su prefijo forzado: al pegarla sigue siendo del mismo tipo
    const f = doc[l]!.forzado;
    trozos.push(inicio === 0 && f && t !== "" && sePuedeForzar(t, f) ? PREFIJOS[f] + t : t);
  }
  return trozos.join("\n");
}

/**
 * Cuántos caracteres del texto de antes desaparecen en el de después, mirando
 * solo lo que cambió (RF-30): vale para suprimir, cortar, reemplazar al pegar y
 * deshacer. Si pasa de `TOPE_BORRADO`, la copia previa va a la papelera.
 */
export function caracteresPerdidos(antes: string, despues: string): number {
  let ini = 0;
  const m = Math.min(antes.length, despues.length);
  while (ini < m && antes[ini] === despues[ini]) ini++;
  let fin = 0;
  while (fin < m - ini && antes[antes.length - 1 - fin] === despues[despues.length - 1 - fin]) fin++;
  return antes.length - ini - fin;
}

export const pideCopiaPrevia = (antes: string, despues: string): boolean => caracteresPerdidos(antes, despues) > TOPE_BORRADO;

const bytes = (s: string) => new TextEncoder().encode(s).length;

export type PegadoPermitido = { ok: true; resultado: Resultado } | { ok: false; motivo: string };

/** Pega entero o no pega nada (RNF-12): si el guion pasaría de 1 MB o de 500 páginas, se rechaza con aviso */
export function pegar(doc: Documento, desde: Pos, hasta: Pos, texto: string): PegadoPermitido {
  const resultado = reemplazar(doc, desde, hasta, texto);
  const final = aTexto(resultado.doc);
  if (bytes(final) > TOPE_BYTES) return { ok: false, motivo: "No se pega: el guion de esta escena pasaría de 1 MB." };
  if (medir(final).paginas > TOPE_PAGINAS) return { ok: false, motivo: `No se pega: el guion de esta escena pasaría de ${TOPE_PAGINAS} páginas.` };
  return { ok: true, resultado };
}

export { finDe };

// ---- Palabras (Ctrl + retroceso, Ctrl + suprimir)

const esEspacio = (x: Unidad) => typeof x === "string" && /\s/.test(x);

/** Hasta dónde llega una palabra desde el cursor, hacia atrás (`-1`) o adelante (`1`). Una referencia es una palabra entera */
export function limitePalabra(doc: Documento, p: Pos, lado: -1 | 1): Pos {
  const u = doc[p.l]!.u;
  let i = p.u;
  if (lado === -1) {
    while (i > 0 && esEspacio(u[i - 1]!)) i--;
    if (i > 0 && esRef(u[i - 1]!)) return { l: p.l, u: i - 1 };
    while (i > 0 && !esEspacio(u[i - 1]!) && !esRef(u[i - 1]!)) i--;
  } else {
    while (i < u.length && esEspacio(u[i]!)) i++;
    if (i < u.length && esRef(u[i]!)) return { l: p.l, u: i + 1 };
    while (i < u.length && !esEspacio(u[i]!) && !esRef(u[i]!)) i++;
  }
  return { l: p.l, u: i };
}
