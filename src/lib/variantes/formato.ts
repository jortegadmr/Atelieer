// La nota de una variante (spec 006): propiedades arriba y, por cada pieza, sus
// notas en bloques «atelier» (cómo estaba en la serie y cómo quedaría). Lo que
// hay entre medias es para leerla a mano; al leer solo cuentan las propiedades
// y los bloques. La nota llega de la vault (sincronizada o editada a mano): se
// valida entera antes de usarla, y si algo no vale no se abre (plan, Seguridad).

import { parse, stringify } from "yaml";
import { ErrorFormato, escribirPieza, leerPieza } from "../modelo/ficheros";
import type { Pieza } from "../modelo/tipos";
import { PREFIJO, type TipoPieza } from "../modelo/vocabulario";
import { limpiarNombre, limpiarPorque } from "./nombres";
import { ESTADOS_VARIANTE, type CabeceraVariante, type DatosVariante, type EstadoVariante, type PiezaVariante } from "./tipos";

/** Una nota de variante más grande que esto no se analiza */
export const MAXIMO_VARIANTE = 5 * 1024 * 1024;

const TIPOS = Object.keys(PREFIJO) as TipoPieza[];
const TIPO_DE_PREFIJO = new Map(TIPOS.map((t) => [PREFIJO[t], t]));

/** Id de pieza seguro: prefijo de un tipo y letras, cifras, «-» o «_» (nada de puntos ni barras) */
const ID_PIEZA = /^([a-z]{2})-[A-Za-z0-9_-]{1,64}$/;
const ID_VARIANTE = /^va-[a-z0-9]{4,12}$/;
const FECHA = /^\d{4}-\d\d-\d\d \d\d:\d\d(:\d\d)?$/;

/** El tipo de pieza de un id válido, o null */
export function tipoDeIdSeguro(id: unknown): TipoPieza | null {
  if (typeof id !== "string") return null;
  const m = ID_PIEZA.exec(id);
  return m ? (TIPO_DE_PREFIJO.get(m[1]) ?? null) : null;
}

export function esIdVariante(id: unknown): id is string {
  return typeof id === "string" && ID_VARIANTE.test(id);
}

// ---------------------------------------------------------------------------
// Escribir

/** Valla de «~» más larga que cualquier racha de «~» del contenido (como CommonMark) */
function valla(contenido: string): string {
  let largo = 3;
  for (const m of contenido.matchAll(/~+/g)) largo = Math.max(largo, m[0].length);
  return "~".repeat(Math.max(4, largo + 1));
}

function bloque(clase: "base" | "pieza" | "papelera", tipo: TipoPieza, id: string, contenido: string): string {
  const v = valla(contenido);
  return `${v}atelier ${clase} ${tipo} ${id}\n${contenido}\n${v}\n`;
}

export interface OpcionesEscribir {
  /** Título de cada pieza para leer la nota a mano («T01E05 · La traición») */
  titulo?: (id: string, p: PiezaVariante) => string;
  /** Texto de la nota de una pieza (el escritor lo recuerda para no repetirlo en cada tecla) */
  texto?: (p: Pieza) => string;
}

export function escribirVariante(v: DatosVariante, op: OpcionesEscribir = {}): string {
  const texto = op.texto ?? escribirPieza;
  const objeto = (m: Map<string, unknown>) => Object.fromEntries(m);
  const cabecera = {
    atelier: "variante",
    id: v.id,
    nombre: v.nombre,
    estado: v.estado,
    creada: v.creada,
    cambiada: v.cambiada,
    aplicada: v.aplicada,
    descartada: v.descartada,
    porque: v.porque,
    origen: v.origen,
    elegida: v.elegida,
    piezas: [...v.piezas.keys()],
    sitios: objeto(v.sitios),
    pisa: objeto(v.pisa),
    fichas: objeto(v.fichas),
  };
  let md = `---\n${stringify(cabecera, { lineWidth: 0 })}---\n`;
  md += `# ${v.nombre}\n\nPrueba de Atelier («¿Y si…?»). Nada de esto está en la serie hasta aplicarla.\n`;
  for (const [id, p] of v.piezas) {
    const titulo = op.titulo?.(id, p) ?? id;
    md += `\n## ${titulo.replace(/[\r\n]+/g, " ")}\n`;
    if (p.base !== null) md += bloque("base", p.tipo, id, p.base);
    md += p.pieza ? bloque("pieza", p.tipo, id, texto(p.pieza)) : bloque("papelera", p.tipo, id, "");
  }
  return md;
}

// ---------------------------------------------------------------------------
// Leer

const esObjeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

/** Separa las propiedades del resto; lanza ErrorFormato si la nota no vale */
function partir(texto: string): { datos: Record<string, unknown>; cuerpo: string } {
  if (texto.length > MAXIMO_VARIANTE) throw new ErrorFormato("Pasa de 5 MB: no se abre.");
  const md = texto.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const inicio = md.match(/^---[ \t]*\n/);
  if (!inicio) throw new ErrorFormato("No empieza por propiedades.");
  const resto = md.slice(inicio[0].length);
  const fin = resto.match(/^---[ \t]*(\n|$)/m);
  if (!fin || fin.index === undefined) throw new ErrorFormato("Las propiedades no se cierran.");
  let datos: unknown;
  try {
    datos = parse(resto.slice(0, fin.index));
  } catch (e) {
    throw new ErrorFormato(`Las propiedades no se pueden leer: ${(e as Error).message.split("\n")[0]}`);
  }
  if (!esObjeto(datos)) throw new ErrorFormato("Las propiedades no son una lista de campos.");
  return { datos, cuerpo: resto.slice(fin.index + fin[0].length) };
}

const texto = (x: unknown): string => (typeof x === "string" ? x : x === null || x === undefined ? "" : String(x));

function fecha(datos: Record<string, unknown>, campo: string): string {
  const f = texto(datos[campo]).trim();
  if (f && !FECHA.test(f)) throw new ErrorFormato(`La fecha «${campo}» no se entiende.`);
  return f;
}

function idOVacio(datos: Record<string, unknown>, campo: string): string {
  const x = texto(datos[campo]).trim();
  if (x && !tipoDeIdSeguro(x)) throw new ErrorFormato(`«${campo}» no es una pieza válida.`);
  return x;
}

function idPieza(x: unknown, donde: string, prefijos?: string[]): string {
  const tipo = tipoDeIdSeguro(x);
  if (!tipo || (prefijos && !prefijos.includes(PREFIJO[tipo]))) throw new ErrorFormato(`${donde}: «${texto(x)}» no es una pieza válida.`);
  return x as string;
}

function mapa(datos: Record<string, unknown>, campo: string): [string, unknown][] {
  const m = datos[campo];
  if (m === undefined || m === null) return [];
  if (!esObjeto(m)) throw new ErrorFormato(`«${campo}» no es una lista de piezas.`);
  return Object.entries(m);
}

/** Las propiedades de la nota, ya validadas (lo que se lee al abrir la serie) */
export function leerCabecera(contenido: string, nombreFichero: string): CabeceraVariante {
  return cabecera(partir(contenido).datos, nombreFichero);
}

function cabecera(datos: Record<string, unknown>, nombreFichero: string): CabeceraVariante {
  if (datos.atelier !== "variante") throw new ErrorFormato("No es una variante de Atelier.");
  const id = texto(datos.id).trim();
  if (!esIdVariante(id)) throw new ErrorFormato("El id de la variante no es válido.");
  if (id !== nombreFichero.replace(/\.md$/, "")) throw new ErrorFormato("El id no coincide con el nombre del fichero.");
  const estado = texto(datos.estado).trim() as EstadoVariante;
  if (!ESTADOS_VARIANTE.includes(estado)) throw new ErrorFormato(`El estado «${estado}» no se entiende.`);

  const lista = datos.piezas ?? [];
  if (!Array.isArray(lista)) throw new ErrorFormato("«piezas» no es una lista.");
  const piezas = lista.map((x) => idPieza(x, "piezas"));
  if (new Set(piezas).size !== piezas.length) throw new ErrorFormato("«piezas» repite una pieza.");

  const sitios = new Map<string, string[]>();
  for (const [k, val] of mapa(datos, "sitios")) {
    idPieza(k, "sitios", [PREFIJO.episodio, PREFIJO.temporada]);
    if (!Array.isArray(val)) throw new ErrorFormato(`sitios: el orden de «${k}» no es una lista.`);
    sitios.set(
      k,
      val.map((x) => idPieza(x, "sitios", [PREFIJO.evento])),
    );
  }
  const pisa = new Map<string, Record<string, unknown>>();
  for (const [k, val] of mapa(datos, "pisa")) {
    idPieza(k, "pisa");
    if (!esObjeto(val)) throw new ErrorFormato(`pisa: lo de «${k}» no es una lista de campos.`);
    pisa.set(k, val);
  }
  const fichas = new Map<string, string>();
  for (const [k, val] of mapa(datos, "fichas")) fichas.set(idPieza(k, "fichas"), limpiarNombre(texto(val)).nombre);

  return {
    id,
    nombre: limpiarNombre(texto(datos.nombre)).nombre || "Sin nombre",
    estado,
    creada: fecha(datos, "creada"),
    cambiada: fecha(datos, "cambiada"),
    aplicada: fecha(datos, "aplicada"),
    descartada: fecha(datos, "descartada"),
    porque: limpiarPorque(texto(datos.porque)).texto,
    origen: idOVacio(datos, "origen"),
    elegida: idOVacio(datos, "elegida"),
    piezas,
    sitios,
    pisa,
    fichas,
  };
}

/** Lo que cambia al marcar una variante (aplicada, aparcada, descartada) */
export type MarcaVariante = Partial<Pick<DatosVariante, "estado" | "aplicada" | "descartada" | "porque">>;

/** La misma nota con esas propiedades cambiadas; el resto (bloques, texto a mano) queda igual */
export function cambiarCabecera(contenido: string, nombreFichero: string, marca: MarcaVariante): string {
  const { datos, cuerpo } = partir(contenido);
  cabecera(datos, nombreFichero);
  return `---\n${stringify({ ...datos, ...marca }, { lineWidth: 0 })}---\n${cuerpo}`;
}

const APERTURA = /^(~{4,})atelier (base|pieza|papelera) (\S+) (\S+)[ \t]*$/;

/** La variante entera, validada: cada bloque con un tipo y un id seguros, y la nota de dentro de esa pieza */
export function leerVariante(contenido: string, nombreFichero: string): DatosVariante {
  const { datos, cuerpo } = partir(contenido);
  const c = cabecera(datos, nombreFichero);
  const piezas = new Map<string, PiezaVariante & { conPieza: boolean }>();
  const lineas = cuerpo.split("\n");
  for (let i = 0; i < lineas.length; i++) {
    const m = APERTURA.exec(lineas[i]);
    if (!m) continue;
    const [, v, clase, tipoTexto, id] = m;
    const tipo = tipoTexto as TipoPieza;
    if (!TIPOS.includes(tipo)) throw new ErrorFormato(`Un bloque dice «${tipoTexto}», que no es un tipo de pieza.`);
    if (tipoDeIdSeguro(id) !== tipo) throw new ErrorFormato(`El bloque de «${id}» no tiene un id válido de ${tipo}.`);
    const cierre = new RegExp(`^~{${v.length},}[ \\t]*$`);
    let j = i + 1;
    while (j < lineas.length && !cierre.test(lineas[j])) j++;
    if (j >= lineas.length) throw new ErrorFormato(`El bloque de «${id}» no se cierra.`);
    const dentro = lineas.slice(i + 1, j).join("\n");
    i = j;

    const e = piezas.get(id) ?? { tipo, base: null, pieza: null, conPieza: false };
    if (e.tipo !== tipo) throw new ErrorFormato(`«${id}» sale con dos tipos.`);
    if (clase === "base") {
      if (e.base !== null) throw new ErrorFormato(`«${id}» tiene dos bases.`);
      comprobarNota(dentro, tipo, id);
      e.base = dentro;
    } else {
      if (e.conPieza) throw new ErrorFormato(`«${id}» sale dos veces.`);
      e.conPieza = true;
      if (clase === "pieza") e.pieza = comprobarNota(dentro, tipo, id);
    }
    piezas.set(id, e);
  }
  const final = new Map<string, PiezaVariante>();
  for (const [id, e] of piezas) {
    if (!e.conPieza) throw new ErrorFormato(`«${id}» tiene base pero no dice cómo quedaría.`);
    if (e.base === null && e.pieza === null) throw new ErrorFormato(`«${id}» es nueva y va a la papelera.`);
    final.set(id, { tipo: e.tipo, base: e.base, pieza: e.pieza });
  }
  return { ...c, piezas: final };
}

/** La nota de dentro de un bloque: tiene que ser de ese tipo y de esa pieza */
function comprobarNota(texto: string, tipo: TipoPieza, id: string): Pieza {
  let p: Pieza;
  try {
    p = leerPieza(texto, tipo, id);
  } catch (e) {
    throw new ErrorFormato(`La nota de «${id}» no se puede leer: ${(e as Error).message}`);
  }
  if (p.id !== id) throw new ErrorFormato(`La nota del bloque de «${id}» dice que es «${p.id}».`);
  return p;
}
