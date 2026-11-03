// La portada de la serie (spec 017): una imagen `Portada.<ext>` en la carpeta
// raíz de la wiki, a la vista en Obsidian también. Poner una nueva deja la
// anterior en la papelera de la serie: nunca se borra.

import { carpetaDe, escribirBytesSeguro, nombreDe, unir, type Fs } from "../almacen/fs";

export const EXTENSIONES_PORTADA = ["png", "jpg", "jpeg", "webp"] as const;

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

export const extensionDe = (ruta: string) => nombreDe(ruta).split(".").pop()?.toLowerCase() ?? "";

export const mimeDe = (ext: string) => MIME[ext.toLowerCase()] ?? "application/octet-stream";

/** La portada que hay, relativa al vault, o null */
export async function buscarPortada(fs: Fs, vault: string, raiz: string): Promise<string | null> {
  if (!raiz) return null;
  for (const ext of EXTENSIONES_PORTADA) {
    const ruta = unir(raiz, `Portada.${ext}`);
    if (await fs.existe(unir(vault, ruta))) return ruta;
  }
  return null;
}

/** Los primeros bytes de la imagen coinciden con su extensión (no se copia cualquier cosa como imagen) */
export function pareceImagen(bytes: Uint8Array, ext: string): boolean {
  const e = ext.toLowerCase();
  if (e === "png") return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (e === "jpg" || e === "jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
  if (e === "webp") return bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

export type ResultadoPortada = { ok: true; ruta: string } | { ok: false; motivo: string };

/** Copia la imagen elegida como portada; la anterior va a `<mesa>/_papelera/_wiki` */
export async function ponerPortada(fs: Fs, vault: string, raiz: string, mesa: string, origen: string, op: { fecha: string; hora: string }): Promise<ResultadoPortada> {
  if (!raiz) return { ok: false, motivo: "La serie no tiene carpeta de wiki: pon la raíz en «Editar» de la serie." };
  const ext = extensionDe(origen);
  if (!(EXTENSIONES_PORTADA as readonly string[]).includes(ext)) return { ok: false, motivo: "Solo se admiten imágenes png, jpg o webp." };
  const bytes = await fs.leerBytes(origen);
  if (!pareceImagen(bytes, ext)) return { ok: false, motivo: "El archivo no parece una imagen de verdad." };
  if (bytes.length > 15 * 1024 * 1024) return { ok: false, motivo: "La imagen pesa más de 15 MB." };
  const ruta = unir(raiz, `Portada.${ext === "jpeg" ? "jpg" : ext}`);
  await fs.crearDir(carpetaDe(unir(vault, ruta)));
  // Primero se escribe la nueva (con fichero temporal): si falla, la anterior sigue donde estaba
  const previas: string[] = [];
  for (const e of EXTENSIONES_PORTADA) {
    const p = unir(raiz, `Portada.${e}`);
    if (p !== ruta && (await fs.existe(unir(vault, p)))) previas.push(p);
  }
  const mismaRuta = await fs.existe(unir(vault, ruta));
  const papelera = unir(mesa, "_papelera", "_wiki");
  const aLaPapelera = async (p: string) => {
    await fs.crearDir(papelera);
    let destino = unir(papelera, `${op.fecha} ${op.hora} ${nombreDe(p)}`);
    for (let n = 2; await fs.existe(destino); n++) destino = unir(papelera, `${op.fecha} ${op.hora} (${n}) ${nombreDe(p)}`);
    await fs.renombrar(unir(vault, p), destino);
  };
  if (mismaRuta) await aLaPapelera(ruta);
  try {
    await escribirBytesSeguro(fs, unir(vault, ruta), bytes);
  } catch (e) {
    return { ok: false, motivo: `No se pudo copiar la imagen: ${(e as Error).message}` };
  }
  // Todas las portadas de antes (de otra extensión) se apartan: solo queda la nueva
  for (const p of previas) await aLaPapelera(p);
  return { ok: true, ruta };
}
