import { beforeEach, describe, expect, it } from "vitest";
import { Almacen, CambioFuera, ErrorVueltaAtras } from "../../src/lib/almacen/almacen";
import { FsMemoria } from "../../src/lib/almacen/fs-memoria";
import { crearPieza, escribirPieza } from "../../src/lib/modelo/ficheros";
import { Modelo } from "../../src/lib/modelo/modelo";
import type { Pieza } from "../../src/lib/modelo/tipos";
import { comprobarPasar } from "../../src/lib/wiki/pasar";
import { APPDATOS, VAULT, vaultDePrueba } from "../fixtures/wiki";

const RAIZ = "/appDatos";
const ruta = (id: string) => `${RAIZ}/s/eventos/${id}.md`;
let fs: FsMemoria;
let almacen: Almacen;
const uno = crearPieza("evento", { id: "ev-uno1", titulo: "Uno" });
const dos = crearPieza("evento", { id: "ev-dos2", titulo: "Dos" });
const tres = crearPieza("evento", { id: "ev-tres", titulo: "Tres" });

beforeEach(async () => {
  fs = new FsMemoria();
  almacen = new Almacen(fs, RAIZ);
  await almacen.crearSerie("s", { titulo: "S" });
  for (const p of [uno, dos, tres]) await almacen.guardar("s", p);
});

async function papelera(): Promise<string[]> {
  return (await fs.existe(`${RAIZ}/s/_papelera`)) ? (await fs.listar(`${RAIZ}/s/_papelera`)).map((e) => e.nombre) : [];
}

describe("escribir todo o nada (spec 006, RF-37)", () => {
  it("escribe lo que cambia, crea lo nuevo y manda a la papelera lo que sale", async () => {
    const nueva = crearPieza("evento", { id: "ev-nuev", titulo: "Nueva" });
    const r = await almacen.escribirTodo("s", [{ ...uno, titulo: "Uno cambiado" } as Pieza, nueva], [tres]);
    expect(await fs.leer(ruta(uno.id))).toContain("Uno cambiado");
    expect(await fs.leer(ruta(nueva.id))).toBe(escribirPieza(nueva));
    expect(await fs.existe(ruta(tres.id))).toBe(false);
    expect(r.papelera.get(tres.id)).toMatch(/_papelera\/.* ev-tres\.md$/);
  });

  it("si algo falla a medias, lo escrito vuelve, lo nuevo va a la papelera y lo de la papelera vuelve a su sitio", async () => {
    const antesUno = await fs.leer(ruta(uno.id));
    const antesTres = await fs.leer(ruta(tres.id));
    const nueva = crearPieza("evento", { id: "ev-nuev", titulo: "Nueva" });
    // Falla al mandar a la papelera la segunda: lo demás ya estaba hecho
    fs.fallo = (op, r) => (op === "renombrar" && r === ruta(dos.id) ? "entero" : null);
    await expect(almacen.escribirTodo("s", [{ ...uno, titulo: "Uno cambiado" } as Pieza, nueva], [tres, dos])).rejects.toThrow(/Fallo simulado/);
    fs.fallo = null;
    expect(await fs.leer(ruta(uno.id))).toBe(antesUno);
    expect(await fs.existe(ruta(nueva.id))).toBe(false);
    expect(await fs.leer(ruta(tres.id))).toBe(antesTres);
    expect(await fs.existe(ruta(dos.id))).toBe(true);
    // Lo nuevo no se borra: va a la papelera
    expect((await papelera()).some((n) => n.endsWith(" ev-nuev.md"))).toBe(true);
  });

  it("el texto de antes es el del disco al empezar, no el que conocía la app", async () => {
    const fuera = escribirPieza({ ...uno, titulo: "Cambiado fuera antes" } as Pieza);
    await fs.cambiarDesdeFuera(ruta(uno.id), fuera);
    fs.fallo = (op, r) => (op === "escribir" && r.startsWith(ruta(dos.id)) ? "entero" : null);
    await expect(almacen.escribirTodo("s", [{ ...uno, titulo: "Mío" } as Pieza, { ...dos, titulo: "Mío" } as Pieza], [])).rejects.toThrow();
    fs.fallo = null;
    expect(await fs.leer(ruta(uno.id))).toBe(fuera);
  });

  it("si una nota cambia fuera mientras se escribe, no se pisa y todo vuelve", async () => {
    const antesUno = await fs.leer(ruta(uno.id));
    const otra = escribirPieza({ ...dos, titulo: "Cambiada fuera a la vez" } as Pieza);
    let hecho = false;
    fs.alOperar = (op, r) => {
      if (!hecho && op === "renombrar" && r.startsWith(ruta(uno.id))) {
        hecho = true;
        void fs.cambiarDesdeFuera(ruta(dos.id), otra);
      }
    };
    await expect(almacen.escribirTodo("s", [{ ...uno, titulo: "Mío" } as Pieza, { ...dos, titulo: "Mío" } as Pieza], [])).rejects.toBeInstanceOf(CambioFuera);
    fs.alOperar = null;
    expect(await fs.leer(ruta(uno.id))).toBe(antesUno);
    expect(await fs.leer(ruta(dos.id))).toBe(otra);
  });

  it("una pieza con un id que saldría de la serie no se escribe ni se mueve nada", async () => {
    const mala = { ...uno, id: "ev-../../fuera" } as Pieza;
    await expect(almacen.escribirTodo("s", [{ ...dos, titulo: "Mío" } as Pieza, mala], [])).rejects.toThrow(/no es una pieza de esta serie/);
    expect(await fs.leer(ruta(dos.id))).toContain("titulo: Dos");
    expect(await fs.existe(`${RAIZ}/fuera.md`)).toBe(false);
  });

  it("si la vuelta atrás también falla, lo dice", async () => {
    fs.fallo = (op, r) => (op === "renombrar" && r.startsWith(`${ruta(dos.id)}.tmp`) ? "entero" : op === "renombrar" && r.startsWith(`${ruta(uno.id)}.tmp`) && hechoUno++ > 0 ? "entero" : null);
    let hechoUno = 0;
    await expect(almacen.escribirTodo("s", [{ ...uno, titulo: "Mío" } as Pieza, { ...dos, titulo: "Mío" } as Pieza], [])).rejects.toBeInstanceOf(ErrorVueltaAtras);
    fs.fallo = null;
  });
});

describe("comprobar si se puede pasar a la wiki, sin escribir (spec 006, RF-34b)", () => {
  it("nombre repetido en el vault: lo dice y no crea nada", async () => {
    const fsw = await vaultDePrueba();
    const m = new Modelo(await new Almacen(fsw, APPDATOS).abrirSerie("_prueba"));
    await fsw.escribir(`${VAULT}/OtraSerie/01_Wiki/01_Narrativa/Arcos/El eco.md`, "de otra serie");
    const r = await comprobarPasar(fsw, VAULT, m, "ar-ecos", {});
    expect(r).toMatchObject({ estado: "nombre repetido", repetidas: ["OtraSerie/01_Wiki/01_Narrativa/Arcos/El eco.md"] });
    expect(await fsw.existe(`${VAULT}/appDatos/_prueba/_wiki/01_Narrativa/Arcos/El eco.md`)).toBe(false);
    expect((await comprobarPasar(fsw, VAULT, m, "ar-ecos", { nombre: "El eco (Cabo Sal)" })).estado).toBe("se puede");
  });

  it("un nombre que no vale para un fichero se dice antes de escribir", async () => {
    const fsw = await vaultDePrueba();
    const m = new Modelo(await new Almacen(fsw, APPDATOS).abrirSerie("_prueba"));
    await expect(comprobarPasar(fsw, VAULT, m, "ar-ecos", { nombre: "a/b" })).rejects.toThrow(/no vale para un fichero/);
  });
});
