import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Guardado } from "../src/lib/almacen/guardado";
import { crearPieza } from "../src/lib/modelo/ficheros";
import type { Evento } from "../src/lib/modelo/tipos";

let fs: FsMemoria;
let almacen: Almacen;
let escrituras: string[];

beforeEach(async () => {
  vi.useFakeTimers();
  fs = new FsMemoria();
  almacen = new Almacen(fs, "/d");
  await almacen.crearSerie("s", { titulo: "S" });
  escrituras = [];
  fs.alOperar = (op, ruta) => {
    if (op === "renombrar") escrituras.push(ruta.split("/").pop()!.replace(".tmp", ""));
  };
});

afterEach(() => vi.useRealTimers());

const ev = (titulo: string): Evento => crearPieza("evento", { id: "ev-1", titulo });

describe("guardado automático (spec 5.6, T2.1)", () => {
  it("guarda al dejar de escribir, en menos de 1 s, y solo la última versión", async () => {
    const g = new Guardado(almacen, "s");
    g.pedir(ev("U"));
    await vi.advanceTimersByTimeAsync(200);
    g.pedir(ev("Un"));
    await vi.advanceTimersByTimeAsync(200);
    g.pedir(ev("Uno"));
    expect(escrituras).toEqual([]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(escrituras).toEqual(["ev-1.md"]);
    expect(await fs.leer("/d/s/eventos/ev-1.md")).toContain("titulo: Uno");
  });

  it("apunta la hora del último guardado y avisa", async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 18, 0, 0));
    let avisos = 0;
    const g = new Guardado(almacen, "s", 500, () => avisos++);
    expect(g.ultimo).toBeNull();
    g.pedir(ev("Uno"));
    expect(g.pendiente).toBe(true);
    await vi.advanceTimersByTimeAsync(600);
    expect(g.pendiente).toBe(false);
    expect(g.ultimo).toBe(new Date(2026, 9, 19, 18, 0, 0, 500).getTime());
    expect(avisos).toBeGreaterThan(0);
  });

  it("vaciar guarda ya lo pendiente (al cerrar)", async () => {
    const g = new Guardado(almacen, "s");
    g.pedir(ev("Uno"));
    g.pedir(crearPieza("evento", { id: "ev-2" }));
    await g.vaciar();
    expect(escrituras.sort()).toEqual(["ev-1.md", "ev-2.md"]);
  });

  it("olvidar quita lo pendiente de una pieza que se borra", async () => {
    const g = new Guardado(almacen, "s");
    g.pedir(ev("Uno"));
    g.olvidar("ev-1");
    await vi.advanceTimersByTimeAsync(1000);
    expect(escrituras).toEqual([]);
  });

  it("si falla al escribir, lo dice y lo vuelve a intentar", async () => {
    const g = new Guardado(almacen, "s");
    fs.fallo = (op) => (op === "escribir" ? "entero" : null);
    g.pedir(ev("Uno"));
    await vi.advanceTimersByTimeAsync(600);
    expect(g.error).toMatch(/No se pudo guardar/);
    expect(g.pendiente).toBe(true);
    fs.fallo = null;
    await vi.advanceTimersByTimeAsync(5000);
    expect(g.error).toBeNull();
    expect(await fs.leer("/d/s/eventos/ev-1.md")).toContain("titulo: Uno");
  });
});
