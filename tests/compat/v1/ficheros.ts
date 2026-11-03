// Copia congelada de la etiqueta v1.0 (spec 001, T4). No se toca: sirve para probar que la v1.0 sigue leyendo lo que escribe la v2.
// Pieza <-> fichero .md con propiedades YAML y texto libre debajo (spec 11.1,
// plan 3.4). Al leer se rellenan los campos que falten y se toleran formas
// distintas (la de Obsidian en bloque, mayúsculas, acentos, números entre
// comillas). Los campos que el programa no conoce se conservan; los
// comentarios no.

import { Document, isCollection, isMap, isPair, isSeq, parse, type Node } from "yaml";
import type { Pieza, PiezaDe } from "./tipos";
import * as v from "./vocabulario";
import type { TipoPieza } from "./vocabulario";

export class ErrorFormato extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorFormato";
  }
}

// ---------------------------------------------------------------------------
// Esquema de los campos

type Campo =
  | { t: "texto"; def?: string }
  | { t: "num"; def: number }
  | { t: "bool"; def: boolean }
  | { t: "enum"; valores: readonly string[]; def: string }
  | { t: "lista"; de: Campo; def?: () => unknown[]; largo?: number }
  | { t: "obj"; campos: Record<string, Campo> };

const texto = (def = ""): Campo => ({ t: "texto", def });
const num = (def: number): Campo => ({ t: "num", def });
const bool = (def = false): Campo => ({ t: "bool", def });
const enumer = (valores: readonly string[], def: string): Campo => ({ t: "enum", valores, def });
const lista = (de: Campo, opciones: { def?: () => unknown[]; largo?: number } = {}): Campo => ({ t: "lista", de, ...opciones });
const obj = (campos: Record<string, Campo>): Campo => ({ t: "obj", campos });

const carga = enumer(["", ...v.CARGA], "");
const parCarga = lista(carga, { largo: 2 });
const posicion = obj({ temporada: texto(), episodio: texto() });
const wiki = { wiki: texto(), wiki_mtime: texto() };
const silenciados = lista(texto());

const ESQUEMAS: Record<TipoPieza, Record<string, Campo>> = {
  serie: {
    titulo: texto(),
    premisa: texto(),
    logline: obj({ protagonista: texto(), objetivo: texto(), problema: texto(), accion: texto(), catalizador: texto() }),
    pregunta_oro: texto(),
    final_decidido: texto(),
    preguntas_filosoficas: lista(texto()),
    tema: texto(),
    dinamica: texto(),
    preguntas: lista(obj({ pregunta: texto(), respuesta: texto() }), {
      def: () => v.PREGUNTAS_SERIE.map((pregunta) => ({ pregunta, respuesta: "" })),
    }),
    temporadas: lista(texto()),
    arcos: lista(texto()),
    wiki: obj({
      raiz: texto(),
      personajes: texto(),
      lugares: texto(),
      eras: texto(),
      timeline: texto(),
      narrativa: texto(),
      log: texto(),
    }),
    olvido_fraccion: num(0.3334),
    avisos_silenciados: silenciados,
  },
  punto: {
    clase: enumer(v.CLASE_PUNTO, "otro"),
    posicion,
    que_pasa: texto(),
  },
  temporada: {
    titulo: texto(),
    madurez: enumer(v.MADUREZ, "idea"),
    estado: enumer(v.ESTADO_TEMPORADA, "prevista"),
    logline: texto(),
    pregunta_dramatica: texto(),
    tema: texto(),
    partida: texto(),
    estructura: obj({
      detonante: obj({ texto: texto(), episodio: texto() }),
      punto_medio: obj({ texto: texto(), episodio: texto() }),
      crisis: obj({ texto: texto(), episodio: texto() }),
      climax: obj({ texto: texto(), episodio: texto() }),
    }),
    llegada: texto(),
    cierre: texto(),
    story_circle: lista(texto(), { largo: 8 }),
    carga: parCarga,
    principal: texto(),
    episodios: lista(texto()),
    episodios_previstos: num(0),
    ...wiki,
    avisos_silenciados: silenciados,
  },
  episodio: {
    temporada: texto(),
    titulo: texto(),
    idea_central: texto(),
    protagonista: texto(),
    deseo: texto(),
    fuerza_antagonica: texto(),
    conflicto: texto(),
    accion: texto(),
    contexto: texto(),
    gancho: texto(),
    carga: parCarga,
    estado: enumer(v.ESTADO_ESCRITURA, "idea"),
    actos: obj({ teaser: texto(), inicio: texto(), desarrollo: texto(), desenlace: texto() }),
    dominante_manual: texto(),
    ...wiki,
    avisos_silenciados: silenciados,
  },
  arco: {
    titulo: texto(),
    madurez: enumer(v.MADUREZ, "idea"),
    tipo_arco: enumer(v.TIPO_ARCO, "trama"),
    nivel: enumer(v.NIVEL_ARCO, "serie"),
    temporada: texto(),
    tipo_trama: enumer(v.TIPO_TRAMA, "A"),
    color: num(1),
    tramo_de: texto(),
    inicio: posicion,
    fin: posicion,
    beats: lista(obj({ temporada: texto(), episodio: texto(), texto: texto() }), { largo: 5 }),
    protagonistas: lista(texto()),
    quiere: texto(),
    impide: texto(),
    gana: texto(),
    pierde: texto(),
    bomba: texto(),
    bomba_vence: posicion,
    cambia: texto(),
    pegamento: obj({ por: enumer(["", ...v.PEGAMENTO_POR], ""), texto: texto() }),
    personaje: texto(),
    necesita: texto(),
    herida: texto(),
    mentira: texto(),
    estados: lista(obj({ temporada: texto(), inicio: texto(), fin: texto() })),
    siembras: lista(obj({ siembra: texto(), donde: texto(), recogida: texto(), donde_recogida: texto() })),
    motivo_descarte: texto(),
    ...wiki,
    avisos_silenciados: silenciados,
  },
  evento: {
    titulo: texto(),
    madurez: enumer(v.MADUREZ, "idea"),
    temporada: texto(),
    episodio: texto(),
    orden: num(0),
    acto: enumer(["", ...v.ACTO], ""),
    arcos: lista(obj({ arco: texto(), papel: enumer(v.PAPEL, "avanza") })),
    personajes: lista(texto()),
    lugares: lista(texto()),
    mundo: texto(),
    modo: enumer(v.MODO, "escena"),
    valor: texto(),
    cambio: parCarga,
    gana: texto(),
    pierde: texto(),
    relleno: obj({ avanza: bool(), revela: bool() }),
    eliminacion: texto(),
    motivo_descarte: texto(),
    avisos_silenciados: silenciados,
  },
  secreto: {
    titulo: texto(),
    madurez: enumer(v.MADUREZ, "idea"),
    nivel: enumer(v.NIVEL_SECRETO, "menor"),
    verdad: texto(),
    cree_audiencia: texto(),
    conocen: lista(texto()),
    revelado_en: obj({ episodio: texto(), evento: texto() }),
    pistas: lista(obj({ episodio: texto(), evento: texto(), texto: texto(), clase: enumer(v.CLASE_PISTA, "sutil") })),
    falsas: lista(obj({ episodio: texto(), evento: texto(), texto: texto(), conclusion: texto() })),
    ...wiki,
    avisos_silenciados: silenciados,
  },
};

// ---------------------------------------------------------------------------
// Valores por defecto y normalización

function porDefecto(c: Campo): unknown {
  switch (c.t) {
    case "texto":
      return c.def ?? "";
    case "num":
    case "bool":
    case "enum":
      return c.def;
    case "lista":
      if (c.def) return c.def();
      return c.largo ? Array.from({ length: c.largo }, () => porDefecto(c.de)) : [];
    case "obj":
      return Object.fromEntries(Object.entries(c.campos).map(([k, sub]) => [k, porDefecto(sub)]));
  }
}

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** Para comparar valores de listas: sin mayúsculas, sin acentos, − como - */
function simplificar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[−–—]/g, "-")
    .trim()
    .toLowerCase();
}

/** [[Telmo]] sin comillas en YAML se lee como [["Telmo"]]: se devuelve a texto */
function comoEnlace(x: unknown): string | null {
  if (Array.isArray(x) && x.length === 1 && Array.isArray(x[0]) && x[0].length === 1 && typeof x[0][0] === "string") {
    return `[[${x[0][0]}]]`;
  }
  return null;
}

function normalizar(c: Campo, x: unknown): unknown {
  if (x === null || x === undefined) return porDefecto(c);
  switch (c.t) {
    case "texto":
      if (typeof x === "string") return x;
      if (typeof x === "number" || typeof x === "boolean") return String(x);
      return comoEnlace(x) ?? porDefecto(c);
    case "num":
      if (typeof x === "number" && Number.isFinite(x)) return x;
      if (typeof x === "string" && x.trim() !== "" && Number.isFinite(Number(x))) return Number(x);
      return c.def;
    case "bool":
      if (typeof x === "boolean") return x;
      if (x === "true" || x === "sí" || x === "si") return true;
      if (x === "false" || x === "no") return false;
      return c.def;
    case "enum": {
      if (typeof x !== "string" && typeof x !== "number") return c.def;
      const s = simplificar(String(x));
      return c.valores.find((val) => simplificar(val) === s) ?? c.def;
    }
    case "lista": {
      let elementos: unknown[];
      const enlace = comoEnlace(x);
      if (enlace !== null) elementos = [enlace];
      else if (Array.isArray(x)) elementos = x;
      else if (c.de.t !== "lista" && c.de.t !== "obj") elementos = [x];
      else return porDefecto(c);
      const r = elementos.map((e) => normalizar(c.de, e));
      if (c.largo) while (r.length < c.largo) r.push(porDefecto(c.de));
      return r;
    }
    case "obj": {
      if (!esObjeto(x)) return porDefecto(c);
      const r: Record<string, unknown> = {};
      for (const [k, sub] of Object.entries(c.campos)) r[k] = normalizar(sub, x[k]);
      // Las subclaves desconocidas también se conservan
      for (const [k, val] of Object.entries(x)) if (!(k in c.campos)) r[k] = val;
      return r;
    }
  }
}

// ---------------------------------------------------------------------------
// Crear, leer y escribir

/** Una pieza nueva, completa, con lo que se pase encima de los valores por defecto */
export function crearPieza<T extends TipoPieza>(tipo: T, datos: Partial<PiezaDe<T>> & { id: string }): PiezaDe<T> {
  const esquema = ESQUEMAS[tipo];
  const p: Record<string, unknown> = { id: datos.id, tipo };
  for (const [k, c] of Object.entries(esquema)) {
    p[k] = k in datos ? (datos as Record<string, unknown>)[k] : porDefecto(c);
  }
  p.extra = datos.extra ?? {};
  p.texto = datos.texto ?? "";
  return p as unknown as PiezaDe<T>;
}

/**
 * Lee el contenido de un .md. `tipoEsperado` es el de su carpeta; `idFichero`,
 * el nombre del fichero sin .md, por si las propiedades no llevan id.
 */
export function leerPieza(contenido: string, tipoEsperado: TipoPieza, idFichero?: string): Pieza {
  const md = contenido.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const inicio = md.match(/^---[ \t]*\n/);
  if (!inicio) throw new ErrorFormato("No empieza por propiedades (falta la línea --- del principio).");
  const resto = md.slice(inicio[0].length);
  const fin = resto.match(/^---[ \t]*(\n|$)/m);
  if (!fin || fin.index === undefined) throw new ErrorFormato("Las propiedades no se cierran (falta la segunda línea ---).");
  const yamlTexto = resto.slice(0, fin.index);
  const cuerpo = resto.slice(fin.index + fin[0].length);

  let datos: unknown;
  try {
    datos = parse(yamlTexto, { uniqueKeys: false });
  } catch (e) {
    throw new ErrorFormato(`Las propiedades no se pueden leer: ${(e as Error).message.split("\n")[0]}`);
  }
  if (datos === null || datos === undefined) datos = {};
  if (!esObjeto(datos)) throw new ErrorFormato("Las propiedades no son una lista de campos.");

  const tipo = datos.tipo === undefined || datos.tipo === null ? tipoEsperado : String(datos.tipo);
  if (tipo !== tipoEsperado) {
    throw new ErrorFormato(`Dice «tipo: ${tipo}» pero está en la carpeta de ${tipoEsperado}.`);
  }
  const id = typeof datos.id === "string" && datos.id.trim() !== "" ? datos.id.trim() : idFichero;
  if (!id) throw new ErrorFormato("No tiene id.");

  const esquema = ESQUEMAS[tipoEsperado];
  const p: Record<string, unknown> = { id, tipo: tipoEsperado };
  for (const [k, c] of Object.entries(esquema)) p[k] = normalizar(c, datos[k]);
  const extra: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(datos)) {
    if (k !== "id" && k !== "tipo" && !(k in esquema)) extra[k] = val;
  }
  p.extra = extra;
  p.texto = cuerpo;
  return p as unknown as Pieza;
}

/** Colecciones cortas en una línea ({a: 1} o [x, y]); el resto, en bloque */
function compactar(nodo: unknown, nivel: number): void {
  if (!isCollection(nodo)) return;
  const n = nodo as Node & { flow?: boolean; items: unknown[] };
  if (nivel > 0) {
    const json = JSON.stringify(n.toJSON());
    const multilinea = json.includes("\\n");
    if (json.length <= 70 && !multilinea) {
      n.flow = true;
      return;
    }
  }
  for (const item of n.items) {
    if (isPair(item)) compactar(item.value, nivel + 1);
    else if (isSeq(n) || isMap(n)) compactar(item, nivel + 1);
  }
}

export function escribirPieza(p: Pieza): string {
  const esquema = ESQUEMAS[p.tipo];
  const datos: Record<string, unknown> = { id: p.id, tipo: p.tipo };
  const fuente = p as unknown as Record<string, unknown>;
  for (const k of Object.keys(esquema)) datos[k] = fuente[k];
  for (const [k, val] of Object.entries(p.extra)) if (!(k in datos)) datos[k] = val;

  const doc = new Document(datos);
  compactar(doc.contents, 0);
  const yamlTexto = doc.toString({ lineWidth: 0, flowCollectionPadding: false });
  return `---\n${yamlTexto}---\n${p.texto}`;
}
