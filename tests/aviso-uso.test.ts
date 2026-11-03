import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvisoUso } from "../src/lib/almacen/aviso-uso";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";

const SERIE = "/appDatos/s";
const RUTA = `${SERIE}/.abierta`;
let fs: FsMemoria;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 19, 18, 20, 0));
  fs = new FsMemoria();
});

afterEach(() => vi.useRealTimers());

describe("aviso de uso (spec 11.2, M6)", () => {
  it("al abrir escribe el nombre del equipo y la hora", async () => {
    const a = new AvisoUso(fs, SERIE, "PC-ESTUDIO");
    await a.abrir();
    const texto = await fs.leer(RUTA);
    expect(texto).toContain("equipo: PC-ESTUDIO");
    expect(texto).toContain("desde: 2026-10-19T");
    a.detener();
  });

  it("se refresca cada 60 s", async () => {
    const a = new AvisoUso(fs, SERIE, "PC");
    await a.abrir();
    const f1 = await fs.fecha(RUTA);
    await vi.advanceTimersByTimeAsync(59_000);
    expect(await fs.fecha(RUTA)).toBe(f1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await fs.fecha(RUTA)).not.toBe(f1);
    const texto = await fs.leer(RUTA);
    expect(texto).toContain("desde: 2026-10-19T");
    a.detener();
  });

  it("si está abierta en otro equipo hace menos de 3 min, lo dice", async () => {
    const pc = new AvisoUso(fs, SERIE, "PC");
    await pc.abrir();
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    const mac = new AvisoUso(fs, SERIE, "Mac-Portatil");
    expect(await mac.comprobar()).toBe("Está abierta en PC desde las 18:20");
    pc.detener();
  });

  it("si el aviso es más viejo de 3 min, no dice nada", async () => {
    const pc = new AvisoUso(fs, SERIE, "PC");
    await pc.abrir();
    pc.detener(); // se colgó: ya no refresca
    await vi.advanceTimersByTimeAsync(3 * 60_000 + 1_000);
    expect(await new AvisoUso(fs, SERIE, "Mac").comprobar()).toBeNull();
  });

  it("el propio equipo no se avisa a sí mismo", async () => {
    const pc = new AvisoUso(fs, SERIE, "PC");
    await pc.abrir();
    expect(await new AvisoUso(fs, SERIE, "PC").comprobar()).toBeNull();
    pc.detener();
  });

  it("sin fichero o con un fichero ilegible, no dice nada", async () => {
    expect(await new AvisoUso(fs, SERIE, "Mac").comprobar()).toBeNull();
    await fs.escribir(RUTA, "basura sin formato");
    expect(await new AvisoUso(fs, SERIE, "Mac").comprobar()).toBeNull();
  });

  it("al cerrar se borra y deja de refrescar", async () => {
    const a = new AvisoUso(fs, SERIE, "PC");
    await a.abrir();
    await a.cerrar();
    expect(await fs.existe(RUTA)).toBe(false);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(await fs.existe(RUTA)).toBe(false);
  });

  it("al cerrar no borra el aviso de otro equipo", async () => {
    const a = new AvisoUso(fs, SERIE, "PC");
    await a.abrir();
    await fs.cambiarDesdeFuera(RUTA, `equipo: Mac\ndesde: ${new Date().toISOString()}\nrefresco: ${new Date().toISOString()}\n`);
    await a.cerrar();
    expect(await fs.existe(RUTA)).toBe(true);
  });
});
