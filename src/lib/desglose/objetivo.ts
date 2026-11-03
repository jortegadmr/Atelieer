// Duración objetivo (spec 014, RF-12): los minutos que debería durar la serie,
// una temporada o un episodio. Vive en su propio fichero,
// appDatos/<serie>/_desglose/objetivo.md: la v1.0 no recorre esa carpeta y las
// notas de las piezas no cambian (RNF-1). Es opcional; sin fichero no hay objetivo.

import { parse, stringify } from "yaml";
import * as c from "../modelo/consultas";
import type { Modelo } from "../modelo/modelo";
import { escribirSeguro, unir, type Fs } from "../almacen/fs";
import type { Ambito } from "../guion/indice";

export const CARPETA_DESGLOSE = "_desglose";
export const FICHERO_OBJETIVO = "objetivo.md";
export const VERSION_OBJETIVO = 1;

/** Más de esto en un fichero de objetivo no se lee */
const MAX_FICHERO = 200_000;
/** Un objetivo razonable: más de 1000 horas no es una duración, es un error */
export const MAX_MINUTOS = 60_000;

export interface Objetivo {
  /** Minutos para toda la serie */
  serie: number | null;
  /** Minutos por id de temporada */
  temporadas: Record<string, number>;
  /** Minutos por id de episodio */
  episodios: Record<string, number>;
  /** Campos de la cabecera que no entendemos: se conservan */
  extra: Record<string, unknown>;
}

export const objetivoVacio = (): Objetivo => ({ serie: null, temporadas: {}, episodios: {}, extra: {} });

export interface LecturaObjetivo {
  objetivo: Objetivo;
  /** Lo que había en disco (null = no había fichero): para no pisar un cambio de fuera */
  crudo: string | null;
  avisos: string[];
  /** Una versión más nueva, o un fichero que no se entiende: se mira pero no se escribe */
  soloLectura: boolean;
}

const RESERVADAS = new Set(["atelier_desglose", "serie", "temporadas", "episodios", "__proto__"]);

const minutosValidos = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0 && v <= MAX_MINUTOS;

function mapa(v: unknown, avisos: string[], que: string): Record<string, number> {
  const r: Record<string, number> = {};
  if (v === undefined || v === null) return r;
  if (typeof v !== "object" || Array.isArray(v)) {
    avisos.push(`«${que}» del objetivo no es una lista de valores: se ignora.`);
    return r;
  }
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if (k === "__proto__") continue;
    if (k.length > 100) {
      avisos.push(`Una clave de «${que}» es demasiado larga: se ignora.`);
      continue;
    }
    if (minutosValidos(x)) r[k] = x;
    else avisos.push(`Un valor de «${que}» no es una duración válida: se ignora.`);
  }
  return r;
}

export function rutaObjetivo(rutaSerie: string): string {
  return unir(rutaSerie, CARPETA_DESGLOSE, FICHERO_OBJETIVO);
}

export function interpretarObjetivo(crudo: string): Omit<LecturaObjetivo, "crudo"> {
  const avisos: string[] = [];
  const texto = (crudo.charCodeAt(0) === 0xfeff ? crudo.slice(1) : crudo).replace(/\r\n/g, "\n");
  const vacio = (aviso: string): Omit<LecturaObjetivo, "crudo"> => ({ objetivo: objetivoVacio(), avisos: [aviso], soloLectura: true });
  if (texto.length > MAX_FICHERO) return vacio("El fichero de la duración objetivo es enorme: se ignora.");
  const m = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(texto);
  if (!m) return vacio("El fichero de la duración objetivo no tiene cabecera: se ignora y no se sobrescribe.");
  let datos: unknown;
  try {
    datos = parse(m[1]!);
  } catch {
    return vacio("El fichero de la duración objetivo no se entiende: se ignora y no se sobrescribe.");
  }
  if (datos === null || typeof datos !== "object" || Array.isArray(datos)) return vacio("El fichero de la duración objetivo no es una lista de campos: se ignora y no se sobrescribe.");
  const d = datos as Record<string, unknown>;
  const version = d["atelier_desglose"];
  let soloLectura = false;
  if (typeof version === "number" && Number.isInteger(version) && version > VERSION_OBJETIVO) {
    soloLectura = true;
    avisos.push(`La duración objetivo la escribió una versión más nueva de Atelier (formato ${version}): solo se mira.`);
  }
  const objetivo: Objetivo = {
    serie: minutosValidos(d["serie"]) ? d["serie"] : null,
    temporadas: mapa(d["temporadas"], avisos, "temporadas"),
    episodios: mapa(d["episodios"], avisos, "episodios"),
    extra: {},
  };
  if (d["serie"] !== undefined && d["serie"] !== null && objetivo.serie === null) avisos.push("La duración objetivo de la serie no es válida: se ignora.");
  for (const k of Object.keys(d)) if (!RESERVADAS.has(k)) objetivo.extra[k] = d[k];
  // Un valor que la app no entiende no se pierde: mientras lo haya, solo se mira
  if (avisos.length && !soloLectura) {
    soloLectura = true;
    avisos.push("Hay valores que Atelier no entiende: solo se mira para no perderlos. Corrígelos en el fichero.");
  }
  return { objetivo, avisos, soloLectura };
}

export async function leerObjetivo(fs: Fs, rutaSerie: string): Promise<LecturaObjetivo> {
  const ruta = rutaObjetivo(rutaSerie);
  if (!(await fs.existe(ruta))) return { objetivo: objetivoVacio(), crudo: null, avisos: [], soloLectura: false };
  const crudo = await fs.leer(ruta);
  return { ...interpretarObjetivo(crudo), crudo };
}

const CUERPO = "Duración objetivo de la serie, en minutos. La edita Atelier (pestaña Desglose); los campos que no conoce los respeta.\n";

export function escribirObjetivo(o: Objetivo): string {
  const cabeza: Record<string, unknown> = { atelier_desglose: VERSION_OBJETIVO };
  if (o.serie !== null) cabeza["serie"] = o.serie;
  const t = Object.entries(o.temporadas).sort(([a], [b]) => a.localeCompare(b));
  const e = Object.entries(o.episodios).sort(([a], [b]) => a.localeCompare(b));
  if (t.length) cabeza["temporadas"] = Object.fromEntries(t);
  if (e.length) cabeza["episodios"] = Object.fromEntries(e);
  for (const k of Object.keys(o.extra)) if (!RESERVADAS.has(k) && Object.hasOwn(o.extra, k)) cabeza[k] = o.extra[k];
  return `---\n${stringify(cabeza)}---\n${CUERPO}`;
}

export type ResultadoObjetivo = { hecho: true; crudo: string } | { hecho: false; motivo: "fuera" | "solo-lectura" | "invalido" };

/**
 * Guarda el objetivo (escritura segura). `leido` es lo que se leyó del disco: si
 * el disco ya no es eso, alguien lo cambió fuera y no se pisa. Una duración que
 * no es un número entre 0 y el tope no se escribe.
 */
export async function guardarObjetivo(fs: Fs, rutaSerie: string, objetivo: Objetivo, leido: LecturaObjetivo): Promise<ResultadoObjetivo> {
  if (leido.soloLectura) return { hecho: false, motivo: "solo-lectura" };
  const valores = [...(objetivo.serie === null ? [] : [objetivo.serie]), ...Object.values(objetivo.temporadas), ...Object.values(objetivo.episodios)];
  if (!valores.every(minutosValidos)) return { hecho: false, motivo: "invalido" };
  const ruta = rutaObjetivo(rutaSerie);
  const actual = (await fs.existe(ruta)) ? await fs.leer(ruta) : null;
  if (actual !== leido.crudo) return { hecho: false, motivo: "fuera" };
  const texto = escribirObjetivo(objetivo);
  if (texto === actual) return { hecho: true, crudo: texto };
  await fs.crearDir(unir(rutaSerie, CARPETA_DESGLOSE));
  await escribirSeguro(fs, ruta, texto);
  return { hecho: true, crudo: texto };
}

/** Lo que dura (en segundos) lo previsto para un ámbito, o null si no hay objetivo para él */
export function objetivoDe(o: Objetivo, m: Modelo, ambito: Ambito): number | null {
  const minutos = (min: number) => min * 60;
  const deEpisodio = (id: string) => (Object.hasOwn(o.episodios, id) ? o.episodios[id]! : null);
  const deTemporada = (id: string): number | null => {
    if (Object.hasOwn(o.temporadas, id)) return o.temporadas[id]!;
    // Sin objetivo propio: la suma de sus episodios, si todos lo tienen
    const eps = c.episodiosDeTemporada(m, id);
    if (!eps.length) return null;
    const v = eps.map((e) => deEpisodio(e.id));
    return v.every((x): x is number => x !== null) ? v.reduce((a, b) => a + b, 0) : null;
  };
  if (ambito.que === "episodio") {
    const v = deEpisodio(ambito.id);
    return v === null ? null : minutos(v);
  }
  if (ambito.que === "temporada") {
    const v = deTemporada(ambito.id);
    return v === null ? null : minutos(v);
  }
  if (o.serie !== null) return minutos(o.serie);
  const ts = c.temporadasEnOrden(m).map((t) => deTemporada(t.id));
  return ts.length && ts.every((x): x is number => x !== null) ? minutos(ts.reduce((a, b) => a + b, 0)) : null;
}
