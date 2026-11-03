// El desglose (spec 014, RF-1 a RF-8): una fila por escena con su locación,
// interior/exterior, momento, personajes y minutos, sacados del guion y, si el
// guion no los dice, de la ficha de la escena. Funciones puras: no escriben nada.

import { codigosDeEscenas } from "../guion/codigos";
import { esIdEscena } from "../guion/tipos";
import * as c from "../modelo/consultas";
import { estadoDe } from "../modelo/estados";
import type { Modelo } from "../modelo/modelo";
import type { Evento } from "../modelo/tipos";
import { ESTADO, type Estado } from "../modelo/vocabulario";
import type { Ficha, TipoFicha } from "../wiki/fichas";
import { claveLimpia, enUnaLinea, nombreLimpio } from "../wiki/md";
import { analizarGuion, segundosDeLineas, type AnalisisGuion, type InteriorExterior, type Momento } from "./analisis";

/** Lo que el desglose necesita de la wiki: sus fichas de personaje y de lugar */
export type FuenteFichas = { de(tipo: TipoFicha): Ficha[] };

/** De dónde sale un dato: del guion, de los campos de la escena, o de ninguna parte */
export type Origen = "guion" | "escena" | "ninguno";

export interface PersonajeFila {
  /** Clave de comparación: la del nombre de su ficha, o la del texto escrito */
  clave: string;
  nombre: string;
  /** Tiene ficha en el mundo */
  ficha: boolean;
  /** Segundos de diálogo en esta escena (0 si solo se le nombra) */
  habla: number;
}

export interface LocacionFila {
  clave: string;
  nombre: string;
  ficha: boolean;
}

export interface FilaDesglose {
  id: string;
  /** `T01E06-S03`; vacío en la bandeja */
  codigo: string;
  titulo: string;
  temporada: string;
  episodio: string;
  /** `T01E06`; vacío en la bandeja */
  codigoEpisodio: string;
  estado: Estado;
  conGuion: boolean;
  /** Segundos estimados sobre el guion; null si no hay guion */
  segundos: number | null;
  locaciones: LocacionFila[];
  origenLocaciones: Origen;
  ie: InteriorExterior | null;
  momento: Momento | null;
  personajes: PersonajeFila[];
  origenPersonajes: Origen;
}

interface Resuelto {
  clave: string;
  nombre: string;
  ficha: boolean;
}

/** Clave de cada nombre y alias de las fichas de un tipo → su ficha (la primera que lo usa) */
function fichasPorNombre(wiki: FuenteFichas | null, tipo: TipoFicha): Map<string, Resuelto> {
  const r = new Map<string, Resuelto>();
  for (const f of wiki?.de(tipo) ?? []) {
    const k = claveLimpia(f.nombre);
    if (!k) continue;
    const dato = { clave: k, nombre: nombreLimpio(f.nombre), ficha: true };
    for (const n of [f.nombre, ...f.aliases]) {
      const a = claveLimpia(n);
      if (a && !r.has(a)) r.set(a, dato);
    }
  }
  return r;
}

const PEQUENAS = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "en", "a", "al"]);

/** «CASA DE TELMO» → «Casa de Telmo»: así se enseña un nombre sin ficha que el guion escribe en mayúsculas */
export function nombreBonito(nombre: string): string {
  const n = nombreLimpio(nombre);
  if (!n || n !== n.toLocaleUpperCase("es") || n === n.toLocaleLowerCase("es")) return n;
  return n
    .toLocaleLowerCase("es")
    .split(" ")
    .map((p, i) => (i > 0 && PEQUENAS.has(p) ? p : p.charAt(0).toLocaleUpperCase("es") + p.slice(1)))
    .join(" ");
}

function resolver(mapa: ReadonlyMap<string, Resuelto>, texto: string): Resuelto | null {
  const k = claveLimpia(texto);
  if (!k) return null;
  return mapa.get(k) ?? { clave: k, nombre: nombreBonito(texto), ficha: false };
}

/** El texto sin tildes ni mayúsculas, para buscar nombres */
export const sinMarcas = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es");
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** La forma (ya sin tildes ni mayúsculas) como palabra suelta: sin letras ni cifras pegadas a los lados */
const patronDe = (forma: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escapar(forma)}(?![\\p{L}\\p{N}])`, "u");

/** ¿Alguna de las formas aparece como palabra suelta en el texto (ya sin tildes ni mayúsculas)? */
export const mencionado = (textoPlano: string, formas: readonly string[]) => formas.some((f) => f.length >= 3 && patronDe(f).test(textoPlano));

/** Resuelve nombres escritos contra las fichas del mundo (nombre o alias, sin tildes ni mayúsculas) */
export interface Resolutor {
  lugares: Map<string, Resuelto>;
  personajes: Map<string, Resuelto>;
  /** Todas las formas (nombre y alias, ya como clave) de cada ficha, por la clave de su nombre */
  formas: Map<string, string[]>;
  /** Los personajes con ficha y cómo se les reconoce escritos sin corchetes en una acción */
  nombrados: Array<{ personaje: Resuelto; patrones: RegExp[] }>;
}

export function crearResolutor(wiki: FuenteFichas | null): Resolutor {
  const formas = new Map<string, string[]>();
  for (const tipo of ["lugar", "personaje"] as const) {
    for (const f of wiki?.de(tipo) ?? []) {
      const k = claveLimpia(f.nombre);
      if (!k) continue;
      const l = formas.get(k) ?? [];
      for (const n of [f.nombre, ...f.aliases]) {
        const a = claveLimpia(n);
        if (a && !l.includes(a)) l.push(a);
      }
      formas.set(k, l);
    }
  }
  const personajes = fichasPorNombre(wiki, "personaje");
  const nombrados: Resolutor["nombrados"] = [];
  const vistos = new Set<string>();
  for (const dato of personajes.values()) {
    if (vistos.has(dato.clave)) continue;
    vistos.add(dato.clave);
    const patrones = (formas.get(dato.clave) ?? []).filter((f) => f.length >= 3).map(patronDe);
    if (patrones.length) nombrados.push({ personaje: dato, patrones });
  }
  return { lugares: fichasPorNombre(wiki, "lugar"), personajes, formas, nombrados };
}

export const resolverLugar = (r: Resolutor, texto: string) => resolver(r.lugares, texto);
export const resolverPersonaje = (r: Resolutor, texto: string) => resolver(r.personajes, texto);

/**
 * Locaciones y personajes que dice el guion: los encabezados, quien habla y los
 * personajes con ficha nombrados en una acción, con [[corchetes]] o escritos tal cual
 */
export function delGuion(a: AnalisisGuion, r: Resolutor): { locaciones: LocacionFila[]; personajes: PersonajeFila[] } {
  const locaciones: LocacionFila[] = [];
  for (const enc of a.encabezados) {
    const l = resolver(r.lugares, enc.lugarRef ?? enc.lugar);
    if (l && !locaciones.some((x) => x.clave === l.clave)) locaciones.push(l);
  }
  const ps = new Map<string, PersonajeFila>();
  const sumar = (x: Resuelto, habla: number) => {
    const p = ps.get(x.clave);
    if (p) p.habla += habla;
    else ps.set(x.clave, { ...x, habla });
  };
  for (const h of a.hablan) {
    const x = resolver(r.personajes, h.ref ?? h.nombre);
    if (x) sumar(x, segundosDeLineas(h.lineas));
  }
  // Nombrados en una acción: solo cuentan los que tienen ficha de personaje (una referencia puede ser un objeto o un lugar)
  for (const nombre of a.citados) {
    const x = r.personajes.get(claveLimpia(nombre));
    if (x) sumar(x, 0);
  }
  // Escritos sin corchetes en una acción («Entra Nando con el abrigo mojado»): también están en la escena
  if (a.acciones && r.nombrados.length) {
    const plano = sinMarcas(a.acciones);
    for (const n of r.nombrados) if (n.patrones.some((p) => p.test(plano))) sumar(n.personaje, 0);
  }
  return { locaciones, personajes: [...ps.values()] };
}

/** Locaciones y personajes escritos en los campos de la escena */
export function delaEscena(ev: Pick<Evento, "lugares" | "personajes">, r: Resolutor): { locaciones: LocacionFila[]; personajes: PersonajeFila[] } {
  const locaciones: LocacionFila[] = [];
  for (const x of ev.lugares) {
    const l = resolver(r.lugares, x);
    if (l && !locaciones.some((y) => y.clave === l.clave)) locaciones.push(l);
  }
  const personajes: PersonajeFila[] = [];
  for (const x of ev.personajes) {
    const p = resolver(r.personajes, x);
    if (p && !personajes.some((y) => y.clave === p.clave)) personajes.push({ ...p, habla: 0 });
  }
  return { locaciones, personajes };
}

/** Lo analizado de cada guion, para no repetirlo cuando solo cambian los campos de las escenas */
export type CacheAnalisis = Map<string, { texto: string; analisis: AnalisisGuion }>;

/** Los estados que se ven por defecto: todos menos «descartado» (RF-3) */
export const ESTADOS_POR_DEFECTO: Estado[] = ESTADO.filter((e) => e !== "descartado");

/** Escenas del ámbito dado en orden de emisión: las de cada episodio y, al final de cada temporada, su bandeja */
function escenasEnOrden(m: Modelo): Evento[] {
  const r: Evento[] = [];
  const vistas = new Set<string>();
  const anotar = (evs: Evento[]) => {
    for (const ev of evs) if (esIdEscena(ev.id) && !vistas.has(ev.id)) (vistas.add(ev.id), r.push(ev));
  };
  for (const t of c.temporadasEnOrden(m)) {
    for (const e of c.episodiosDeTemporada(m, t.id)) anotar(c.eventosDeEpisodio(m, e.id));
    anotar(c.bandeja(m, t.id));
  }
  return r;
}

/**
 * Las filas de todas las escenas. `textos` trae el guion de cada escena (null o ausente = sin guion).
 * Con guion, la locación y los personajes salen de él; si no dice ninguno, de los campos de la escena (RF-5).
 */
export function construirFilas(m: Modelo, wiki: FuenteFichas | null, textos: ReadonlyMap<string, string | null>, cache?: CacheAnalisis): FilaDesglose[] {
  const res = crearResolutor(wiki);
  const codigos = codigosDeEscenas(m);
  return escenasEnOrden(m).map((ev) => {
    const texto = textos.get(ev.id) ?? null;
    const conGuion = texto !== null && /\S/.test(texto);
    let a: AnalisisGuion | null = null;
    if (conGuion) {
      // Analizar un guion cuesta: con caché, solo si el texto cambió
      const antes = cache?.get(ev.id);
      if (antes && antes.texto === texto) a = antes.analisis;
      else {
        a = analizarGuion(texto!);
        cache?.set(ev.id, { texto: texto!, analisis: a });
      }
    }
    const guion = a ? delGuion(a, res) : { locaciones: [], personajes: [] };
    const escena = delaEscena(ev, res);

    // Lo que dice el guion; si no dice nada de eso, los campos de la escena (RF-5)
    let locs = guion.locaciones;
    let origenLocaciones: Origen = locs.length ? "guion" : "ninguno";
    if (!locs.length && escena.locaciones.length) (locs = escena.locaciones), (origenLocaciones = "escena");
    let ps = guion.personajes;
    let origenPersonajes: Origen = ps.length ? "guion" : "ninguno";
    if (!ps.length && escena.personajes.length) (ps = escena.personajes), (origenPersonajes = "escena");

    const ep = ev.episodio ? m.episodios.get(ev.episodio) : undefined;
    return {
      id: ev.id,
      codigo: codigos.get(ev.id)?.completo ?? "",
      titulo: ev.titulo.trim(),
      temporada: ev.temporada,
      episodio: ep ? ep.id : "",
      codigoEpisodio: ep ? c.codigo(m, ep.id) : "",
      estado: estadoDe(ev),
      conGuion,
      segundos: a ? a.segundos : null,
      locaciones: locs,
      origenLocaciones,
      ie: a?.encabezado?.ie ?? null,
      momento: a?.encabezado?.momento ?? null,
      personajes: ps,
      origenPersonajes,
    };
  });
}

// ---- Filtros (RF-3, RF-8)

export interface Filtros {
  /** "" = todas */
  temporada: string;
  /** "" = todos */
  episodio: string;
  /** Claves de locaciones */
  locaciones: string[];
  modoLocaciones: "alguno" | "todos";
  /** Claves de personajes */
  personajes: string[];
  modoPersonajes: "alguno" | "todos";
  ie: InteriorExterior[];
  momentos: Momento[];
  estados: Estado[];
}

export const sinFiltros = (): Filtros => ({
  temporada: "",
  episodio: "",
  locaciones: [],
  modoLocaciones: "alguno",
  personajes: [],
  modoPersonajes: "alguno",
  ie: [],
  momentos: [],
  estados: [...ESTADOS_POR_DEFECTO],
});

const mismoSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** ¿Hay algún filtro puesto además del estado por defecto? */
export function hayFiltros(f: Filtros): boolean {
  return !!(f.temporada || f.episodio || f.locaciones.length || f.personajes.length || f.ie.length || f.momentos.length) || !mismoSet(f.estados, ESTADOS_POR_DEFECTO);
}

function cumple(claves: readonly string[], elegidas: readonly string[], modo: "alguno" | "todos"): boolean {
  if (!elegidas.length) return true;
  return modo === "todos" ? elegidas.every((k) => claves.includes(k)) : elegidas.some((k) => claves.includes(k));
}

export function filtrar(filas: readonly FilaDesglose[], f: Filtros): FilaDesglose[] {
  return filas.filter(
    (x) =>
      (!f.temporada || x.temporada === f.temporada) &&
      (!f.episodio || x.episodio === f.episodio) &&
      f.estados.includes(x.estado) &&
      (!f.ie.length || (x.ie !== null && f.ie.includes(x.ie))) &&
      (!f.momentos.length || (x.momento !== null && f.momentos.includes(x.momento))) &&
      cumple(x.locaciones.map((l) => l.clave), f.locaciones, f.modoLocaciones) &&
      cumple(x.personajes.map((p) => p.clave), f.personajes, f.modoPersonajes),
  );
}

/** Las opciones de los filtros de locación y personaje: lo que sale en las filas dadas, por nombre */
export function opcionesDe(filas: readonly FilaDesglose[]): { locaciones: Array<{ clave: string; nombre: string }>; personajes: Array<{ clave: string; nombre: string }> } {
  const l = new Map<string, string>();
  const p = new Map<string, string>();
  for (const x of filas) {
    for (const y of x.locaciones) if (!l.has(y.clave)) l.set(y.clave, y.nombre);
    for (const y of x.personajes) if (!p.has(y.clave)) p.set(y.clave, y.nombre);
  }
  const ordenar = (mapa: Map<string, string>) => [...mapa].map(([clave, nombre]) => ({ clave, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return { locaciones: ordenar(l), personajes: ordenar(p) };
}

// ---- Grupos (RF-4)

export type Agrupar = "locacion" | "episodio" | "personaje";

export interface Grupo {
  clave: string;
  nombre: string;
  filas: FilaDesglose[];
  /** Segundos estimados de las escenas con guion */
  segundos: number;
  sinGuion: number;
  /** Nombres de los personajes que salen en el grupo, alfabéticos */
  personajes: string[];
}

/** Agrupa las filas; una escena con varias locaciones (o personajes) sale en cada grupo, así que los totales se solapan */
export function agrupar(filas: readonly FilaDesglose[], por: Agrupar, nombreEpisodio: (id: string) => string = (id) => id): Grupo[] {
  const grupos = new Map<string, Grupo>();
  const meter = (clave: string, nombre: string, x: FilaDesglose) => {
    let g = grupos.get(clave);
    if (!g) grupos.set(clave, (g = { clave, nombre, filas: [], segundos: 0, sinGuion: 0, personajes: [] }));
    g.filas.push(x);
  };
  for (const x of filas) {
    if (por === "locacion") {
      if (!x.locaciones.length) meter("", "Sin locación", x);
      for (const l of x.locaciones) meter(l.clave, l.nombre, x);
    } else if (por === "personaje") {
      if (!x.personajes.length) meter("", "Sin personajes", x);
      for (const p of x.personajes) meter(p.clave, p.nombre, x);
    } else {
      meter(x.episodio, x.episodio ? nombreEpisodio(x.episodio) : "Bandeja (sin episodio)", x);
    }
  }
  for (const g of grupos.values()) {
    const nombres = new Set<string>();
    for (const x of g.filas) {
      if (x.segundos === null) g.sinGuion++;
      else g.segundos += x.segundos;
      for (const p of x.personajes) nombres.add(p.nombre);
    }
    g.personajes = [...nombres].sort((a, b) => a.localeCompare(b, "es"));
  }
  const lista = [...grupos.values()];
  // En episodios se respeta el orden de emisión (el de las filas); en los demás, por nombre con «sin…» al final
  if (por !== "episodio") lista.sort((a, b) => (a.clave === "" ? 1 : b.clave === "" ? -1 : a.nombre.localeCompare(b.nombre, "es")));
  return lista;
}

// ---- Tabla Markdown (RF-7)

export const TOPE_COPIA = 100_000;

export type ColumnaDesglose = "codigo" | "titulo" | "episodio" | "locacion" | "ie" | "momento" | "personajes" | "minutos" | "estado" | "guion";

export const COLUMNAS: Array<{ id: ColumnaDesglose; nombre: string }> = [
  { id: "codigo", nombre: "Código" },
  { id: "titulo", nombre: "Título" },
  { id: "episodio", nombre: "Episodio" },
  { id: "locacion", nombre: "Locación" },
  { id: "ie", nombre: "Int/Ext" },
  { id: "momento", nombre: "Momento" },
  { id: "personajes", nombre: "Personajes" },
  { id: "minutos", nombre: "Minutos" },
  { id: "estado", nombre: "Estado" },
  { id: "guion", nombre: "Guion" },
];

/** Minutos con una decimal y coma: «2,4» */
export const minutos = (segundos: number) => (segundos / 60).toFixed(1).replace(".", ",");

export function valorDe(x: FilaDesglose, col: ColumnaDesglose): string {
  switch (col) {
    case "codigo":
      return x.codigo;
    case "titulo":
      return x.titulo || "Sin título";
    case "episodio":
      return x.codigoEpisodio;
    case "locacion":
      return x.locaciones.map((l) => l.nombre).join(", ");
    case "ie":
      return x.ie ?? "—";
    case "momento":
      return x.momento ?? "—";
    case "personajes":
      return x.personajes.map((p) => p.nombre).join(", ");
    case "minutos":
      return x.segundos === null ? "—" : minutos(x.segundos);
    case "estado":
      return x.estado;
    case "guion":
      return x.conGuion ? "sí" : "no";
  }
}

/** Una celda segura: una línea, sin caracteres de control y con `|` y `\` escapados */
const celda = (s: string) => enUnaLinea(s).replace(/[\\|<>[\]!]/g, "\\$&");

/** La tabla Markdown de las filas con las columnas dadas; pasa del tope y recorta por filas con un aviso */
export function aTablaMarkdown(filas: readonly FilaDesglose[], columnas: readonly ColumnaDesglose[]): { texto: string; recortada: boolean; filas: number } {
  const cols = COLUMNAS.filter((x) => columnas.includes(x.id));
  if (!cols.length) return { texto: "", recortada: false, filas: 0 };
  const cab = `| ${cols.map((x) => x.nombre).join(" | ")} |\n| ${cols.map(() => "---").join(" | ")} |`;
  const aviso = (n: number, total: number) => `\n\n_Recortada: ${n} de ${total} escenas (tope de ${TOPE_COPIA} caracteres)._`;
  let texto = cab;
  let n = 0;
  for (const x of filas) {
    const linea = `\n| ${cols.map((col) => celda(valorDe(x, col.id))).join(" | ")} |`;
    // Se deja sitio para el aviso
    if (texto.length + linea.length + aviso(filas.length, filas.length).length > TOPE_COPIA) {
      return { texto: texto + aviso(n, filas.length), recortada: true, filas: n };
    }
    texto += linea;
    n++;
  }
  return { texto, recortada: false, filas: n };
}
