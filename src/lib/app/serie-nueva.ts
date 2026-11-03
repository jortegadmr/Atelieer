// Serie nueva guiada (spec 016): preparar una vault nueva o la wiki de una serie
// dentro de una vault que ya existe, y el recorrido en orden que acompaña (sin
// obligar) desde la premisa hasta el guion. Solo crea carpetas: nunca pisa nada.

import { normalizar, unir, type Fs } from "../almacen/fs";
import type { Modelo } from "../modelo/modelo";
import type { RutasWiki } from "../modelo/tipos";
import { CATEGORIAS, carpetaDeCategoria } from "../wiki/mundo";

/** ¿Es una ruta relativa que se queda dentro de donde se crea? Sin `..`, sin unidad ni raíz, sin componentes de solo puntos */
export function rutaRelativaSegura(ruta: string): boolean {
  const n = normalizar(ruta).trim();
  if (!n || n.startsWith("/") || /^[A-Za-z]:/.test(n)) return false;
  return n.split("/").every((t) => t !== "" && !/^\.+$/.test(t) && !/[. ]$/.test(t) && !/[<>:"|?*]/.test(t));
}

/** Crea las carpetas de la wiki de la serie (las de siempre y las de cada categoría del mundo) */
export async function crearCarpetasWiki(fs: Fs, vault: string, rutas: RutasWiki): Promise<string[]> {
  const creadas: string[] = [];
  const dirs = new Set<string>();
  if (rutas.raiz) dirs.add(rutas.raiz);
  for (const c of CATEGORIAS) {
    const d = carpetaDeCategoria(rutas, c.id);
    if (d) dirs.add(d);
  }
  // Nada se crea fuera de la vault
  for (const d of dirs) if (!rutaRelativaSegura(d)) throw new Error(`La carpeta de la wiki «${d}» no vale: tiene que ser una ruta dentro de la vault, sin «..».`);
  for (const d of dirs) {
    const abs = unir(vault, d);
    if (await fs.existe(abs)) continue;
    await fs.crearDir(abs);
    creadas.push(d);
  }
  return creadas;
}

export type ResultadoVaultNuevo = { ok: true; vault: string; raiz: string } | { ok: false; motivo: string };

/**
 * Prepara una vault nueva en una carpeta elegida: debe estar vacía (o no existir).
 * Deja `.obsidian` y `appDatos`; Obsidian completa su configuración al abrirla.
 */
export async function prepararVaultNueva(fs: Fs, carpeta: string, actual?: string): Promise<ResultadoVaultNuevo> {
  const vault = normalizar(carpeta).replace(/\/+$/, "");
  if (!vault) return { ok: false, motivo: "Elige una carpeta." };
  if (vault.split("/").includes("..")) return { ok: false, motivo: "La carpeta no vale." };
  // Una vault dentro de otra (o que contiene a la de ahora) se lía en Obsidian: no
  if (actual) {
    const a = normalizar(actual).replace(/\/+$/, "").toLowerCase();
    const v = vault.toLowerCase();
    const padreActual = a.slice(0, Math.max(a.lastIndexOf("/"), 0));
    if (v === a || v.startsWith(`${a}/`) || v === padreActual || v.startsWith(`${padreActual}/`) || a.startsWith(`${v}/`)) {
      return { ok: false, motivo: "Esa carpeta es la vault de ahora, está dentro de ella o la contiene. Elige otra vacía, aparte." };
    }
  }
  if (await fs.existe(vault)) {
    const dentro = await fs.listar(vault);
    if (dentro.length) return { ok: false, motivo: "La carpeta ya tiene cosas dentro. Elige una vacía, o crea la serie dentro de una vault que ya tengas." };
  }
  await fs.crearDir(unir(vault, ".obsidian"));
  const raiz = unir(vault, "appDatos");
  await fs.crearDir(raiz);
  return { ok: true, vault, raiz };
}

// ---- El recorrido guiado ----

export type PasoId = "premisa" | "personajes" | "lugares" | "arcos" | "temporadas" | "episodios" | "escenas" | "guion";

export interface Paso {
  id: PasoId;
  titulo: string;
  /** Qué se hace en este paso, en una línea */
  ayuda: string;
  hecho: boolean;
  /** Dónde se hace */
  vista: "serie" | "wiki" | "tramas" | "temporada" | "episodios" | "guion";
  /** Para «wiki»: la categoría que se abre */
  categoria?: "personaje" | "lugar";
}

export interface Recorrido {
  pasos: Paso[];
  hechos: number;
  /** El primero sin hacer: la sugerencia, no una obligación */
  siguiente: Paso | null;
}

export interface DatosRecorrido {
  personajes: number;
  lugares: number;
  /** Escenas con texto de guion escrito */
  conGuion: number;
}

const lleno = (s: string) => s.trim() !== "" && s.trim() !== "[PENDIENTE]";

/** Qué falta por hacer, en el orden en que se suele hacer. Se calcula siempre del contenido: no guarda nada */
export function recorrido(m: Modelo, d: DatosRecorrido): Recorrido {
  const s = m.serie;
  const premisa = lleno(s.premisa) || Object.values(s.logline).some(lleno);
  const vivos = (xs: Iterable<{ madurez?: string }>) => [...xs].filter((x) => x.madurez !== "descartado").length;
  const escenas = [...m.eventos.values()].filter((e) => e.madurez !== "descartado" && e.episodio).length;
  const pasos: Paso[] = [
    { id: "premisa", titulo: "La premisa", ayuda: "Escribe de qué va la serie y su logline.", hecho: premisa, vista: "serie" },
    { id: "personajes", titulo: "Los personajes", ayuda: "Crea al menos un personaje.", hecho: d.personajes > 0, vista: "wiki", categoria: "personaje" },
    { id: "lugares", titulo: "Los lugares", ayuda: "Crea al menos un lugar.", hecho: d.lugares > 0, vista: "wiki", categoria: "lugar" },
    { id: "arcos", titulo: "Arcos y tramas", ayuda: "Plantea una trama o un arco.", hecho: vivos(m.arcos.values()) > 0, vista: "tramas" },
    { id: "temporadas", titulo: "Las temporadas", ayuda: "Define una temporada.", hecho: vivos(m.temporadas.values()) > 0, vista: "temporada" },
    { id: "episodios", titulo: "Los episodios", ayuda: "Reparte los episodios de la temporada.", hecho: m.episodios.size > 0, vista: "episodios" },
    { id: "escenas", titulo: "Las escenas", ayuda: "Divide un episodio en escenas.", hecho: escenas > 0, vista: "episodios" },
    { id: "guion", titulo: "El guion", ayuda: "Escribe el guion de una escena.", hecho: d.conGuion > 0, vista: "guion" },
  ];
  const hechos = pasos.filter((p) => p.hecho).length;
  return { pasos, hechos, siguiente: pasos.find((p) => !p.hecho) ?? null };
}
