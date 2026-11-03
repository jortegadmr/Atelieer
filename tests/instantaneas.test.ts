import { beforeEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Instantaneas } from "../src/lib/almacen/instantaneas";
import { crearPieza } from "../src/lib/modelo/ficheros";

const RAIZ = "/d";
const SERIE = `${RAIZ}/s`;
let fs: FsMemoria;
let almacen: Almacen;
let inst: Instantaneas;
let hora: Date;

/** Todos los ficheros de la serie que no son de la propia instantánea, con su contenido */
async function estado(): Promise<Record<string, string>> {
  const r: Record<string, string> = {};
  for (const ruta of fs.rutas()) {
    if (!ruta.startsWith(SERIE + "/") || ruta.includes("/_instantaneas/") || ruta.includes("/_papelera/")) continue;
    r[ruta] = await fs.leer(ruta);
  }
  return r;
}

beforeEach(async () => {
  fs = new FsMemoria();
  almacen = new Almacen(fs, RAIZ);
  await almacen.crearSerie("s", { titulo: "S" });
  await almacen.guardar("s", crearPieza("arco", { id: "ar-1", titulo: "La cinta oculta" }));
  await almacen.guardar("s", crearPieza("evento", { id: "ev-1", titulo: "Uno", arcos: [{ arco: "ar-1", papel: "abre" }] }));
  hora = new Date(2026, 9, 19, 18, 20, 0);
  inst = new Instantaneas(almacen, "s", () => hora);
});

describe("instantáneas (spec 7, T7.5)", () => {
  it("una automática y una nombrada, con la fecha en el nombre", async () => {
    await inst.crear();
    hora = new Date(2026, 9, 19, 18, 25, 0);
    await inst.crear("antes de apagar la torre");
    const l = await inst.listar();
    expect(l.map((x) => x.nombre)).toEqual(["2026-10-19 18-25 - antes de apagar la torre.zip", "2026-10-19 18-20 auto.zip"]);
    expect(l.map((x) => x.auto)).toEqual([false, true]);
    expect(l[0].titulo).toBe("antes de apagar la torre");
  });

  it("no se pisan dos en el mismo minuto", async () => {
    await inst.crear();
    await inst.crear();
    expect((await inst.listar()).length).toBe(2);
  });

  it("se guardan las 20 últimas automáticas y todas las nombradas", async () => {
    await inst.crear("nombrada");
    for (let i = 0; i < 23; i++) {
      hora = new Date(2026, 9, 20, 10, i, 0);
      await inst.crear();
    }
    const l = await inst.listar();
    expect(l.filter((x) => x.auto)).toHaveLength(20);
    expect(l.filter((x) => !x.auto).map((x) => x.titulo)).toEqual(["nombrada"]);
    expect(l.filter((x) => x.auto).at(-1)!.nombre).toBe("2026-10-20 10-03 auto.zip");
  });

  it("restaurar deja la serie exactamente como estaba", async () => {
    const antes = await estado();
    await inst.crear("antes de borrar la cinta");
    // Cambios después: se borra el arco, se edita el evento y se crea otro
    await almacen.borrar("s", crearPieza("arco", { id: "ar-1" }));
    await almacen.guardar("s", crearPieza("evento", { id: "ev-1", titulo: "Cambiado" }));
    await almacen.guardar("s", crearPieza("evento", { id: "ev-2", titulo: "Nuevo" }));
    hora = new Date(2026, 9, 19, 19, 0, 0);
    await inst.restaurar("2026-10-19 18-20 - antes de borrar la cinta.zip");
    expect(await estado()).toEqual(antes);
  });

  it("restaurar hace antes una automática, y lo que no estaba en la copia va a la papelera", async () => {
    await inst.crear("base");
    await almacen.guardar("s", crearPieza("evento", { id: "ev-2", titulo: "Nuevo" }));
    hora = new Date(2026, 9, 19, 19, 0, 0);
    await inst.restaurar("2026-10-19 18-20 - base.zip");
    const l = await inst.listar();
    expect(l.some((x) => x.nombre === "2026-10-19 19-00 auto.zip")).toBe(true);
    expect(await fs.existe(`${SERIE}/eventos/ev-2.md`)).toBe(false);
    const papelera = await fs.listar(`${SERIE}/_papelera`);
    expect(papelera.map((e) => e.nombre)).toEqual(["2026-10-19 19-00-00 ev-2.md"]);
  });

  it("no guarda en la copia ni la papelera, ni las instantáneas, ni .abierta, ni los conflictos", async () => {
    await fs.escribir(`${SERIE}/.abierta`, "equipo: PC");
    await fs.escribir(`${SERIE}/_papelera/x.md`, "x");
    await fs.escribir(`${SERIE}/eventos/ev-1 (# Edit conflict 2026-10-15 abc #).md`, "x");
    await inst.crear("limpia");
    const contenido = await inst.contenido("2026-10-19 18-20 - limpia.zip");
    expect(contenido.sort()).toEqual(["arcos/ar-1.md", "eventos/ev-1.md", "serie.md"]);
  });
});
