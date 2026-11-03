import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Sesion } from "../src/lib/app/sesion";
import { crearPieza } from "../src/lib/modelo/ficheros";
import { leidoPorV1 } from "./compat/uso-v1";

const RAIZ = "/appDatos";
let fs: FsMemoria;
let almacen: Almacen;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 19, 18, 20));
  fs = new FsMemoria();
  almacen = new Almacen(fs, RAIZ);
  await almacen.crearSerie("s", { titulo: "S" });
  await almacen.guardar("s", crearPieza("evento", { id: "ev-1", titulo: "Uno" }));
});

afterEach(() => vi.useRealTimers());

describe("sesión de una serie abierta (T1.9)", () => {
  it("abre el modelo, escribe .abierta y al cerrar lo borra", async () => {
    const s = await Sesion.abrir(almacen, "s", "PC");
    expect(s.modelo.eventos.get("ev-1")!.titulo).toBe("Uno");
    expect(s.avisoUso).toBeNull();
    expect(await fs.existe(`${RAIZ}/s/.abierta`)).toBe(true);
    await s.cerrar();
    expect(await fs.existe(`${RAIZ}/s/.abierta`)).toBe(false);
  });

  it("avisa si la serie está abierta en el otro equipo", async () => {
    const mac = await Sesion.abrir(almacen, "s", "Mac-Portatil");
    const pc = await Sesion.abrir(new Almacen(fs, RAIZ), "s", "PC");
    expect(pc.avisoUso).toBe("Está abierta en Mac-Portatil desde las 18:20");
    await mac.cerrar();
    await pc.cerrar();
  });

  it("enseña conflictos y ficheros rotos", async () => {
    await fs.escribir(`${RAIZ}/s/eventos/ev-1 (# Edit conflict 2026-10-19 abc #).md`, "otra versión");
    await fs.escribir(`${RAIZ}/s/eventos/ev-2.md`, "---\ntitulo: [roto\n---\n");
    const s = await Sesion.abrir(almacen, "s", "PC");
    expect(s.conflictos).toHaveLength(1);
    expect(s.problemas.map((p) => p.ruta)).toEqual([`${RAIZ}/s/eventos/ev-2.md`]);
    await s.cerrar();
  });

  it("recarga lo que cambia fuera y avisa a quien escucha", async () => {
    const s = await Sesion.abrir(almacen, "s", "PC");
    let avisos = 0;
    s.alCambiar(() => avisos++);
    await fs.cambiarDesdeFuera(`${RAIZ}/s/eventos/ev-1.md`, "---\nid: ev-1\ntipo: evento\ntitulo: Desde el Bloc de notas\n---\n");
    await vi.advanceTimersByTimeAsync(0);
    expect(s.modelo.eventos.get("ev-1")!.titulo).toBe("Desde el Bloc de notas");
    expect(avisos).toBeGreaterThan(0);

    // Un fichero que se rompe fuera sale en problemas, y desaparece de ahí al arreglarlo
    await fs.cambiarDesdeFuera(`${RAIZ}/s/eventos/ev-1.md`, "---\ntitulo: [roto\n---\n");
    await vi.advanceTimersByTimeAsync(0);
    expect(s.problemas).toHaveLength(1);
    expect(s.modelo.eventos.get("ev-1")!.titulo).toBe("Desde el Bloc de notas");
    await fs.cambiarDesdeFuera(`${RAIZ}/s/eventos/ev-1.md`, "---\nid: ev-1\ntipo: evento\ntitulo: Arreglado\n---\n");
    await vi.advanceTimersByTimeAsync(0);
    expect(s.problemas).toEqual([]);
    await s.cerrar();
  });

  it("aplica cambios: guarda solo, borra a la papelera y al cerrar no deja nada sin guardar", async () => {
    const s = await Sesion.abrir(almacen, "s", "PC");
    s.editar("ev-1", (p) => {
      if (p.tipo === "evento") p.titulo = "Editado";
    });
    expect(s.modelo.eventos.get("ev-1")!.titulo).toBe("Editado");
    expect(s.guardado.pendiente).toBe(true);
    await vi.advanceTimersByTimeAsync(600);
    expect(await fs.leer(`${RAIZ}/s/eventos/ev-1.md`)).toContain("titulo: Editado");

    await s.aplicar({ guardar: [], borrar: [s.modelo.eventos.get("ev-1")!] });
    expect(s.modelo.eventos.has("ev-1")).toBe(false);
    expect(await fs.existe(`${RAIZ}/s/eventos/ev-1.md`)).toBe(false);
    expect((await fs.listar(`${RAIZ}/s/_papelera`)).length).toBe(1);

    await s.aplicar({ guardar: [crearPieza("evento", { id: "ev-2", titulo: "Nuevo" })], borrar: [] });
    await s.cerrar();
    expect(await fs.leer(`${RAIZ}/s/eventos/ev-2.md`)).toContain("titulo: Nuevo");
  });

  it("lo que guarda la propia app no se recarga como cambio de fuera", async () => {
    const s = await Sesion.abrir(almacen, "s", "PC");
    s.editar("ev-1", (p) => {
      if (p.tipo === "evento") p.titulo = "Mío";
    });
    await vi.advanceTimersByTimeAsync(11_000);
    expect(s.problemas).toEqual([]);
    expect(s.modelo.eventos.get("ev-1")!.titulo).toBe("Mío");
    await s.cerrar();
  });

  it("hace una instantánea al abrir y otra a los 30 min solo si hubo cambios", async () => {
    const s = await Sesion.abrir(almacen, "s", "PC");
    expect((await s.instantaneas.listar()).length).toBe(1);
    await vi.advanceTimersByTimeAsync(30 * 60_000);
    expect((await s.instantaneas.listar()).length).toBe(1);
    s.editar("ev-1", (p) => {
      if (p.tipo === "evento") p.titulo = "Otro";
    });
    await vi.advanceTimersByTimeAsync(30 * 60_000);
    expect((await s.instantaneas.listar()).length).toBe(2);
    await s.cerrar();
  });
});

describe("«Lo sé» junto a un campo (spec 004)", () => {
  const aviso = (id: string) => ({ id, pieza: "ev-1", clase: "aviso" as const, mensaje: "", fuente: "", grupo: "Escenas" as const });

  it("escribir y pulsar «Lo sé» enseguida son dos pasos de deshacer, y en disco queda como siempre", async () => {
    const s = await Sesion.abrir(almacen, "s", "PC");
    s.editar("ev-1", (p) => {
      if (p.tipo === "evento") p.titulo = "Editado";
    });
    s.loSe(aviso("C08"), true);
    await vi.advanceTimersByTimeAsync(0);
    expect(s.modelo.eventos.get("ev-1")!.avisos_silenciados).toEqual(["C08"]);
    await vi.advanceTimersByTimeAsync(600);
    expect(await fs.leer(`${RAIZ}/s/eventos/ev-1.md`)).toMatch(/avisos_silenciados:\s*(\[C08\]|\n\s*- C08)/);
    expect(leidoPorV1(await fs.leer(`${RAIZ}/s/eventos/ev-1.md`), "evento")).toMatchObject({ titulo: "Editado", avisos_silenciados: ["C08"] });

    await s.deshacer();
    expect(s.modelo.eventos.get("ev-1")!.avisos_silenciados).toEqual([]);
    expect(s.modelo.eventos.get("ev-1")!.titulo).toBe("Editado");
    await s.cerrar();
  });

  it("quitar «lo sé» vuelve a activar todas las variantes de esa comprobación", async () => {
    await almacen.guardar("s", crearPieza("evento", { id: "ev-1", titulo: "Uno", avisos_silenciados: ["C01a", "C01b", "C08"] }));
    const s = await Sesion.abrir(almacen, "s", "PC");
    s.loSe(aviso("C01a"), false);
    await vi.advanceTimersByTimeAsync(0);
    expect(s.modelo.eventos.get("ev-1")!.avisos_silenciados).toEqual(["C08"]);
    await s.cerrar();
  });
});
