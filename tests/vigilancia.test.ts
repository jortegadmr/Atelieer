import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { recargar, Vigilancia, type CambioExterno } from "../src/lib/almacen/vigilancia";
import { crearPieza, escribirPieza } from "../src/lib/modelo/ficheros";
import { Modelo } from "../src/lib/modelo/modelo";

const RAIZ = "/appDatos";
let fs: FsMemoria;
let almacen: Almacen;
let vistos: CambioExterno[];
let vigilancia: Vigilancia;

beforeEach(async () => {
  vi.useFakeTimers();
  fs = new FsMemoria();
  almacen = new Almacen(fs, RAIZ);
  await almacen.crearSerie("s", { titulo: "S" });
  await almacen.guardar("s", crearPieza("evento", { id: "ev-1", titulo: "Uno" }));
  vistos = [];
  vigilancia = new Vigilancia(almacen, "s", (c) => vistos.push(...c));
});

afterEach(() => {
  vigilancia.detener();
  vi.useRealTimers();
});

const RUTA = `${RAIZ}/s/eventos/ev-1.md`;

describe("vigilar cambios de fuera (spec 11.2)", () => {
  it("un cambio externo llega por el aviso del sistema", async () => {
    await vigilancia.iniciar();
    await fs.cambiarDesdeFuera(RUTA, escribirPieza(crearPieza("evento", { id: "ev-1", titulo: "Cambiado fuera" })));
    await vi.advanceTimersByTimeAsync(0);
    expect(vistos).toEqual([{ ruta: RUTA, que: "cambiado" }]);
  });

  it("un fichero propio recién escrito no provoca recarga", async () => {
    await vigilancia.iniciar();
    await almacen.guardar("s", crearPieza("evento", { id: "ev-1", titulo: "Mío" }));
    await almacen.guardar("s", crearPieza("evento", { id: "ev-2", titulo: "Nuevo mío" }));
    await almacen.borrar("s", crearPieza("evento", { id: "ev-2" }));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(vistos).toEqual([]);
  });

  it("si el aviso del sistema no llega, el repaso de fechas cada 10 s lo encuentra", async () => {
    fs.vigilanciaNativa = false;
    await vigilancia.iniciar();
    await fs.cambiarDesdeFuera(RUTA, "---\nid: ev-1\ntipo: evento\ntitulo: Fuera\n---\n");
    await fs.cambiarDesdeFuera(`${RAIZ}/s/eventos/ev-9.md`, "---\nid: ev-9\ntipo: evento\n---\n");
    await vi.advanceTimersByTimeAsync(9_000);
    expect(vistos).toEqual([]);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(vistos).toContainEqual({ ruta: RUTA, que: "cambiado" });
    expect(vistos).toContainEqual({ ruta: `${RAIZ}/s/eventos/ev-9.md`, que: "nuevo" });
  });

  it("un borrado de fuera también se ve", async () => {
    fs.vigilanciaNativa = false;
    await vigilancia.iniciar();
    await fs.borrar(RUTA);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(vistos).toEqual([{ ruta: RUTA, que: "borrado" }]);
  });

  it("un conflicto de Proton se avisa como conflicto", async () => {
    await vigilancia.iniciar();
    const ruta = `${RAIZ}/s/eventos/ev-1 (# Edit conflict 2026-10-15 5i1veaD #).md`;
    await fs.cambiarDesdeFuera(ruta, "---\nid: ev-1\ntipo: evento\ntitulo: Del Mac\n---\n");
    await vi.advanceTimersByTimeAsync(0);
    expect(vistos).toEqual([{ ruta, que: "conflicto" }]);
  });

  it("lo que no es pieza (.tmp, _papelera, .abierta) no se avisa", async () => {
    await vigilancia.iniciar();
    await fs.cambiarDesdeFuera(`${RAIZ}/s/eventos/ev-3.md.tmp`, "x");
    await fs.cambiarDesdeFuera(`${RAIZ}/s/_papelera/2026 ev-4.md`, "x");
    await fs.cambiarDesdeFuera(`${RAIZ}/s/.abierta`, "x");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(vistos).toEqual([]);
  });

  it("recargar aplica los cambios al modelo", async () => {
    const d = await almacen.abrirSerie("s");
    const m = new Modelo(d);
    await fs.cambiarDesdeFuera(RUTA, "---\nid: ev-1\ntipo: evento\ntitulo: Cambiado fuera\n---\n");
    await fs.cambiarDesdeFuera(`${RAIZ}/s/eventos/ev-9.md`, "---\nid: ev-9\ntipo: evento\ntitulo: Nuevo\n---\n");
    await fs.cambiarDesdeFuera(`${RAIZ}/s/eventos/ev-8.md`, "---\ntitulo: [roto\n---\n");
    const r = await recargar(almacen, m, [
      { ruta: RUTA, que: "cambiado" },
      { ruta: `${RAIZ}/s/eventos/ev-9.md`, que: "nuevo" },
      { ruta: `${RAIZ}/s/eventos/ev-8.md`, que: "nuevo" },
    ]);
    expect(m.eventos.get("ev-1")!.titulo).toBe("Cambiado fuera");
    expect(m.eventos.get("ev-9")!.titulo).toBe("Nuevo");
    expect(r.problemas).toHaveLength(1);
    await recargar(almacen, m, [{ ruta: RUTA, que: "borrado" }]);
    expect(m.eventos.has("ev-1")).toBe(false);
  });

  it("recargar serie.md cambia la serie", async () => {
    const m = new Modelo(await almacen.abrirSerie("s"));
    await fs.cambiarDesdeFuera(`${RAIZ}/s/serie.md`, escribirPieza({ ...m.serie, titulo: "Otra" }));
    await recargar(almacen, m, [{ ruta: `${RAIZ}/s/serie.md`, que: "cambiado" }]);
    expect(m.serie.titulo).toBe("Otra");
  });
});
