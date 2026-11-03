import { describe, expect, it } from "vitest";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { buscarPortada, ponerPortada } from "../src/lib/wiki/portada";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2]);
const op = { fecha: "2026-10-29", hora: "10-00-00" };

describe("portada de la serie", () => {
  it("sin portada no hay nada; con ella se encuentra", async () => {
    const fs = new FsMemoria();
    expect(await buscarPortada(fs, "V", "S/Wiki")).toBeNull();
    await fs.escribirBytes("V/S/Wiki/Portada.webp", new Uint8Array([1]));
    expect(await buscarPortada(fs, "V", "S/Wiki")).toBe("S/Wiki/Portada.webp");
  });

  it("copia la imagen a la raíz de la wiki sin tocar el original", async () => {
    const fs = new FsMemoria();
    await fs.escribirBytes("C:/Fotos/yo.png", png);
    const r = await ponerPortada(fs, "V", "S/Wiki", "V/appDatos/S", "C:/Fotos/yo.png", op);
    expect(r).toEqual({ ok: true, ruta: "S/Wiki/Portada.png" });
    expect(await fs.leerBytes("V/S/Wiki/Portada.png")).toEqual(png);
    expect(await fs.existe("C:/Fotos/yo.png")).toBe(true);
  });

  it("la portada anterior va a la papelera, no se borra", async () => {
    const fs = new FsMemoria();
    await fs.escribirBytes("V/S/Wiki/Portada.png", png);
    await fs.escribirBytes("C:/Fotos/nueva.jpg", jpg);
    const r = await ponerPortada(fs, "V", "S/Wiki", "V/appDatos/S", "C:/Fotos/nueva.jpg", op);
    expect(r.ok).toBe(true);
    expect(await fs.existe("V/S/Wiki/Portada.png")).toBe(false);
    expect(await fs.existe("V/appDatos/S/_papelera/_wiki/2026-10-29 10-00-00 Portada.png")).toBe(true);
    expect(await fs.leerBytes("V/S/Wiki/Portada.jpg")).toEqual(jpg);
  });

  it("rechaza lo que no es una imagen y no toca nada", async () => {
    const fs = new FsMemoria();
    await fs.escribirBytes("C:/x/falsa.png", new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    await fs.escribirBytes("C:/x/doc.pdf", png);
    expect((await ponerPortada(fs, "V", "S/Wiki", "V/m", "C:/x/falsa.png", op)).ok).toBe(false);
    expect((await ponerPortada(fs, "V", "S/Wiki", "V/m", "C:/x/doc.pdf", op)).ok).toBe(false);
    expect(await buscarPortada(fs, "V", "S/Wiki")).toBeNull();
  });
});

describe("portada: varias imágenes y fallos", () => {
  it("aparta todas las portadas de otra extensión y deja solo la nueva", async () => {
    const fs = new FsMemoria();
    await fs.escribirBytes("V/S/Wiki/Portada.png", png);
    await fs.escribirBytes("V/S/Wiki/Portada.webp", new Uint8Array([9]));
    await fs.escribirBytes("C:/f/n.jpg", jpg);
    const r = await ponerPortada(fs, "V", "S/Wiki", "V/m", "C:/f/n.jpg", op);
    expect(r.ok).toBe(true);
    expect(await buscarPortada(fs, "V", "S/Wiki")).toBe("S/Wiki/Portada.jpg");
    expect(await fs.existe("V/S/Wiki/Portada.png")).toBe(false);
    expect(await fs.existe("V/S/Wiki/Portada.webp")).toBe(false);
  });

  it("si la escritura falla, la anterior de otra extensión sigue en su sitio", async () => {
    const fs = new FsMemoria();
    await fs.escribirBytes("V/S/Wiki/Portada.png", png);
    await fs.escribirBytes("C:/f/n.jpg", jpg);
    fs.fallo = (op, ruta) => (op === "escribir" && ruta.includes("Portada.jpg") ? "entero" : null);
    const r = await ponerPortada(fs, "V", "S/Wiki", "V/m", "C:/f/n.jpg", op);
    expect(r.ok).toBe(false);
    expect(await fs.existe("V/S/Wiki/Portada.png")).toBe(true);
  });
});
