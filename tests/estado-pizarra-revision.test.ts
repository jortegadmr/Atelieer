import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { AlmacenPizarra, BorradaFuera } from "../src/lib/almacen/almacen-pizarra";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { EstadoApp } from "../src/lib/app/estado.svelte";
import { GuardadoPizarra } from "../src/lib/pizarra/guardado";
import { HistorialPizarra } from "../src/lib/pizarra/historial";
import { crearNota, editarNota, subir } from "../src/lib/pizarra/operaciones";
import { vacia, type Nota, type Pizarra } from "../src/lib/pizarra/tipos";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 012, T17: lo que encontró la revisión de código.

const RUTA = `${APPDATOS}/_prueba/_pizarra/pizarra.md`;

const conTexto = (texto: string): Pizarra => {
  const r = crearNota(vacia(), { x: 1, y: 2 }, "pz-a");
  if ("error" in r) throw new Error(r.error);
  return editarNota(r.pizarra, "pz-a", texto).pizarra;
};

describe("guardado: fallos al releer y cambios durante el guardado", () => {
  let fs: FsMemoria;
  let disco: AlmacenPizarra;
  let g: GuardadoPizarra;
  const ruta = "/d/s/_pizarra/pizarra.md";

  beforeEach(async () => {
    vi.useFakeTimers();
    fs = new FsMemoria();
    const almacen = new Almacen(fs, "/d");
    await almacen.crearSerie("s", { titulo: "S" });
    disco = new AlmacenPizarra(almacen, "s");
    await disco.cargar();
    g = new GuardadoPizarra(disco);
  });
  afterEach(() => vi.useRealTimers());

  it("si releer falla tras un cambio de fuera, lo dice y los guardados siguientes funcionan", async () => {
    g.cambiar(conTexto("a"));
    await g.vaciar();
    // Otro programa cambia el fichero y la relectura falla una vez
    await fs.escribir(ruta, (await fs.leer(ruta)) + "\n");
    const releer = vi.spyOn(disco, "releer").mockRejectedValueOnce(new Error("sin permiso"));
    g.cambiar(conTexto("b"));
    await g.vaciar();
    expect(g.error).toMatch(/sin permiso/);
    releer.mockRestore();
    // La cola no queda rota: el siguiente cambio se escribe
    await disco.releer();
    g.cambiar(conTexto("c"));
    await g.vaciar();
    expect(await fs.leer(ruta)).toContain('"c"');
  });

  it("si el fichero se borra por fuera durante un guardado, un cambio más nuevo sigue pendiente", async () => {
    g.cambiar(conTexto("a"));
    await g.vaciar();
    await fs.borrar(ruta);
    let soltar: () => void = () => undefined;
    const espera = new Promise<void>((r) => (soltar = r));
    vi.spyOn(disco, "guardar").mockImplementationOnce(async () => {
      await espera;
      throw new BorradaFuera(ruta);
    });
    g.cambiar(conTexto("b"));
    const en = g.vaciar();
    await vi.advanceTimersByTimeAsync(0);
    // Llega otro cambio mientras el guardado está en vuelo
    g.cambiar(conTexto("c"));
    soltar();
    await en;
    expect(g.aviso).toMatch(/borró fuera/);
    expect(g.hayPendiente).toBe(true);
  });
});

describe("historial: lo que cambia sin ser un paso", () => {
  it("quitar una nota vacía recién creada hace desaparecer su paso", () => {
    const h = new HistorialPizarra();
    const p0 = vacia();
    const r = crearNota(p0, { x: 0, y: 0 }, "pz-x");
    if ("error" in r) throw new Error(r.error);
    h.hacer(p0, r.pizarra);
    const sin = { ...r.pizarra, elementos: r.pizarra.elementos.filter((e) => e.id !== "pz-x") };
    h.seguir(r.pizarra, sin);
    expect(h.puedeDeshacer).toBe(false);
  });

  it("subir una nota deja el paso acabando en lo subido: rehacer no la baja", () => {
    const h = new HistorialPizarra();
    let p = vacia();
    for (const id of ["pz-1", "pz-2"]) {
      const r = crearNota(p, { x: 0, y: 0 }, id);
      if ("error" in r) throw new Error(r.error);
      h.hacer(p, r.pizarra);
      p = r.pizarra;
    }
    const arriba = subir(p, "pz-1");
    h.seguir(p, arriba);
    expect(h.deshacer()).not.toBeNull();
    expect(h.rehacer()).toBe(arriba);
  });
});

describe("estado de la pizarra: carga y solo lectura", () => {
  let abiertos: EstadoApp[] = [];
  afterEach(async () => {
    for (const e of abiertos) await e.cerrar();
    abiertos = [];
  });

  async function preparar(abrirPizarra = true) {
    const fs = await vaultDePrueba();
    const e = new EstadoApp(fs, async () => "PC");
    abiertos.push(e);
    await e.ponerRaiz(APPDATOS);
    await e.abrir("_prueba");
    e.cambiarVista("pizarra");
    if (abrirPizarra) await e.pizarra.abrir();
    return { e, fs };
  }

  it("una lectura que falla se dice y se puede reintentar", async () => {
    const { e, fs } = await preparar(false);
    // Aún no estaba cargada o la dejamos como al entrar
    e.pizarra.reiniciar();
    await fs.crearDir(`${APPDATOS}/_prueba/_pizarra`);
    await fs.escribir(RUTA, "x");
    const original = fs.leer.bind(fs);
    fs.leer = async (r: string) => {
      if (r === RUTA) throw new Error("sin permiso");
      return original(r);
    };
    await e.pizarra.abrir();
    expect(e.pizarra.cargada).toBe(false);
    expect(e.pizarra.errorCarga).toMatch(/sin permiso/);
    fs.leer = original;
    await e.pizarra.abrir();
    expect(e.pizarra.errorCarga).toBeNull();
    expect(e.pizarra.cargada).toBe(true);
  });

  it("abrir dos veces seguidas lee una sola vez", async () => {
    const { e, fs } = await preparar(false);
    e.pizarra.reiniciar();
    let lecturas = 0;
    const original = fs.existe.bind(fs);
    fs.existe = async (r: string) => {
      if (r === RUTA) lecturas++;
      return original(r);
    };
    await Promise.all([e.pizarra.abrir(), e.pizarra.abrir()]);
    expect(lecturas).toBe(1);
    expect(e.pizarra.cargada).toBe(true);
  });

  it("en solo lectura, deshacer no gasta pasos y el botón no se ofrece", async () => {
    const { e } = await preparar();
    const id = (e.pizarra.crearNota({ x: 1, y: 1 }) as { id: string }).id;
    e.pizarra.editarNota(id, "hola");
    (e as unknown as { variante: unknown }).variante = { modelo: { eventos: new Map() } };
    expect(e.pizarra.puedeDeshacer).toBe(false);
    expect(e.pizarra.deshacer()).toBe(false);
    (e as unknown as { variante: unknown }).variante = null;
    // El paso sigue ahí al volver
    expect(e.pizarra.deshacer()).toBe(true);
  });

  it("una nota vacía que se quita sola no resucita al rehacer", async () => {
    const { e } = await preparar();
    const id = (e.pizarra.crearNota({ x: 1, y: 1 }) as { id: string }).id;
    expect(e.pizarra.quitarNotaVacia(id)).toBe(true);
    expect(e.pizarra.puedeDeshacer).toBe(false);
    expect(e.pizarra.rehacer()).toBe(false);
    expect(e.pizarra.pizarra.elementos).toHaveLength(0);
  });

  it("una edición hecha mientras se relee tras un cambio de fuera no se escribe encima", async () => {
    const { e, fs } = await preparar();
    const id = (e.pizarra.crearNota({ x: 1, y: 1 }) as { id: string }).id;
    e.pizarra.editarNota(id, "mía");
    await e.pizarra.alSalir();
    const s = (e.pizarra as unknown as { sesion: { pizarra: AlmacenPizarra } }).sesion;
    const releer = s.pizarra.releer.bind(s.pizarra);
    s.pizarra.releer = async () => {
      // El autor teclea justo mientras se relee
      e.pizarra.editarNota(id, "tecleada sobre lo viejo");
      return releer();
    };
    // Cambio por fuera
    await fs.escribir(RUTA, (await fs.leer(RUTA)).replace("mía", "de fuera"));
    await e.pizarra.alCambiarFuera([{ ruta: RUTA, que: "cambiado" }]);
    await new Promise((r) => setTimeout(r, 50));
    await e.pizarra.alSalir();
    expect(await fs.leer(RUTA)).not.toContain("tecleada");
    expect(await fs.leer(RUTA)).toContain("de fuera");
    expect((e.pizarra.pizarra.elementos[0] as Nota).texto).toBe("de fuera");
  });
});
