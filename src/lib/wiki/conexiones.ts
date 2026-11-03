// El mapa de conexiones (spec 017): las relaciones que cada ficha guarda como
// campo (spec 015, RF-14c) vistas como un grafo, con filtros por tipo. Solo lee.

import type { Fs } from "../almacen/fs";
import type { RutasWiki } from "../modelo/tipos";
import { leerCategoria, type Categoria, type FichaMundo } from "./mundo";

export type ClaseConexion = "romantica" | "amistad" | "rivalidad" | "otra";

export const CLASES_CONEXION: Array<{ id: ClaseConexion; nombre: string }> = [
  { id: "romantica", nombre: "Romántica" },
  { id: "amistad", nombre: "Amistad" },
  { id: "rivalidad", nombre: "Rivalidad" },
  { id: "otra", nombre: "Otras" },
];

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Agrupa el texto libre del tipo de relación en una de las clases del filtro */
export function claseDeTipo(tipo: string): ClaseConexion {
  const t = sinTildes(tipo);
  if (/(romant|amor|pareja|novi|espos|casad|amante|enamor)/.test(t)) return "romantica";
  if (/(amist|amig|aliad|compan)/.test(t)) return "amistad";
  if (/(rival|enemig|odio|antagon|enfrent)/.test(t)) return "rivalidad";
  return "otra";
}

export interface Nodo {
  nombre: string;
  categoria: Categoria | null;
  /** Ruta de su ficha, o null si la relación apunta a algo que no tiene ficha */
  ruta: string | null;
}

export interface Arista {
  de: string;
  a: string;
  tipo: string;
  clase: ClaseConexion;
}

export interface Grafo {
  nodos: Nodo[];
  aristas: Arista[];
}

const CATEGORIAS_CON_RELACIONES: Categoria[] = ["personaje", "grupo"];

const clave = (n: string) => sinTildes(n.trim());

/** El grafo de las fichas dadas: una arista por relación escrita; un nodo por ficha o nombre nombrado */
export function construirGrafo(fichas: readonly FichaMundo[]): Grafo {
  const nodos = new Map<string, Nodo>();
  const porNombre = new Map<string, FichaMundo>();
  for (const f of fichas) {
    porNombre.set(clave(f.nombre), f);
    for (const al of f.aliases) if (!porNombre.has(clave(al))) porNombre.set(clave(al), f);
  }
  const nodoDe = (nombre: string): Nodo => {
    const f = porNombre.get(clave(nombre));
    const k = clave(f?.nombre ?? nombre);
    let n = nodos.get(k);
    if (!n) {
      n = { nombre: f?.nombre ?? nombre.trim(), categoria: f?.categoria ?? null, ruta: f?.ruta ?? null };
      nodos.set(k, n);
    }
    return n;
  };
  const aristas: Arista[] = [];
  const vistas = new Set<string>();
  for (const f of fichas) {
    for (const r of f.relaciones) {
      if (!r.con.trim()) continue;
      const de = nodoDe(f.nombre);
      const a = nodoDe(r.con);
      if (de === a) continue;
      // Una relación escrita en las dos fichas se dibuja una vez
      const par = [clave(de.nombre), clave(a.nombre)].sort().join("|");
      const id = `${par}|${clave(r.tipo)}`;
      if (vistas.has(id)) continue;
      vistas.add(id);
      aristas.push({ de: de.nombre, a: a.nombre, tipo: r.tipo.trim(), clase: claseDeTipo(r.tipo) });
    }
  }
  return { nodos: [...nodos.values()].sort((x, y) => x.nombre.localeCompare(y.nombre, "es")), aristas };
}

/** Deja solo las aristas de las clases elegidas, y los nodos que quedan con alguna */
export function filtrarGrafo(g: Grafo, clases: ReadonlySet<ClaseConexion>): Grafo {
  const aristas = g.aristas.filter((a) => clases.has(a.clase));
  const usados = new Set(aristas.flatMap((a) => [a.de, a.a]));
  return { aristas, nodos: g.nodos.filter((n) => usados.has(n.nombre)) };
}

/** Lee las fichas con relaciones de la serie y arma el grafo */
export async function leerGrafo(fs: Fs, vault: string, rutas: RutasWiki): Promise<Grafo> {
  const fichas = (await Promise.all(CATEGORIAS_CON_RELACIONES.map((c) => leerCategoria(fs, vault, rutas, c)))).flat();
  return construirGrafo(fichas);
}

/** Puestos en círculo, de 0 a 1 en cada eje, para dibujarlos sin librerías */
export function colocarEnCirculo(n: number): Array<{ x: number; y: number }> {
  if (n === 1) return [{ x: 0.5, y: 0.5 }];
  return Array.from({ length: n }, (_, i) => {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: 0.5 + 0.42 * Math.cos(ang), y: 0.5 + 0.42 * Math.sin(ang) };
  });
}
