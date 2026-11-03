// Disco de Node, para los scripts que se ejecutan fuera de la app.

import { promises as fsp } from "node:fs";
import { normalizar, type EntradaDir, type Fs } from "../src/lib/almacen/fs";

export class FsNode implements Fs {
  leer(ruta: string) {
    return fsp.readFile(ruta, "utf8");
  }
  escribir(ruta: string, contenido: string) {
    return fsp.writeFile(ruta, contenido, "utf8");
  }
  async leerBytes(ruta: string) {
    return new Uint8Array(await fsp.readFile(ruta));
  }
  escribirBytes(ruta: string, datos: Uint8Array) {
    return fsp.writeFile(ruta, datos);
  }
  renombrar(de: string, a: string) {
    return fsp.rename(de, a);
  }
  borrar(ruta: string) {
    return fsp.unlink(ruta);
  }
  async existe(ruta: string) {
    try {
      await fsp.stat(ruta);
      return true;
    } catch {
      return false;
    }
  }
  async listar(ruta: string): Promise<EntradaDir[]> {
    const l = await fsp.readdir(ruta, { withFileTypes: true });
    return l.map((e) => ({ nombre: e.name, esDir: e.isDirectory() }));
  }
  async crearDir(ruta: string) {
    await fsp.mkdir(ruta, { recursive: true });
  }
  async fecha(ruta: string) {
    try {
      return (await fsp.stat(ruta)).mtimeMs;
    } catch {
      return null;
    }
  }
}

export function rutaDeArgumento(): string {
  const ruta = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!ruta) {
    console.error("Falta la ruta de la carpeta appDatos.");
    process.exit(1);
  }
  return normalizar(ruta);
}
