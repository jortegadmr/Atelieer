import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { AlmacenGuion, type CargaGuion } from "../src/lib/almacen/almacen-guion";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Sesion } from "../src/lib/app/sesion";
import { escribirGuion, leerGuion } from "../src/lib/guion/formato";
import { GuardadoGuion } from "../src/lib/guion/guardado";
import { vacio, type Guion } from "../src/lib/guion/tipos";
import { crearPieza } from "../src/lib/modelo/ficheros";

const RAIZ = "/d";
const A = "ev-aaaa";
const B = "ev-bbbb";
const ruta = (id: string) => `${RAIZ}/s/_guion/${id}.md`;
const papelera = (fs: FsMemoria) => fs.rutas().filter((r) => r.includes("/_papelera/_guion/"));

let fs: FsMemoria;
let almacen: Almacen;
let disco: AlmacenGuion;
let g: GuardadoGuion;
let escrituras: Map<string, number>;

const con = (id: string, texto: string): Guion => ({ ...vacio(id), texto });
const enDisco = async (id: string) => (leerGuion(await fs.leer(ruta(id))) as { guion: Guion }).guion.texto;

beforeEach(async () => {
  vi.useFakeTimers();
  fs = new FsMemoria();
  almacen = new Almacen(fs, RAIZ);
  await almacen.crearSerie("s", { titulo: "S" });
  disco = new AlmacenGuion(almacen, "s");
  await disco.cargar(A);
  await disco.cargar(B);
  g = new GuardadoGuion(disco);
  escrituras = new Map();
  fs.alOperar = (op, r) => {
    const m = /\/_guion\/(ev-[a-z0-9]+)\.md\.tmp$/.exec(r);
    if (op === "escribir" && m) escrituras.set(m[1]!, (escrituras.get(m[1]!) ?? 0) + 1);
  };
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Guardado diferido del guion (spec 013, T9)", () => {
  it("varios cambios seguidos, un solo guardado por escena y con lo último", async () => {
    g.cambiar(A, con(A, "a"));
    await vi.advanceTimersByTimeAsync(200);
    g.cambiar(A, con(A, "ab"));
    g.cambiar(B, con(B, "b"));
    await vi.advanceTimersByTimeAsync(200);
    g.cambiar(A, con(A, "abc"));
    expect(g.hayPendiente).toBe(true);
    expect(escrituras.size).toBe(0);
    await vi.advanceTimersByTimeAsync(700);
    expect(escrituras.get(A)).toBe(1);
    expect(escrituras.get(B)).toBe(1);
    expect(await enDisco(A)).toBe("abc");
    expect(await enDisco(B)).toBe("b");
    expect(g.hayPendiente).toBe(false);
    expect(g.errores.size).toBe(0);
  });

  it("vaciar guarda todo lo pendiente ya, sin esperar, y no vuelve a escribir al saltar el temporizador", async () => {
    g.cambiar(A, con(A, "uno"));
    g.cambiar(B, con(B, "dos"));
    await g.vaciar();
    expect(await enDisco(A)).toBe("uno");
    expect(await enDisco(B)).toBe("dos");
    await vi.advanceTimersByTimeAsync(2000);
    expect(escrituras.get(A)).toBe(1);
  });

  it("vaciar sin nada pendiente no escribe ni crea la carpeta", async () => {
    await g.vaciar();
    expect(escrituras.size).toBe(0);
    expect(await fs.existe(`${RAIZ}/s/_guion`)).toBe(false);
  });

  it("un fallo se enseña, conserva el texto y reintenta con el siguiente cambio", async () => {
    fs.fallo = (op, r) => (op === "escribir" && r.endsWith(".tmp") ? "entero" : null);
    g.cambiar(A, con(A, "uno"));
    await vi.advanceTimersByTimeAsync(700);
    expect(g.errores.get(A)).toMatch(/Fallo simulado/);
    expect(g.hayPendienteDe(A)).toBe(true);
    expect(await fs.existe(ruta(A))).toBe(false);
    fs.fallo = null;
    g.cambiar(A, con(A, "dos"));
    await vi.advanceTimersByTimeAsync(700);
    expect(g.errores.size).toBe(0);
    expect(await enDisco(A)).toBe("dos");
  });

  it("el botón de reintentar guarda lo pendiente", async () => {
    fs.fallo = (op, r) => (op === "escribir" && r.endsWith(".tmp") ? "entero" : null);
    g.cambiar(A, con(A, "uno"));
    await vi.advanceTimersByTimeAsync(700);
    fs.fallo = null;
    await g.reintentar(A);
    expect(g.errores.size).toBe(0);
    expect(await enDisco(A)).toBe("uno");
  });

  it("si se borró fuera, avisa, no la recrea sola y el siguiente cambio la escribe", async () => {
    g.cambiar(A, con(A, "mía"));
    await g.vaciar();
    await fs.borrar(ruta(A));
    g.cambiar(A, con(A, "sigo aquí"));
    await vi.advanceTimersByTimeAsync(700);
    expect(g.borradas.has(A)).toBe(true);
    expect(await fs.existe(ruta(A))).toBe(false);
    g.cambiar(A, con(A, "otra vez"));
    await g.vaciar();
    expect(await enDisco(A)).toBe("otra vez");
    expect(g.borradas.has(A)).toBe(false);
  });

  it("dos guardados no se cruzan: un cambio mientras se escribe va después, en orden", async () => {
    let segundo: Promise<void> | null = null;
    fs.alOperar = (op, r) => {
      if (op !== "escribir" || !r.endsWith(`${A}.md.tmp`)) return;
      escrituras.set(A, (escrituras.get(A) ?? 0) + 1);
      if (escrituras.get(A) === 1) {
        g.cambiar(A, con(A, "segundo"));
        segundo = g.vaciar();
      }
    };
    g.cambiar(A, con(A, "primero"));
    await g.vaciar();
    await segundo;
    expect(await enDisco(A)).toBe("segundo");
    expect(escrituras.get(A)).toBe(2);
  });

  it("descartar quita lo pendiente y los errores", async () => {
    fs.fallo = (op, r) => (op === "escribir" && r.endsWith(".tmp") ? "entero" : null);
    g.cambiar(A, con(A, "uno"));
    await vi.advanceTimersByTimeAsync(700);
    g.descartar();
    expect(g.hayPendiente).toBe(false);
    expect(g.errores.size).toBe(0);
    fs.fallo = null;
    await vi.advanceTimersByTimeAsync(5000);
    expect(await fs.existe(ruta(A))).toBe(false);
  });
});

describe("Cambio por fuera: nada se descarta (spec 013, T10a)", () => {
  const deFuera = (texto: string) => escribirGuion(con(A, texto));

  async function conCambioFuera(): Promise<string> {
    g.cambiar(A, con(A, "mía"));
    await g.vaciar();
    const fuera = deFuera("de fuera");
    await fs.cambiarDesdeFuera(ruta(A), fuera);
    g.cambiar(A, con(A, "mía, más nueva"));
    await vi.advanceTimersByTimeAsync(700);
    return fuera;
  }

  it("la versión local se conserva y el guardado de esa escena queda bloqueado", async () => {
    const fuera = await conCambioFuera();
    expect(g.cambiadas.get(A)?.local.texto).toBe("mía, más nueva");
    expect(await fs.leer(ruta(A))).toBe(fuera);
    expect(g.hayPendiente).toBe(false);
    // Sigue escribiendo el autor: se conserva lo último, el disco no se toca
    g.cambiar(A, con(A, "mía, aún más nueva"));
    await vi.advanceTimersByTimeAsync(5000);
    expect(g.cambiadas.get(A)?.local.texto).toBe("mía, aún más nueva");
    expect(await fs.leer(ruta(A))).toBe(fuera);
    expect(papelera(fs)).toEqual([]);
  });

  it("Quedarme con la mía: copia de la del disco a la papelera y escribe la local", async () => {
    const fuera = await conCambioFuera();
    await g.quedarmeConLaMia(A);
    expect(g.cambiadas.has(A)).toBe(false);
    expect(await enDisco(A)).toBe("mía, más nueva");
    const copias = papelera(fs);
    expect(copias).toHaveLength(1);
    expect(await fs.leer(copias[0]!)).toBe(fuera);
    // Y ya vuelve a guardar con normalidad
    g.cambiar(A, con(A, "y sigo"));
    await g.vaciar();
    expect(await enDisco(A)).toBe("y sigo");
  });

  it("Usar la de fuera: copia de la local a la papelera y carga la del disco", async () => {
    const fuera = await conCambioFuera();
    const recibidas: Array<[string, CargaGuion]> = [];
    g.alFuera = (id, c) => recibidas.push([id, c]);
    await g.usarLaDeFuera(A);
    expect(g.cambiadas.has(A)).toBe(false);
    expect(await fs.leer(ruta(A))).toBe(fuera);
    expect(recibidas).toHaveLength(1);
    expect(recibidas[0]![0]).toBe(A);
    expect(recibidas[0]![1].guion.texto).toBe("de fuera");
    const copias = papelera(fs);
    expect(copias).toHaveLength(1);
    expect((leerGuion(await fs.leer(copias[0]!)) as { guion: Guion }).guion.texto).toBe("mía, más nueva");
    g.cambiar(A, con(A, "sobre lo de fuera"));
    await g.vaciar();
    expect(await enDisco(A)).toBe("sobre lo de fuera");
  });

  it("Copiar la mía no cambia nada: la local sigue bloqueada y el disco igual", async () => {
    const fuera = await conCambioFuera();
    const antes = g.cambiadas.get(A);
    expect(antes?.local.texto).toBe("mía, más nueva");
    await vi.advanceTimersByTimeAsync(3000);
    expect(g.cambiadas.get(A)).toBe(antes);
    expect(await fs.leer(ruta(A))).toBe(fuera);
    expect(papelera(fs)).toEqual([]);
  });

  it("dos escenas no se afectan: la otra sigue guardando", async () => {
    await conCambioFuera();
    g.cambiar(B, con(B, "la otra"));
    await g.vaciar();
    expect(await enDisco(B)).toBe("la otra");
    expect(g.cambiadas.has(B)).toBe(false);
    expect(g.cambiadas.has(A)).toBe(true);
  });
});

describe("el guion en la sesión (spec 013, T9)", () => {
  let s: Sesion;

  beforeEach(async () => {
    await almacen.guardar("s", crearPieza("evento", { id: A, titulo: "Uno" }));
    s = await Sesion.abrir(almacen, "s", "PC");
  });

  afterEach(async () => {
    await s.cerrar();
  });

  it("la sesión trae el almacén y el guardado del guion", async () => {
    expect(s.guion).toBeInstanceOf(AlmacenGuion);
    expect(s.guardadoGuion).toBeInstanceOf(GuardadoGuion);
    expect((await s.guion.cargar(A)).guion.texto).toBe("");
  });

  it("un cambio de fuera en _guion llega al oyente de la sesión, no al de las piezas", async () => {
    const vistos: string[] = [];
    s.alCambiarGuion = (cambios) => vistos.push(...cambios.map((c) => c.que));
    await s.guion.cargar(A);
    await fs.crearDir(`${RAIZ}/s/_guion`);
    await fs.cambiarDesdeFuera(ruta(A), escribirGuion(con(A, "de otro equipo")));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(vistos).toEqual(["nuevo"]);
    expect(s.problemas).toEqual([]);
  });

  it("cerrar la sesión guarda lo pendiente del guion", async () => {
    await s.guion.cargar(A);
    s.guardadoGuion.cambiar(A, con(A, "al cerrar"));
    await s.cerrar();
    expect(await enDisco(A)).toBe("al cerrar");
  });

  it("restaurar una instantánea con un cambio pendiente no da CambioFuera", async () => {
    await s.guion.cargar(A);
    s.guardadoGuion.cambiar(A, con(A, "antes"));
    await s.guardadoGuion.vaciar();
    const i = await s.instantaneas.crear("con guion");
    s.guardadoGuion.cambiar(A, con(A, "pendiente"));
    await s.guardadoGuion.vaciar();
    await s.instantaneas.restaurar(i.nombre);
    expect(s.guardadoGuion.cambiadas.size).toBe(0);
    expect(s.guardadoGuion.errores.size).toBe(0);
    expect(await enDisco(A)).toBe("antes");
    // La serie se vuelve a abrir (como hace el estado) y el guion se escribe sin pelearse con nada
    await s.cerrar();
    s = await Sesion.abrir(almacen, "s", "PC");
    await s.guion.cargar(A);
    s.guardadoGuion.cambiar(A, con(A, "después"));
    await s.guardadoGuion.vaciar();
    expect(s.guardadoGuion.cambiadas.size).toBe(0);
    expect(await enDisco(A)).toBe("después");
  });

  describe("revisión de código de la spec 013 (T25c)", () => {
    it("fichero borrado fuera y el autor sale sin teclear más: el texto de pantalla se recrea al vaciar", async () => {
      g.cambiar(A, con(A, "mía"));
      await g.vaciar();
      await fs.borrar(ruta(A));
      g.cambiar(A, con(A, "sigo aquí"));
      await vi.advanceTimersByTimeAsync(700);
      expect(await fs.existe(ruta(A))).toBe(false);
      await g.vaciar();
      expect(await enDisco(A)).toBe("sigo aquí");
      expect(g.borradas.has(A)).toBe(false);
    });

    it("salvarLocales manda a la papelera lo cambiado por fuera antes de descartarlo", async () => {
      g.cambiar(A, con(A, "mía"));
      await g.vaciar();
      await fs.cambiarDesdeFuera(ruta(A), escribirGuion(con(A, "de fuera")));
      g.cambiar(A, con(A, "mi versión nueva"));
      await vi.advanceTimersByTimeAsync(700);
      expect(g.cambiadas.has(A)).toBe(true);
      expect(await g.salvarLocales(A)).toBe(1);
      g.descartar(A);
      const copias = await Promise.all(papelera(fs).map((r) => fs.leer(r)));
      expect(copias.some((c) => c.includes("mi versión nueva"))).toBe(true);
    });

    it("lo tecleado mientras se elige «usar la de fuera» también queda en la papelera", async () => {
      g.cambiar(A, con(A, "mía"));
      await g.vaciar();
      await fs.cambiarDesdeFuera(ruta(A), escribirGuion(con(A, "de fuera")));
      g.cambiar(A, con(A, "primera"));
      await vi.advanceTimersByTimeAsync(700);
      const espera = g.usarLaDeFuera(A);
      g.cambiar(A, con(A, "segunda, tecleada durante"));
      await espera;
      const copias = await Promise.all(papelera(fs).map((r) => fs.leer(r)));
      expect(copias.some((c) => c.includes("primera"))).toBe(true);
      expect(copias.some((c) => c.includes("segunda, tecleada durante"))).toBe(true);
    });

    it("marcarCambioFuera conserva lo escrito mientras se releía y bloquea el guardado", async () => {
      g.cambiar(A, con(A, "tecleado durante la relectura"));
      g.marcarCambioFuera(A, con(A, "tecleado durante la relectura"));
      expect(g.hayPendienteDe(A)).toBe(false);
      expect(g.cambiadas.get(A)?.local.texto).toBe("tecleado durante la relectura");
      await vi.advanceTimersByTimeAsync(700);
      expect(escrituras.get(A) ?? 0).toBe(0);
    });
  });
});
