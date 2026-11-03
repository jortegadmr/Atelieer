// Disco de verdad, con el plugin fs de Tauri. Los permisos y el alcance
// (solo dentro de la carpeta del usuario) están en src-tauri/capabilities/.

import {
  exists,
  mkdir,
  readDir,
  readFile,
  readTextFile,
  remove,
  rename,
  stat,
  watch,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { normalizar, type EntradaDir, type Fs } from "./fs";

export class FsTauri implements Fs {
  leer(ruta: string): Promise<string> {
    return readTextFile(ruta);
  }

  escribir(ruta: string, contenido: string): Promise<void> {
    return writeTextFile(ruta, contenido);
  }

  leerBytes(ruta: string): Promise<Uint8Array> {
    return readFile(ruta);
  }

  escribirBytes(ruta: string, datos: Uint8Array): Promise<void> {
    return writeFile(ruta, datos);
  }

  renombrar(de: string, a: string): Promise<void> {
    return rename(de, a);
  }

  borrar(ruta: string): Promise<void> {
    return remove(ruta);
  }

  existe(ruta: string): Promise<boolean> {
    return exists(ruta);
  }

  async listar(ruta: string): Promise<EntradaDir[]> {
    const entradas = await readDir(ruta);
    return entradas.map((e) => ({ nombre: e.name, esDir: e.isDirectory }));
  }

  async crearDir(ruta: string): Promise<void> {
    if (!(await exists(ruta))) await mkdir(ruta, { recursive: true });
  }

  async fecha(ruta: string): Promise<number | null> {
    try {
      const s = await stat(ruta);
      return s.mtime ? s.mtime.getTime() : null;
    } catch {
      return null;
    }
  }

  async vigilar(ruta: string, alCambiar: (rutas: string[]) => void): Promise<() => void> {
    return watch(
      ruta,
      (evento) => {
        const rutas = evento.paths.map(normalizar);
        if (rutas.length) alCambiar(rutas);
      },
      { recursive: true, delayMs: 300 },
    );
  }
}
