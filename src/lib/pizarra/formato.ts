// La pizarra en disco (spec 012, RNF-1 y RNF-4): una nota Markdown con un único
// bloque de código `json`. Lo que haya fuera del bloque (el autor la puede abrir
// en Obsidian) se conserva al reescribir. Leer es tolerante: lo mal formado se
// descarta o se normaliza con un aviso, sin perder el resto.

import { cortarGrafemas } from "./texto";
import {
  COLORES,
  LIENZO,
  MAX_ELEMENTOS,
  MAX_ETIQUETA,
  MAX_FLECHAS,
  MAX_NOTA,
  VERSION,
  esColor,
  type ColorNota,
  type Elemento,
  type Extra,
  type Flecha,
  type Pizarra,
} from "./tipos";

export type LecturaPizarra = { pizarra: Pizarra; avisos: string[]; soloLectura: boolean } | { ilegible: string };

const APERTURA = /^```json[ \t]*$/;
const CIERRE = /^```[ \t]*$/;

/** Más de esto no es una pizarra (el tope real de 200 elementos y 400 flechas queda en unos 300 KB) */
export const MAX_FICHERO = 2_000_000;

interface Bloque {
  /** Dónde empieza la línea de apertura */
  index: number;
  /** Hasta dónde llega, con el salto de línea del cierre si lo hay */
  fin: number;
  cuerpo: string;
}

/**
 * El primer bloque ```json con cierre. Se recorre por líneas, una sola vez:
 * una regex perezosa con muchas aperturas sin cierre es cuadrática.
 */
function buscarBloque(texto: string): Bloque | null {
  let abre = -1;
  let cuerpoDesde = 0;
  let ini = 0;
  for (;;) {
    const salto = texto.indexOf("\n", ini);
    const fin = salto === -1 ? texto.length : salto;
    const linea = texto.slice(ini, fin > ini && texto[fin - 1] === "\r" ? fin - 1 : fin);
    if (abre === -1) {
      if (APERTURA.test(linea)) {
        abre = ini;
        cuerpoDesde = salto === -1 ? texto.length : salto + 1;
      }
    } else if (CIERRE.test(linea)) {
      const cuerpo = ini > cuerpoDesde ? texto.slice(cuerpoDesde, ini).replace(/\r?\n$/, "") : "";
      return { index: abre, fin: salto === -1 ? texto.length : salto + 1, cuerpo };
    }
    if (salto === -1) return null;
    ini = salto + 1;
  }
}

const CABECERA = "# Pizarra\n\nPizarra libre de ideas de la serie. La edita Atelier: si la abres a mano, respeta el bloque de abajo.\n\n";

type Obj = Record<string, unknown>;
const esObjeto = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Poner una propiedad sin que `__proto__` cambie el prototipo */
function poner(o: Obj, clave: string, valor: unknown): void {
  Object.defineProperty(o, clave, { value: valor, enumerable: true, writable: true, configurable: true });
}

/** Lo que el objeto trae además de las claves que la app entiende */
function sobrante(o: Obj, conocidas: readonly string[]): Extra {
  const extra: Extra = {};
  for (const k of Object.keys(o)) if (!conocidas.includes(k)) poner(extra, k, o[k]);
  return extra;
}

export function leerPizarra(texto: string): LecturaPizarra {
  if (texto.length > MAX_FICHERO) return { ilegible: "El fichero es demasiado grande para ser una pizarra." };
  const m = buscarBloque(texto);
  if (!m) return { ilegible: "No hay un bloque json con la pizarra." };
  let datos: unknown;
  try {
    datos = JSON.parse(m.cuerpo);
  } catch (e) {
    return { ilegible: `El bloque json no se puede leer: ${(e as Error).message}` };
  }
  if (!esObjeto(datos)) return { ilegible: "El bloque json no es un objeto." };

  const avisos: string[] = [];
  let soloLectura = false;
  let version = VERSION;
  if (datos.version !== undefined) {
    if (typeof datos.version === "number" && Number.isInteger(datos.version) && datos.version >= 1) {
      version = datos.version;
      if (version > VERSION) {
        soloLectura = true;
        avisos.push(`La pizarra es de una versión más nueva de Atelier (${version}): se abre solo para leer.`);
      }
    } else avisos.push("La versión de la pizarra no se entiende: se lee como la 1.");
  }

  const coordenada = (v: unknown, id: string, eje: string): number => {
    if (typeof v !== "number" || Number.isNaN(v)) {
      avisos.push(`«${id}»: la posición ${eje} no es un número: se pone en 0.`);
      return 0;
    }
    const c = Math.min(LIENZO, Math.max(-LIENZO, v));
    if (c !== v) avisos.push(`«${id}»: la posición ${eje} estaba fuera del lienzo: se trae al borde.`);
    return c;
  };

  const elementos: Elemento[] = [];
  const ids = new Set<string>();
  let sobranElementos = 0;
  if (datos.elementos !== undefined && !Array.isArray(datos.elementos)) avisos.push("La lista de elementos no se entiende: se ignora.");
  for (const e of Array.isArray(datos.elementos) ? datos.elementos : []) {
    if (!esObjeto(e)) {
      avisos.push("Un elemento no se entiende: se ignora.");
      continue;
    }
    const id = e.id;
    if (typeof id !== "string" || id === "") {
      avisos.push("Un elemento no tiene id: se ignora.");
      continue;
    }
    if (ids.has(id)) {
      avisos.push(`El id «${id}» está repetido: se ignora la segunda.`);
      continue;
    }
    if (e.tipo !== "nota" && e.tipo !== "tarjeta") {
      avisos.push(`«${id}» es de un tipo que no se entiende: se ignora.`);
      continue;
    }
    if (e.tipo === "tarjeta" && (typeof e.pieza !== "string" || e.pieza === "")) {
      avisos.push(`«${id}» es una tarjeta sin pieza: se ignora.`);
      continue;
    }
    if (elementos.length >= MAX_ELEMENTOS) {
      sobranElementos++;
      continue;
    }
    ids.add(id);
    const x = coordenada(e.x, id, "x");
    const y = coordenada(e.y, id, "y");
    if (e.tipo === "nota") {
      let t = typeof e.texto === "string" ? e.texto : "";
      const corte = cortarGrafemas(t, MAX_NOTA);
      if (corte.recortado) {
        t = corte.texto;
        avisos.push(`«${id}»: el texto pasaba de ${MAX_NOTA} caracteres: se recorta.`);
      }
      let color: ColorNota = COLORES[0].id;
      if (esColor(e.color)) color = e.color;
      else avisos.push(`«${id}»: el color no está en la paleta: se pone ${COLORES[0].nombre}.`);
      elementos.push({ tipo: "nota", id, texto: t, color, x, y, extra: sobrante(e, ["tipo", "id", "texto", "color", "x", "y"]) });
    } else {
      const t: Elemento = { tipo: "tarjeta", id, pieza: e.pieza as string, x, y, extra: sobrante(e, ["tipo", "id", "pieza", "origen", "x", "y"]) };
      if (typeof e.origen === "string" && e.origen !== "") t.origen = e.origen;
      elementos.push(t);
    }
  }
  if (sobranElementos) avisos.push(`Sobran ${sobranElementos} elementos (el tope es ${MAX_ELEMENTOS}): se ignoran.`);

  const flechas: Flecha[] = [];
  const idsFlecha = new Set<string>();
  const pares = new Set<string>();
  let sobranFlechas = 0;
  if (datos.flechas !== undefined && !Array.isArray(datos.flechas)) avisos.push("La lista de flechas no se entiende: se ignora.");
  for (const f of Array.isArray(datos.flechas) ? datos.flechas : []) {
    if (!esObjeto(f)) {
      avisos.push("Una flecha no se entiende: se ignora.");
      continue;
    }
    const id = f.id;
    if (typeof id !== "string" || id === "" || idsFlecha.has(id)) {
      avisos.push(typeof id === "string" && id !== "" ? `El id de flecha «${id}» está repetido: se ignora la segunda.` : "Una flecha no tiene id: se ignora.");
      continue;
    }
    if (typeof f.de !== "string" || typeof f.a !== "string" || !ids.has(f.de) || !ids.has(f.a)) {
      avisos.push(`La flecha «${id}» une elementos que no existen: se ignora.`);
      continue;
    }
    if (f.de === f.a) {
      avisos.push(`La flecha «${id}» va de un elemento a sí mismo: se ignora.`);
      continue;
    }
    const par = `${f.de}\u0000${f.a}`;
    if (pares.has(par)) {
      avisos.push(`La flecha «${id}» repite otra: se ignora.`);
      continue;
    }
    if (flechas.length >= MAX_FLECHAS) {
      sobranFlechas++;
      continue;
    }
    idsFlecha.add(id);
    pares.add(par);
    const corte = cortarGrafemas(typeof f.etiqueta === "string" ? f.etiqueta : "", MAX_ETIQUETA);
    if (corte.recortado) avisos.push(`La flecha «${id}»: la etiqueta pasaba de ${MAX_ETIQUETA} caracteres: se recorta.`);
    flechas.push({ id, de: f.de, a: f.a, etiqueta: corte.texto, extra: sobrante(f, ["id", "de", "a", "etiqueta"]) });
  }
  if (sobranFlechas) avisos.push(`Sobran ${sobranFlechas} flechas (el tope es ${MAX_FLECHAS}): se ignoran.`);

  return { pizarra: { version, elementos, flechas, extra: sobrante(datos, ["version", "elementos", "flechas"]) }, avisos, soloLectura };
}

/** El JSON de la pizarra, con las claves siempre en el mismo orden */
function json(p: Pizarra): string {
  const salida: Obj = { version: p.version };
  salida.elementos = p.elementos.map((e) => {
    const o: Obj = e.tipo === "nota" ? { tipo: e.tipo, id: e.id, texto: e.texto, color: e.color, x: e.x, y: e.y } : { tipo: e.tipo, id: e.id, pieza: e.pieza, ...(e.origen === undefined ? {} : { origen: e.origen }), x: e.x, y: e.y };
    for (const k of Object.keys(e.extra)) poner(o, k, e.extra[k]);
    return o;
  });
  salida.flechas = p.flechas.map((f) => {
    const o: Obj = { id: f.id, de: f.de, a: f.a, etiqueta: f.etiqueta };
    for (const k of Object.keys(f.extra)) poner(o, k, f.extra[k]);
    return o;
  });
  for (const k of Object.keys(p.extra)) poner(salida, k, p.extra[k]);
  return JSON.stringify(salida, null, 2);
}

/**
 * La nota para guardar. Con `textoAnterior`, solo cambia lo de dentro del bloque
 * json y lo demás queda como estaba.
 */
export function escribirPizarra(p: Pizarra, textoAnterior?: string): string {
  const bloque = (cuerpo: string) => `\`\`\`json\n${cuerpo}\n\`\`\``;
  const m = textoAnterior === undefined || textoAnterior.length > MAX_FICHERO ? null : buscarBloque(textoAnterior);
  if (m && textoAnterior !== undefined) {
    const cierre = textoAnterior.slice(m.index, m.fin).endsWith("\n") ? "\n" : "";
    return textoAnterior.slice(0, m.index) + bloque(json(p)) + cierre + textoAnterior.slice(m.fin);
  }
  return CABECERA + bloque(json(p)) + "\n";
}
