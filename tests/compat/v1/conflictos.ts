// Copia congelada de la etiqueta v1.0 (spec 006, T6). No se toca (solo las rutas de import, a esta carpeta): sirve para probar que la v1.0 no ve ni toca _variantes/.
// Conflictos de sincronización (spec 11.2). El servicio de Proton los nombra así:
// app (# Edit conflict 2026-10-15 5i1veaD #).json

import { carpetaDe, nombreDe, unir, type Fs } from "./fs";

const PATRON = /\s*\(# Edit conflict [^)]*#\)/;

export function esConflicto(nombre: string): boolean {
  return PATRON.test(nombre);
}

/** Nombre del fichero del que salió el conflicto */
export function nombreOriginal(nombre: string): string {
  return nombre.replace(PATRON, "");
}

export interface Conflicto {
  ruta: string;
  rutaOriginal: string;
  /** Contenido del fichero original; null si ya no existe */
  original: string | null;
  conflicto: string;
}

/** Las dos versiones de un conflicto, para enseñarlas. No junta nada. */
export async function leerConflicto(fs: Fs, ruta: string): Promise<Conflicto> {
  const rutaOriginal = unir(carpetaDe(ruta), nombreOriginal(nombreDe(ruta)));
  const original = (await fs.existe(rutaOriginal)) ? await fs.leer(rutaOriginal) : null;
  return { ruta, rutaOriginal, original, conflicto: await fs.leer(ruta) };
}
