// Copia congelada de la etiqueta v1.0 (spec 006, T6). No se toca (solo las rutas de import, a esta carpeta): sirve para probar que la v1.0 no ve ni toca _variantes/.
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
