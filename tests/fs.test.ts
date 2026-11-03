import { describe, expect, it } from "vitest";
import { escribirSeguro, nombreDe, unir } from "../src/lib/almacen/fs";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";

describe("rutas", () => {
  it("unir junta con / y quita barras repetidas", () => {
    expect(unir("C:/datos/", "/serie", "eventos", "ev-1.md")).toBe("C:/datos/serie/eventos/ev-1.md");
    expect(unir("/Volumes/vault", "appDatos")).toBe("/Volumes/vault/appDatos");
    expect(unir("C:\\datos", "x")).toBe("C:/datos/x");
  });

  it("nombreDe da el último trozo", () => {
    expect(nombreDe("C:/a/b/ev-1.md")).toBe("ev-1.md");
  });
});

describe("disco en memoria", () => {
  it("escribe, lee, lista, renombra y borra", async () => {
    const fs = new FsMemoria();
    await fs.crearDir("/r/serie/eventos");
    await fs.escribir("/r/serie/eventos/ev-1.md", "uno");
    await fs.escribir("/r/serie/serie.md", "s");
    expect(await fs.leer("/r/serie/eventos/ev-1.md")).toBe("uno");
    expect(await fs.existe("/r/serie/eventos")).toBe(true);
    const lista = await fs.listar("/r/serie");
    expect(lista.sort((a, b) => a.nombre.localeCompare(b.nombre))).toEqual([
      { nombre: "eventos", esDir: true },
      { nombre: "serie.md", esDir: false },
    ]);
    await fs.renombrar("/r/serie/eventos/ev-1.md", "/r/serie/eventos/ev-2.md");
    expect(await fs.existe("/r/serie/eventos/ev-1.md")).toBe(false);
    expect(await fs.leer("/r/serie/eventos/ev-2.md")).toBe("uno");
    await fs.borrar("/r/serie/eventos/ev-2.md");
    expect(await fs.existe("/r/serie/eventos/ev-2.md")).toBe(false);
    await expect(fs.leer("/r/no.md")).rejects.toThrow();
  });

  it("la fecha de modificación avanza al escribir", async () => {
    const fs = new FsMemoria();
    await fs.escribir("/a.md", "1");
    const f1 = await fs.fecha("/a.md");
    await fs.escribir("/a.md", "2");
    expect((await fs.fecha("/a.md"))!).toBeGreaterThan(f1!);
    expect(await fs.fecha("/no.md")).toBeNull();
  });

  it("guarda bytes", async () => {
    const fs = new FsMemoria();
    await fs.escribirBytes("/z.zip", new Uint8Array([1, 2, 3]));
    expect(await fs.leerBytes("/z.zip")).toEqual(new Uint8Array([1, 2, 3]));
  });
});

describe("escritura segura (spec 11.2)", () => {
  it("escribe a <fichero>.tmp y luego lo renombra", async () => {
    const fs = new FsMemoria();
    const ops: string[] = [];
    fs.alOperar = (op, ruta) => ops.push(`${op} ${ruta}`);
    await escribirSeguro(fs, "/s/ev-1.md", "nuevo");
    expect(ops).toEqual(["escribir /s/ev-1.md.tmp", "renombrar /s/ev-1.md.tmp"]);
    expect(await fs.leer("/s/ev-1.md")).toBe("nuevo");
    expect(await fs.existe("/s/ev-1.md.tmp")).toBe(false);
  });

  it("un fallo a medias al escribir no deja el original roto", async () => {
    const fs = new FsMemoria();
    await fs.escribir("/s/ev-1.md", "original completo");
    fs.fallo = (op) => (op === "escribir" ? "a medias" : null);
    await expect(escribirSeguro(fs, "/s/ev-1.md", "una versión nueva bastante larga")).rejects.toThrow();
    fs.fallo = null;
    expect(await fs.leer("/s/ev-1.md")).toBe("original completo");
  });

  it("un fallo al renombrar no deja el original roto", async () => {
    const fs = new FsMemoria();
    await fs.escribir("/s/ev-1.md", "original");
    fs.fallo = (op) => (op === "renombrar" ? "entero" : null);
    await expect(escribirSeguro(fs, "/s/ev-1.md", "nuevo")).rejects.toThrow();
    fs.fallo = null;
    expect(await fs.leer("/s/ev-1.md")).toBe("original");
  });
});
