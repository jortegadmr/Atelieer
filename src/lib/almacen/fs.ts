// Interfaz con el disco (plan 3.2). El almacén solo habla con el disco a
// través de ella. Hay dos versiones: fs-tauri.ts (la real) y fs-memoria.ts
// (para las pruebas). Las rutas van siempre con /, también en Windows.

export interface EntradaDir {
  nombre: string;
  esDir: boolean;
}

export interface Fs {
  leer(ruta: string): Promise<string>;
  escribir(ruta: string, contenido: string): Promise<void>;
  leerBytes(ruta: string): Promise<Uint8Array>;
  escribirBytes(ruta: string, datos: Uint8Array): Promise<void>;
  /** Si `a` existe, lo sustituye */
  renombrar(de: string, a: string): Promise<void>;
  /** Borra un fichero (no carpetas) */
  borrar(ruta: string): Promise<void>;
  existe(ruta: string): Promise<boolean>;
  listar(ruta: string): Promise<EntradaDir[]>;
  /** Crea la carpeta y las que falten por encima; si ya existe, no hace nada */
  crearDir(ruta: string): Promise<void>;
  /** Fecha de modificación en ms, o null si no existe */
  fecha(ruta: string): Promise<number | null>;
  /**
   * Avisa de cambios dentro de una carpeta (aviso nativo del sistema). Puede no
   * llegar en carpetas en la nube: por eso la vigilancia repasa fechas aparte.
   */
  vigilar?(ruta: string, alCambiar: (rutas: string[]) => void): Promise<() => void>;
}

export function normalizar(ruta: string): string {
  return ruta.replace(/\\/g, "/");
}

export function unir(...partes: string[]): string {
  const limpias = partes.map(normalizar).filter((p) => p !== "");
  const r = limpias.join("/").replace(/\/{2,}/g, "/");
  return r.length > 1 ? r.replace(/\/$/, "") : r;
}

export function nombreDe(ruta: string): string {
  const n = normalizar(ruta).replace(/\/$/, "");
  return n.slice(n.lastIndexOf("/") + 1);
}

export function carpetaDe(ruta: string): string {
  const n = normalizar(ruta).replace(/\/$/, "");
  return n.slice(0, n.lastIndexOf("/"));
}

export class ErrorFueraDeMesa extends Error {
  constructor(ruta: string) {
    super(`No se puede borrar fuera de la mesa: ${ruta}`);
    this.name = "ErrorFueraDeMesa";
  }
}

/** Ruta con /, sin . ni .. y sin barra final */
function resolver(ruta: string): string {
  const n = normalizar(ruta);
  const partes: string[] = [];
  for (const p of n.split("/")) {
    if (p === "" || p === ".") continue;
    if (p === "..") partes.pop();
    else partes.push(p);
  }
  return (n.startsWith("/") ? "/" : "") + partes.join("/");
}

/**
 * El mismo disco, pero solo deja borrar dentro de la mesa (spec 001, RF-6 y
 * RF-7). Sin distinguir mayúsculas: en Windows y en el Mac son la misma ruta.
 */
export function limitarBorrado(fs: Fs, mesa: string): Fs {
  const base = resolver(mesa).toLowerCase();
  return {
    leer: (ruta) => fs.leer(ruta),
    escribir: (ruta, contenido) => fs.escribir(ruta, contenido),
    leerBytes: (ruta) => fs.leerBytes(ruta),
    escribirBytes: (ruta, datos) => fs.escribirBytes(ruta, datos),
    renombrar: (de, a) => fs.renombrar(de, a),
    borrar: async (ruta) => {
      const r = resolver(ruta);
      if (!r.toLowerCase().startsWith(`${base}/`)) throw new ErrorFueraDeMesa(ruta);
      return fs.borrar(r);
    },
    existe: (ruta) => fs.existe(ruta),
    listar: (ruta) => fs.listar(ruta),
    crearDir: (ruta) => fs.crearDir(ruta),
    fecha: (ruta) => fs.fecha(ruta),
    vigilar: fs.vigilar ? (ruta, alCambiar) => fs.vigilar!(ruta, alCambiar) : undefined,
  };
}

/**
 * Escritura segura (spec 11.2): primero a <fichero>.tmp y luego se renombra.
 * Si algo falla a medias, el original queda como estaba.
 */
export async function escribirSeguro(fs: Fs, ruta: string, contenido: string): Promise<void> {
  const tmp = `${ruta}.tmp`;
  try {
    await fs.escribir(tmp, contenido);
    await fs.renombrar(tmp, ruta);
  } catch (e) {
    try {
      if (await fs.existe(tmp)) await fs.borrar(tmp);
    } catch {
      // El .tmp que quede no estorba: no acaba en .md
    }
    throw e;
  }
}

export async function escribirBytesSeguro(fs: Fs, ruta: string, datos: Uint8Array): Promise<void> {
  const tmp = `${ruta}.tmp`;
  try {
    await fs.escribirBytes(tmp, datos);
    await fs.renombrar(tmp, ruta);
  } catch (e) {
    try {
      if (await fs.existe(tmp)) await fs.borrar(tmp);
    } catch {
      // igual que arriba
    }
    throw e;
  }
}
