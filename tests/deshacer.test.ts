import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Sesion } from "../src/lib/app/sesion";
import * as c from "../src/lib/modelo/consultas";
import { Historial } from "../src/lib/modelo/deshacer";
import { crearPieza } from "../src/lib/modelo/ficheros";
import * as op from "../src/lib/modelo/operaciones";
import type { Evento } from "../src/lib/modelo/tipos";

describe("historial de deshacer (T7.3)", () => {
  const ev = (titulo: string) => crearPieza("evento", { id: "ev-1", titulo });

  it("deshacer devuelve el antes y rehacer el después", () => {
    const h = new Historial();
    h.hacer([{ id: "ev-1", antes: ev("A"), despues: ev("B") }]);
    expect(h.puedeDeshacer).toBe(true);
    expect(h.deshacer()!.guardar).toEqual([ev("A")]);
    expect(h.puedeRehacer).toBe(true);
    expect(h.rehacer()!.guardar).toEqual([ev("B")]);
  });

  it("deshacer una creación la borra; deshacer un borrado la vuelve a poner", () => {
    const h = new Historial();
    h.hacer([{ id: "ev-1", antes: null, despues: ev("Nuevo") }]);
    expect(h.deshacer()).toEqual({ guardar: [], borrar: [ev("Nuevo")] });
    const h2 = new Historial();
    h2.hacer([{ id: "ev-1", antes: ev("Viejo"), despues: null }]);
    expect(h2.deshacer()).toEqual({ guardar: [ev("Viejo")], borrar: [] });
  });

  it("hacer algo nuevo borra lo que se podía rehacer", () => {
    const h = new Historial();
    h.hacer([{ id: "ev-1", antes: ev("A"), despues: ev("B") }]);
    h.deshacer();
    h.hacer([{ id: "ev-1", antes: ev("A"), despues: ev("C") }]);
    expect(h.puedeRehacer).toBe(false);
  });

  it("escribir en un mismo campo seguido cuenta como un solo paso", () => {
    let ahora = 1000;
    const h = new Historial(() => ahora);
    h.hacer([{ id: "ev-1", antes: ev(""), despues: ev("H") }], "editar ev-1");
    ahora += 300;
    h.hacer([{ id: "ev-1", antes: ev("H"), despues: ev("Ho") }], "editar ev-1");
    ahora += 300;
    h.hacer([{ id: "ev-1", antes: ev("Ho"), despues: ev("Hola") }], "editar ev-1");
    expect(h.deshacer()!.guardar).toEqual([ev("")]);
    expect(h.puedeDeshacer).toBe(false);
    ahora += 5000;
    h.rehacer();
    h.hacer([{ id: "ev-1", antes: ev("Hola"), despues: ev("Hola!") }], "editar ev-1");
    ahora += 5000;
    h.hacer([{ id: "ev-1", antes: ev("Hola!"), despues: ev("Hola!!") }], "editar ev-1");
    expect(h.deshacer()!.guardar).toEqual([ev("Hola!")]);
  });
});

describe("deshacer en una serie abierta (T7.3)", () => {
  let fs: FsMemoria;
  let s: Sesion;

  beforeEach(async () => {
    vi.useFakeTimers();
    fs = new FsMemoria();
    const almacen = new Almacen(fs, "/d");
    await almacen.crearSerie("s", { titulo: "S", temporadas: ["te-1"] });
    await almacen.guardar("s", crearPieza("temporada", { id: "te-1", episodios: ["ep-1", "ep-2"] }));
    await almacen.guardar("s", crearPieza("episodio", { id: "ep-1", temporada: "te-1" }));
    await almacen.guardar("s", crearPieza("episodio", { id: "ep-2", temporada: "te-1" }));
    await almacen.guardar("s", crearPieza("evento", { id: "ev-1", titulo: "Uno", temporada: "te-1", episodio: "ep-1", orden: 1 }));
    s = await Sesion.abrir(almacen, "s", "PC");
  });

  afterEach(async () => {
    await s.cerrar();
    vi.useRealTimers();
  });

  it("editar: ida y vuelta", async () => {
    s.editar<Evento>("ev-1", (e) => (e.titulo = "Dos"));
    await vi.advanceTimersByTimeAsync(10);
    await s.deshacer();
    expect(s.modelo.eventos.get("ev-1")!.titulo).toBe("Uno");
    await s.rehacer();
    expect(s.modelo.eventos.get("ev-1")!.titulo).toBe("Dos");
  });

  it("borrar un evento y deshacer lo vuelve a poner en su celda; la copia se queda en la papelera (spec 007)", async () => {
    await s.aplicar(op.borrarPieza(s.modelo, "ev-1"));
    expect(s.modelo.eventos.has("ev-1")).toBe(false);
    const copias = await fs.listar("/d/s/_papelera");
    expect(copias.length).toBe(1);
    const copia = await fs.leer(`/d/s/_papelera/${copias[0].nombre}`);
    await s.deshacer();
    expect(c.eventosDeEpisodio(s.modelo, "ep-1").map((e) => e.id)).toEqual(["ev-1"]);
    expect(await fs.listar("/d/s/_papelera")).toEqual(copias);
    expect(await fs.leer(`/d/s/_papelera/${copias[0].nombre}`)).toBe(copia);
    await vi.advanceTimersByTimeAsync(600);
    expect(await fs.existe("/d/s/eventos/ev-1.md")).toBe(true);
    await s.rehacer();
    expect(s.modelo.eventos.has("ev-1")).toBe(false);
  });

  it("crear y deshacer lo quita; mover y reordenar también se deshacen", async () => {
    const { pieza, cambio } = op.crearEvento(s.modelo, { temporada: "te-1", episodio: "ep-2" });
    await s.aplicar(cambio);
    await s.aplicar(op.moverEvento(s.modelo, "ev-1", "ep-2", 0));
    expect(c.eventosDeEpisodio(s.modelo, "ep-2").map((e) => e.id)).toEqual(["ev-1", pieza.id]);
    await s.deshacer();
    expect(c.eventosDeEpisodio(s.modelo, "ep-1").map((e) => e.id)).toEqual(["ev-1"]);
    await s.deshacer();
    expect(s.modelo.eventos.has(pieza.id)).toBe(false);
    await s.aplicar(op.moverEpisodio(s.modelo, "ep-2", 0));
    expect(c.codigo(s.modelo, "ep-2")).toBe("T01E01");
    await s.deshacer();
    expect(c.codigo(s.modelo, "ep-2")).toBe("T01E02");
  });
});
