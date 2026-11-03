import { describe, expect, it } from "vitest";
import { ErrorFueraDeMesa, limitarBorrado } from "../src/lib/almacen/fs";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";

async function disco() {
  const fs = new FsMemoria();
  await fs.crearDir("C:/Vault/appDatos/_prueba");
  await fs.crearDir("C:/Vault/MiSerie/01_Wiki");
  await fs.crearDir("C:/Vault/appDatos2");
  await fs.escribir("C:/Vault/appDatos/_prueba/ev-1.md", "uno");
  await fs.escribir("C:/Vault/MiSerie/01_Wiki/Ficha.md", "ficha");
  await fs.escribir("C:/Vault/appDatos2/otra.md", "otra");
  return { fs, limitado: limitarBorrado(fs, "C:/Vault/appDatos") };
}

describe("borrar solo dentro de la mesa (RF-6, RF-7)", () => {
  it("borra dentro de la mesa", async () => {
    const { fs, limitado } = await disco();
    await limitado.borrar("C:/Vault/appDatos/_prueba/ev-1.md");
    expect(await fs.existe("C:/Vault/appDatos/_prueba/ev-1.md")).toBe(false);
  });

  it("no borra fuera de la mesa ni en la wiki, y avisa", async () => {
    const { fs, limitado } = await disco();
    await expect(limitado.borrar("C:/Vault/MiSerie/01_Wiki/Ficha.md")).rejects.toThrow(ErrorFueraDeMesa);
    await expect(limitado.borrar("C:/Vault/MiSerie/01_Wiki/Ficha.md")).rejects.toThrow("No se puede borrar fuera de la mesa");
    expect(await fs.existe("C:/Vault/MiSerie/01_Wiki/Ficha.md")).toBe(true);
  });

  it("una carpeta que solo empieza igual no cuenta como la mesa", async () => {
    const { fs, limitado } = await disco();
    await expect(limitado.borrar("C:/Vault/appDatos2/otra.md")).rejects.toThrow(ErrorFueraDeMesa);
    expect(await fs.existe("C:/Vault/appDatos2/otra.md")).toBe(true);
  });

  it("no se engaña con .. para salir de la mesa", async () => {
    const { fs, limitado } = await disco();
    await expect(limitado.borrar("C:/Vault/appDatos/_prueba/../../MiSerie/01_Wiki/Ficha.md")).rejects.toThrow(ErrorFueraDeMesa);
    expect(await fs.existe("C:/Vault/MiSerie/01_Wiki/Ficha.md")).toBe(true);
  });

  it("acepta la mesa escrita con \\ o con otras mayúsculas (Windows y Mac)", async () => {
    const { fs } = await disco();
    const limitado = limitarBorrado(fs, "c:\\vault\\APPDATOS\\");
    await limitado.borrar("C:\\Vault\\appDatos\\_prueba\\ev-1.md");
    expect(await fs.existe("C:/Vault/appDatos/_prueba/ev-1.md")).toBe(false);
  });

  it("no deja borrar la carpeta de la mesa entera", async () => {
    const { limitado } = await disco();
    await expect(limitado.borrar("C:/Vault/appDatos")).rejects.toThrow(ErrorFueraDeMesa);
  });

  it("lo demás pasa igual: leer y escribir fuera de la mesa sigue funcionando (RF-8)", async () => {
    const { limitado } = await disco();
    await limitado.escribir("C:/Vault/MiSerie/01_Wiki/Log.md", "log");
    expect(await limitado.leer("C:/Vault/MiSerie/01_Wiki/Log.md")).toBe("log");
    await limitado.renombrar("C:/Vault/MiSerie/01_Wiki/Log.md", "C:/Vault/MiSerie/01_Wiki/Log2.md");
    expect(await limitado.existe("C:/Vault/MiSerie/01_Wiki/Log2.md")).toBe(true);
  });
});
