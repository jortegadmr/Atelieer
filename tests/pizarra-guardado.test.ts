import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { AlmacenPizarra, BorradaFuera } from "../src/lib/almacen/almacen-pizarra";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Sesion } from "../src/lib/app/sesion";
import { GuardadoPizarra } from "../src/lib/pizarra/guardado";
import { escribirPizarra, leerPizarra } from "../src/lib/pizarra/formato";
import { crearNota, editarNota } from "../src/lib/pizarra/operaciones";
import { vacia, type Nota, type Pizarra } from "../src/lib/pizarra/tipos";

const RAIZ = "/d";
const RUTA = `${RAIZ}/s/_pizarra/pizarra.md`;

let fs: FsMemoria;
let almacen: Almacen;
let disco: AlmacenPizarra;
let g: GuardadoPizarra;
let escrituras: number;

function conTexto(texto: string): Pizarra {
  const r = crearNota(vacia(), { x: 1, y: 2 }, "pz-a");
  if ("error" in r) throw new Error(r.error);
  return editarNota(r.pizarra, "pz-a", texto).pizarra;
}

const enDisco = async () => ((leerPizarra(await fs.leer(RUTA)) as { pizarra: Pizarra }).pizarra.elementos[0] as Nota).texto;

beforeEach(async () => {
  vi.useFakeTimers();
  fs = new FsMemoria();
  almacen = new Almacen(fs, RAIZ);
  await almacen.crearSerie("s", { titulo: "S" });
  disco = new AlmacenPizarra(almacen, "s");
  await disco.cargar();
  g = new GuardadoPizarra(disco);
  escrituras = 0;
  fs.alOperar = (op, ruta) => {
    if (op === "escribir" && ruta.endsWith("pizarra.md.tmp")) escrituras++;
  };
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Guardado diferido de la pizarra (spec 012, T6)", () => {
  it("varios cambios seguidos, un solo guardado y con lo último", async () => {
    g.cambiar(conTexto("a"));
    await vi.advanceTimersByTimeAsync(200);
    g.cambiar(conTexto("ab"));
    await vi.advanceTimersByTimeAsync(200);
    g.cambiar(conTexto("abc"));
    expect(g.hayPendiente).toBe(true);
    expect(escrituras).toBe(0);
    await vi.advanceTimersByTimeAsync(700);
    expect(escrituras).toBe(1);
    expect(await enDisco()).toBe("abc");
    expect(g.hayPendiente).toBe(false);
    expect(g.error).toBeNull();
  });

  it("vaciar guarda ya, sin esperar", async () => {
    g.cambiar(conTexto("ya"));
    await g.vaciar();
    expect(await enDisco()).toBe("ya");
    expect(g.hayPendiente).toBe(false);
    // Y no vuelve a escribir cuando salta el temporizador
    await vi.advanceTimersByTimeAsync(2000);
    expect(escrituras).toBe(1);
  });

  it("vaciar sin nada pendiente no escribe", async () => {
    await g.vaciar();
    expect(escrituras).toBe(0);
    expect(await fs.existe(RUTA)).toBe(false);
  });

  it("un fallo se enseña, conserva lo pendiente y reintenta con el siguiente cambio", async () => {
    fs.fallo = (op, ruta) => (op === "escribir" && ruta.endsWith(".tmp") ? "entero" : null);
    g.cambiar(conTexto("uno"));
    await vi.advanceTimersByTimeAsync(700);
    expect(g.error).toMatch(/Fallo simulado/);
    expect(g.hayPendiente).toBe(true);
    expect(await fs.existe(RUTA)).toBe(false);
    fs.fallo = null;
    g.cambiar(conTexto("dos"));
    await vi.advanceTimersByTimeAsync(700);
    expect(g.error).toBeNull();
    expect(await enDisco()).toBe("dos");
  });

  it("el botón de reintentar guarda lo pendiente", async () => {
    fs.fallo = (op, ruta) => (op === "escribir" && ruta.endsWith(".tmp") ? "entero" : null);
    g.cambiar(conTexto("uno"));
    await vi.advanceTimersByTimeAsync(700);
    expect(g.error).not.toBeNull();
    fs.fallo = null;
    await g.reintentar();
    expect(g.error).toBeNull();
    expect(await enDisco()).toBe("uno");
  });

  it("si cambió fuera, relee, descarta lo pendiente, avisa y no pisa", async () => {
    g.cambiar(conTexto("mía"));
    await g.vaciar();
    const deFuera = escribirPizarra(conTexto("de fuera"));
    await fs.cambiarDesdeFuera(RUTA, deFuera);
    const recibidas: Pizarra[] = [];
    g.alFuera = (c) => recibidas.push(c.pizarra);
    g.cambiar(conTexto("otra mía"));
    await vi.advanceTimersByTimeAsync(700);
    expect(await fs.leer(RUTA)).toBe(deFuera);
    expect(recibidas).toHaveLength(1);
    expect((recibidas[0].elementos[0] as Nota).texto).toBe("de fuera");
    expect(g.hayPendiente).toBe(false);
    expect(g.aviso).toMatch(/cambió fuera/);
    expect(g.error).toBeNull();
    // Después de releer, el siguiente cambio ya se guarda
    g.cambiar(conTexto("sobre lo de fuera"));
    await g.vaciar();
    expect(await enDisco()).toBe("sobre lo de fuera");
  });

  it("si se borró fuera, avisa, no la vuelve a crear sola y la pizarra de pantalla sigue; el siguiente cambio la escribe", async () => {
    g.cambiar(conTexto("mía"));
    await g.vaciar();
    await fs.borrar(RUTA);
    const recibidas: unknown[] = [];
    g.alFuera = (c) => recibidas.push(c);
    g.cambiar(conTexto("sigo aquí"));
    await vi.advanceTimersByTimeAsync(700);
    expect(recibidas).toEqual([]);
    expect(await fs.existe(RUTA)).toBe(false);
    expect(g.aviso).toMatch(/borró fuera/);
    expect(g.hayPendiente).toBe(false);
    // Vaciar al cerrar tampoco la resucita
    await g.vaciar();
    expect(await fs.existe(RUTA)).toBe(false);
    g.cambiar(conTexto("sigo aquí, otra vez"));
    await g.vaciar();
    expect(await enDisco()).toBe("sigo aquí, otra vez");
  });

  it("el error de borrado es un CambioFuera especial", async () => {
    await disco.guardar(conTexto("x"));
    await fs.borrar(RUTA);
    await expect(disco.guardar(conTexto("y"))).rejects.toBeInstanceOf(BorradaFuera);
  });

  it("dos guardados no se cruzan: un cambio mientras se escribe va después, en orden", async () => {
    let segundo: Promise<void> | null = null;
    fs.alOperar = (op, ruta) => {
      if (op !== "escribir" || !ruta.endsWith("pizarra.md.tmp")) return;
      escrituras++;
      // Justo cuando empieza el primer guardado llega otro cambio
      if (escrituras === 1) {
        g.cambiar(conTexto("segundo"));
        segundo = g.vaciar();
      }
    };
    g.cambiar(conTexto("primero"));
    await g.vaciar();
    await segundo;
    expect(g.error).toBeNull();
    expect(await enDisco()).toBe("segundo");
    expect(escrituras).toBe(2);
  });

  it("un cambio y un vaciar seguidos escriben solo lo último", async () => {
    g.cambiar(conTexto("primero"));
    const a = g.vaciar();
    g.cambiar(conTexto("segundo"));
    const b = g.vaciar();
    await Promise.all([a, b]);
    expect(await enDisco()).toBe("segundo");
    expect(g.error).toBeNull();
  });

  it("descartar quita lo pendiente, el error y el aviso", async () => {
    fs.fallo = (op, ruta) => (op === "escribir" && ruta.endsWith(".tmp") ? "entero" : null);
    g.cambiar(conTexto("uno"));
    await vi.advanceTimersByTimeAsync(700);
    expect(g.error).not.toBeNull();
    g.descartar();
    expect(g.hayPendiente).toBe(false);
    expect(g.error).toBeNull();
    fs.fallo = null;
    await vi.advanceTimersByTimeAsync(5000);
    expect(await fs.existe(RUTA)).toBe(false);
  });

  it("avisa a la interfaz cada vez que cambia su estado", async () => {
    let avisos = 0;
    g.alCambiar = () => avisos++;
    g.cambiar(conTexto("x"));
    await g.vaciar();
    expect(avisos).toBeGreaterThanOrEqual(2);
  });
});

describe("la pizarra en la sesión (spec 012, T6)", () => {
  let s: Sesion;

  beforeEach(async () => {
    await almacen.guardar("s", (await import("../src/lib/modelo/ficheros")).crearPieza("evento", { id: "ev-1", titulo: "Uno" }));
    s = await Sesion.abrir(almacen, "s", "PC");
  });

  afterEach(async () => {
    await s.cerrar();
  });

  it("la sesión trae el almacén y el guardado de la pizarra", async () => {
    expect(s.pizarra).toBeInstanceOf(AlmacenPizarra);
    expect(s.guardadoPizarra).toBeInstanceOf(GuardadoPizarra);
    const c = await s.pizarra.cargar();
    expect(c.pizarra).toEqual(vacia());
  });

  it("un cambio de fuera en la pizarra llega al oyente de la sesión", async () => {
    const vistos: string[] = [];
    s.alCambiarPizarra = (cambios) => vistos.push(...cambios.map((c) => c.que));
    await s.pizarra.cargar();
    await fs.crearDir(`${RAIZ}/s/_pizarra`);
    await fs.cambiarDesdeFuera(RUTA, escribirPizarra(conTexto("de otro equipo")));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(vistos).toEqual(["nuevo"]);
  });

  it("cerrar la sesión guarda lo pendiente de la pizarra", async () => {
    await s.pizarra.cargar();
    s.guardadoPizarra.cambiar(conTexto("al cerrar"));
    await s.cerrar();
    expect(await enDisco()).toBe("al cerrar");
  });

  it("restaurar una instantánea con un cambio pendiente no da CambioFuera", async () => {
    await s.pizarra.cargar();
    s.guardadoPizarra.cambiar(conTexto("antes"));
    await s.guardadoPizarra.vaciar();
    const i = await s.instantaneas.crear("con pizarra");
    s.guardadoPizarra.cambiar(conTexto("pendiente"));
    await s.guardadoPizarra.vaciar();
    await s.instantaneas.restaurar(i.nombre);
    expect(s.guardadoPizarra.error).toBeNull();
    expect(await enDisco()).toBe("antes");
  });
});
