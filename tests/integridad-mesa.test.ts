import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Almacen, CambioFuera } from "../src/lib/almacen/almacen";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Guardado } from "../src/lib/almacen/guardado";
import { Sesion } from "../src/lib/app/sesion";
import { crearPieza } from "../src/lib/modelo/ficheros";
import { borrarPieza, crearEvento, crearTemporada, insertarEpisodio, moverEvento } from "../src/lib/modelo/operaciones";
import type { Evento, Serie } from "../src/lib/modelo/tipos";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 002, RNF integridad (constitución 2): una nota de la mesa que cambió
// fuera de Atelier (Obsidian, el otro equipo) no se pisa al guardar.

describe("el almacén no pisa una nota cambiada fuera", () => {
  let fs: FsMemoria;
  let almacen: Almacen;
  beforeEach(async () => {
    fs = new FsMemoria();
    almacen = new Almacen(fs, "/d");
    await almacen.crearSerie("s", { titulo: "S" });
  });

  it("lo propio se escribe una y otra vez", async () => {
    const ev = crearPieza("evento", { id: "ev-1", titulo: "Uno" });
    await almacen.guardar("s", ev);
    await almacen.guardar("s", { ...ev, titulo: "Dos" });
    expect(await fs.leer("/d/s/eventos/ev-1.md")).toContain("titulo: Dos");
  });

  it("serie.md cambiada fuera: no se escribe y lo dice", async () => {
    const datos = await almacen.abrirSerie("s");
    await fs.cambiarDesdeFuera("/d/s/serie.md", (await fs.leer("/d/s/serie.md")).replace("titulo: S", "titulo: De Obsidian"));
    await expect(almacen.guardar("s", { ...datos.serie, titulo: "De Atelier" })).rejects.toBeInstanceOf(CambioFuera);
    expect(await fs.leer("/d/s/serie.md")).toContain("titulo: De Obsidian");
  });

  it("una nota borrada fuera no se resucita", async () => {
    const ev = crearPieza("evento", { id: "ev-1", titulo: "Uno" });
    await almacen.guardar("s", ev);
    await fs.borrar("/d/s/eventos/ev-1.md");
    await expect(almacen.guardar("s", { ...ev, titulo: "Dos" })).rejects.toBeInstanceOf(CambioFuera);
    expect(await fs.existe("/d/s/eventos/ev-1.md")).toBe(false);
  });

  it("lo releído pasa a ser lo conocido: después sí se escribe", async () => {
    await almacen.abrirSerie("s");
    await fs.cambiarDesdeFuera("/d/s/serie.md", (await fs.leer("/d/s/serie.md")).replace("titulo: S", "titulo: Fuera"));
    const releida = (await almacen.leerPiezaEn("/d/s/serie.md", "serie")) as Serie;
    await almacen.guardar("s", { ...releida, titulo: "Luego" });
    expect(await fs.leer("/d/s/serie.md")).toContain("titulo: Luego");
  });

  it("tras mandarla a la papelera, volver a crearla vale (deshacer)", async () => {
    const ev = crearPieza("evento", { id: "ev-1", titulo: "Uno" });
    await almacen.guardar("s", ev);
    await almacen.borrar("s", ev);
    await almacen.guardar("s", ev);
    expect(await fs.existe("/d/s/eventos/ev-1.md")).toBe(true);
  });
});

describe("el guardado automático con una nota cambiada fuera", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("no lo reintenta, lo dice y pide releerla", async () => {
    const fs = new FsMemoria();
    const almacen = new Almacen(fs, "/d");
    await almacen.crearSerie("s", { titulo: "S" });
    const datos = await almacen.abrirSerie("s");
    const pisadas: string[] = [];
    const g = new Guardado(almacen, "s", 500, undefined, (rutas) => pisadas.push(...rutas));
    await fs.cambiarDesdeFuera("/d/s/serie.md", (await fs.leer("/d/s/serie.md")).replace("titulo: S", "titulo: Fuera"));
    g.pedir({ ...datos.serie, titulo: "Dentro" });
    await vi.advanceTimersByTimeAsync(600);
    expect(g.aviso).toMatch(/cambió fuera de Atelier/);
    expect(g.pendiente).toBe(false);
    expect(pisadas).toEqual(["/d/s/serie.md"]);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await fs.leer("/d/s/serie.md")).toContain("titulo: Fuera");
  });
});

describe("la sesión con una nota cambiada fuera", () => {
  let abiertas: Sesion[] = [];
  afterEach(async () => {
    for (const s of abiertas) await s.cerrar();
    abiertas = [];
  });

  async function abrir() {
    const fs = await vaultDePrueba();
    const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
    abiertas.push(s);
    return { fs, s, serie: `${APPDATOS}/_prueba/serie.md` };
  }

  it("crear una temporada con serie.md cambiada fuera no la pisa, avisa y se queda lo de fuera", async () => {
    const { fs, s, serie } = await abrir();
    const fuera = (await fs.leer(serie)).replace(/^titulo: .*$/m, "titulo: Cambiada en Obsidian");
    await fs.cambiarDesdeFuera(serie, fuera);
    await s.aplicar(crearTemporada(s.modelo).cambio);
    await s.guardado.vaciar();
    expect(await fs.leer(serie)).toBe(fuera);
    expect([s.guardado.aviso, ...s.avisosCambio].join(" ")).toMatch(/cambió fuera de Atelier/);
    await vi.waitFor(() => expect(s.modelo.serie.titulo).toBe("Cambiada en Obsidian"));
  });

  it("insertar un episodio con la temporada cambiada fuera no la pisa", async () => {
    const { fs, s } = await abrir();
    const ruta = s.almacen.rutaPieza(s.carpeta, { tipo: "temporada", id: "te-t001" });
    const fuera = (await fs.leer(ruta)).replace(/^titulo: .*$/m, "titulo: Otra");
    await fs.cambiarDesdeFuera(ruta, fuera);
    await s.aplicar(insertarEpisodio(s.modelo, "te-t001", 0).cambio);
    await s.guardado.vaciar();
    expect(await fs.leer(ruta)).toBe(fuera);
  });

  it("si lo de fuera llega antes de guardar lo propio, se queda lo de fuera y se avisa", async () => {
    const { fs, s, serie } = await abrir();
    const { cambio } = crearTemporada(s.modelo);
    await s.aplicar(cambio);
    const fuera = (await fs.leer(serie)).replace(/^titulo: .*$/m, "titulo: Fuera antes");
    await fs.cambiarDesdeFuera(serie, fuera);
    await s.releer([serie]);
    await s.guardado.vaciar();
    expect(await fs.leer(serie)).toBe(fuera);
    expect(s.guardado.aviso).toMatch(/cambió fuera de Atelier/);
  });
});

describe("arreglos de la revisión del código (T15)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  async function preparar() {
    const fs = new FsMemoria();
    const almacen = new Almacen(fs, "/d");
    await almacen.crearSerie("s", { titulo: "S" });
    const datos = await almacen.abrirSerie("s");
    const fuera = async () => fs.cambiarDesdeFuera("/d/s/serie.md", (await fs.leer("/d/s/serie.md")).replace("titulo: S", "titulo: Fuera"));
    return { fs, almacen, serie: datos.serie, fuera };
  }

  it("reintento tras un fallo con la nota soltada mientras se escribía: no la pisa", async () => {
    const { fs, almacen, serie } = await preparar();
    const g = new Guardado(almacen, "s");
    let primera = true;
    fs.fallo = (op, ruta) => {
      if (op !== "escribir" || !ruta.endsWith("serie.md.tmp") || !primera) return null;
      primera = false;
      // Mientras se escribe llega lo de fuera y la vigilancia lo suelta
      void fs.cambiarDesdeFuera("/d/s/serie.md", "---\nid: se-x\ntipo: serie\ntitulo: Fuera\n---\n");
      g.soltar(serie.id, "cambió fuera");
      return "entero";
    };
    g.pedir({ ...serie, titulo: "Dentro" });
    await vi.advanceTimersByTimeAsync(600);
    fs.fallo = null;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await fs.leer("/d/s/serie.md")).toContain("titulo: Fuera");
  });

  it("lo releído no cuela una edición vieja: se compara con la nota de cuando se editó", async () => {
    const { fs, almacen, serie, fuera } = await preparar();
    const g = new Guardado(almacen, "s");
    g.pedir({ ...serie, titulo: "Dentro" });
    await fuera();
    await almacen.leerPiezaEn("/d/s/serie.md", "serie"); // la vigilancia la relee, pero aún no ha soltado nada
    await vi.advanceTimersByTimeAsync(600);
    expect(await fs.leer("/d/s/serie.md")).toContain("titulo: Fuera");
    expect(g.aviso).toMatch(/cambió fuera de Atelier/);
  });

  it("el aviso no se pierde al seguir escribiendo en otra pieza; se va al cerrarlo", async () => {
    const { almacen, serie, fuera } = await preparar();
    const g = new Guardado(almacen, "s");
    g.pedir({ ...serie, titulo: "Dentro" });
    await fuera();
    await vi.advanceTimersByTimeAsync(600);
    expect(g.aviso).toMatch(/cambió fuera de Atelier/);
    g.pedir(crearPieza("evento", { id: "ev-otro", titulo: "Otra cosa" }));
    await vi.advanceTimersByTimeAsync(600);
    expect(g.aviso).toMatch(/cambió fuera de Atelier/);
    g.quitarAviso();
    expect(g.aviso).toBeNull();
  });

  it("una edición mientras se escribe la misma pieza no se toma por un cambio de fuera", async () => {
    const { fs, almacen, serie } = await preparar();
    const g = new Guardado(almacen, "s");
    fs.alOperar = (op, ruta) => {
      if (op === "escribir" && ruta.endsWith("serie.md.tmp") && !fs.alOperar!.name) g.pedir({ ...serie, titulo: "Dos" });
    };
    g.pedir({ ...serie, titulo: "Uno" });
    await vi.advanceTimersByTimeAsync(600);
    fs.alOperar = null;
    await vi.advanceTimersByTimeAsync(2000);
    expect(g.aviso).toBeNull();
    expect(await fs.leer("/d/s/serie.md")).toContain("titulo: Dos");
  });

  it("borrar una pieza mientras se escribe su lote no la resucita", async () => {
    const { fs, almacen } = await preparar();
    const g = new Guardado(almacen, "s");
    const a = crearPieza("evento", { id: "ev-a", titulo: "A" });
    const b = crearPieza("evento", { id: "ev-b", titulo: "B" });
    fs.alOperar = (op, ruta) => {
      if (op === "escribir" && ruta.includes("ev-a")) g.olvidar("ev-b");
    };
    g.pedir(a);
    g.pedir(b);
    await vi.advanceTimersByTimeAsync(600);
    expect(await fs.existe("/d/s/eventos/ev-b.md")).toBe(false);
  });
});

describe("la sesión tras los arreglos de la revisión (T15)", () => {
  let abiertas: Sesion[] = [];
  afterEach(async () => {
    for (const s of abiertas) await s.cerrar();
    abiertas = [];
  });

  async function abrir() {
    const fs = await vaultDePrueba();
    const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
    abiertas.push(s);
    const serie = `${APPDATOS}/_prueba/serie.md`;
    const fuera = async (titulo = "Fuera") => {
      const t = (await fs.leer(serie)).replace(/^titulo: .*$/m, `titulo: ${titulo}`);
      await fs.cambiarDesdeFuera(serie, t);
      return t;
    };
    return { fs, s, serie, fuera };
  }

  it("crear una temporada con serie.md cambiada fuera no crea nada ni deja nada a medias", async () => {
    const { fs, s, serie, fuera } = await abrir();
    const texto = await fuera();
    const n = s.modelo.temporadas.size;
    const { pieza, cambio } = crearTemporada(s.modelo);
    expect(await s.aplicar(cambio)).toBe(false);
    await s.guardado.vaciar();
    expect(s.modelo.temporadas.size).toBe(n);
    expect(await fs.existe(s.almacen.rutaPieza(s.carpeta, pieza))).toBe(false);
    expect(await fs.leer(serie)).toBe(texto);
    expect(s.avisosCambio.join(" ")).toMatch(/cambió fuera de Atelier/);
    await vi.waitFor(() => expect(s.modelo.serie.titulo).toBe("Fuera"));
  });

  it("relee a la fuerza aunque la nota de fuera coincida con una escritura propia anterior", async () => {
    const { fs, s } = await abrir();
    const ruta = s.almacen.rutaPieza(s.carpeta, { tipo: "evento", id: "ev-e006" });
    s.editar("ev-e006", (p) => ((p as { titulo: string }).titulo = "A"));
    await s.guardado.vaciar();
    const a = await fs.leer(ruta);
    s.editar("ev-e006", (p) => ((p as { titulo: string }).titulo = "B"));
    await s.guardado.vaciar();
    await fs.cambiarDesdeFuera(ruta, a); // el otro equipo trae la versión A
    s.editar("ev-e006", (p) => ((p as { titulo: string }).titulo = "C"));
    await s.guardado.vaciar();
    expect(await fs.leer(ruta)).toBe(a);
    await vi.waitFor(() => expect(s.modelo.eventos.get("ev-e006")?.titulo).toBe("A"));
  });

  it("tras un borrado de fuera, la nota se puede volver a crear sin quedarse atascada", async () => {
    const { fs, s } = await abrir();
    const ruta = s.almacen.rutaPieza(s.carpeta, { tipo: "evento", id: "ev-e006" });
    const vieja = structuredClone(s.modelo.eventos.get("ev-e006")!);
    await fs.borrar(ruta);
    await s.releer([ruta]);
    expect(s.modelo.eventos.has("ev-e006")).toBe(false);
    await s.aplicar({ guardar: [vieja], borrar: [] });
    await s.guardado.vaciar();
    expect(await fs.existe(ruta)).toBe(true);
    expect(s.guardado.aviso).toBeNull();
  });

  it("Ctrl Z no restaura lo que cambió después fuera de Atelier", async () => {
    const { fs, s, serie, fuera } = await abrir();
    s.editar(s.modelo.serie.id, (p) => ((p as { premisa: string }).premisa = "Mía"));
    await s.guardado.vaciar();
    const texto = await fuera("De Obsidian");
    await s.releer([serie]);
    expect(s.modelo.serie.titulo).toBe("De Obsidian");
    await s.deshacer();
    await s.guardado.vaciar();
    expect(await fs.leer(serie)).toBe(texto);
    expect(s.modelo.serie.titulo).toBe("De Obsidian");
    expect(s.avisosCambio.join(" ")).toMatch(/cambió después/);
  });
});

describe("mover escenas con notas cambiadas fuera (spec 003, RNF integridad)", () => {
  let abiertas: Sesion[] = [];
  afterEach(async () => {
    for (const s of abiertas) await s.cerrar();
    abiertas = [];
  });

  const EP = "ep-a101";
  async function abrir() {
    const fs = await vaultDePrueba();
    const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
    abiertas.push(s);
    const ruta = (id: string) => s.almacen.rutaPieza(s.carpeta, { tipo: "evento", id });
    const fuera = async (id: string) => {
      const t = (await fs.leer(ruta(id))).replace(/^titulo: .*$/m, "titulo: Cambiada en Obsidian");
      await fs.cambiarDesdeFuera(ruta(id), t);
      return t;
    };
    return { fs, s, ruta, fuera };
  }
  const orden = (s: Sesion, id: string) => s.modelo.eventos.get(id)!.orden;

  it("una de las notas cambiada fuera: no se mueve nada, se avisa y se relee", async () => {
    const { fs, s, ruta, fuera } = await abrir();
    const antes = [orden(s, "ev-e001"), orden(s, "ev-e002")];
    const texto2 = await fs.leer(ruta("ev-e002"));
    const texto1 = await fuera("ev-e001");
    expect(await s.aplicar(moverEvento(s.modelo, "ev-e002", EP, 0))).toBe(false);
    expect([orden(s, "ev-e001"), orden(s, "ev-e002")]).toEqual(antes);
    expect(s.avisosCambio.join(" ")).toMatch(/cambió fuera de Atelier: no se ha movido nada/);
    await s.guardado.vaciar();
    expect(await fs.leer(ruta("ev-e001"))).toBe(texto1);
    expect(await fs.leer(ruta("ev-e002"))).toBe(texto2);
    await vi.waitFor(() => expect(s.modelo.eventos.get("ev-e001")?.titulo).toBe("Cambiada en Obsidian"));
    expect(s.historial.puedeDeshacer).toBe(false);
  });

  it("un movimiento mientras se escribe el anterior no da cambió fuera", async () => {
    const { fs, s, ruta } = await abrir();
    s.editar<Evento>("ev-e002", (e) => (e.titulo = "Retocada"));
    const escribiendo = s.guardado.vaciar();
    expect(await s.aplicar(moverEvento(s.modelo, "ev-e002", EP, 0))).toBe(true);
    await escribiendo;
    await s.guardado.vaciar();
    expect(s.avisosCambio).toEqual([]);
    expect(s.guardado.aviso).toBeNull();
    const texto = await fs.leer(ruta("ev-e002"));
    expect(texto).toContain("titulo: Retocada");
    expect(texto).toMatch(/^orden: 1$/m);
  });

  it("al acabar de mover, se escribe sin esperar el medio segundo", async () => {
    const { fs, s, ruta } = await abrir();
    expect(await s.aplicar(moverEvento(s.modelo, "ev-e002", EP, 0))).toBe(true);
    expect(s.guardado.pendiente).toBe(false);
    expect(await fs.leer(ruta("ev-e002"))).toMatch(/^orden: 1$/m);
  });

  it("nota cambiada entre la comprobación y la escritura: aviso, relectura y el resto escrito", async () => {
    const { fs, s, ruta, fuera } = await abrir();
    const comprobar = s.almacen.cambiadasFuera.bind(s.almacen);
    let texto1 = "";
    vi.spyOn(s.almacen, "cambiadasFuera").mockImplementation(async (...a) => {
      const r = await comprobar(...a);
      texto1 = await fuera("ev-e001");
      return r;
    });
    expect(await s.aplicar(moverEvento(s.modelo, "ev-e002", EP, 0))).toBe(true);
    await s.guardado.vaciar();
    expect(await fs.leer(ruta("ev-e001"))).toBe(texto1);
    expect(await fs.leer(ruta("ev-e002"))).toMatch(/^orden: 1$/m);
    expect(s.guardado.aviso).toMatch(/cambió fuera de Atelier/);
    await vi.waitFor(() => expect(s.modelo.eventos.get("ev-e001")?.titulo).toBe("Cambiada en Obsidian"));
  });

  it("borrar un episodio y crear siguen como antes", async () => {
    const { s } = await abrir();
    const comprobar = vi.spyOn(s.almacen, "cambiadasFuera");
    expect(await s.aplicar(borrarPieza(s.modelo, "ep-a103"))).toBe(true);
    expect(s.modelo.episodios.has("ep-a103")).toBe(false);
    expect(comprobar).not.toHaveBeenCalled();
    expect(await s.aplicar(crearEvento(s.modelo, { titulo: "Nueva", temporada: "te-t001", episodio: EP }).cambio)).toBe(true);
    expect(await s.aplicar(crearTemporada(s.modelo).cambio)).toBe(true);
    expect(comprobar).toHaveBeenCalledTimes(1);
  });
});
