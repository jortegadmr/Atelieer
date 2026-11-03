import { beforeEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { AlmacenPizarra } from "../src/lib/almacen/almacen-pizarra";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Instantaneas } from "../src/lib/almacen/instantaneas";
import { crearPieza } from "../src/lib/modelo/ficheros";
import { crearNota, editarNota } from "../src/lib/pizarra/operaciones";
import { vacia, type Pizarra } from "../src/lib/pizarra/tipos";

const RAIZ = "/d";
const SERIE = `${RAIZ}/s`;
const RUTA = `${SERIE}/_pizarra/pizarra.md`;
let fs: FsMemoria;
let almacen: Almacen;
let inst: Instantaneas;
let pizarra: AlmacenPizarra;
let hora: Date;

function conTexto(texto: string): Pizarra {
  const r = crearNota(vacia(), { x: 1, y: 2 }, "pz-a");
  if ("error" in r) throw new Error(r.error);
  return editarNota(r.pizarra, "pz-a", texto).pizarra;
}

beforeEach(async () => {
  fs = new FsMemoria();
  almacen = new Almacen(fs, RAIZ);
  almacen.reloj = () => hora;
  await almacen.crearSerie("s", { titulo: "S" });
  await almacen.guardar("s", crearPieza("arco", { id: "ar-1", titulo: "La cinta oculta" }));
  hora = new Date(2026, 9, 29, 12, 0, 0);
  inst = new Instantaneas(almacen, "s", () => hora);
  pizarra = new AlmacenPizarra(almacen, "s");
  await pizarra.cargar();
});

describe("instantáneas y pizarra (spec 012, T5b)", () => {
  it("la instantánea lleva la pizarra y restaurar la devuelve", async () => {
    await pizarra.guardar(conTexto("la de la copia"));
    const buena = await fs.leer(RUTA);
    const i = await inst.crear("antes");
    expect(await inst.contenido(i.nombre)).toContain("_pizarra/pizarra.md");

    await pizarra.guardar(conTexto("cambiada después"));
    expect(await fs.leer(RUTA)).not.toBe(buena);
    hora = new Date(2026, 9, 29, 12, 5, 0);
    await inst.restaurar(i.nombre);
    expect(await fs.leer(RUTA)).toBe(buena);
  });

  it("restaurar hace antes una automática que ya lleva la pizarra de ahora", async () => {
    const i = await inst.crear("sin pizarra");
    await pizarra.guardar(conTexto("la de ahora"));
    const deAhora = await fs.leer(RUTA);
    hora = new Date(2026, 9, 29, 12, 5, 0);
    await inst.restaurar(i.nombre);
    const auto = (await inst.listar()).find((x) => x.auto && x.fecha === "2026-10-29 12-05")!;
    expect(await inst.contenido(auto.nombre)).toContain("_pizarra/pizarra.md");
    // Y esa copia se puede volver a restaurar para recuperar la pizarra
    hora = new Date(2026, 9, 29, 12, 10, 0);
    await inst.restaurar(auto.nombre);
    expect(await fs.leer(RUTA)).toBe(deAhora);
  });

  it("restaurar una copia sin pizarra no toca la actual ni la manda a la papelera", async () => {
    const i = await inst.crear("de antes de la pizarra");
    expect(await inst.contenido(i.nombre)).not.toContain("_pizarra/pizarra.md");
    await pizarra.guardar(conTexto("la mía"));
    const mia = await fs.leer(RUTA);
    hora = new Date(2026, 9, 29, 12, 5, 0);
    await inst.restaurar(i.nombre);
    expect(await fs.leer(RUTA)).toBe(mia);
    expect(fs.rutas().filter((r) => r.includes("/_papelera/"))).toEqual([]);
  });

  it("sin pizarra, las copias son las de siempre", async () => {
    const i = await inst.crear();
    expect(await inst.contenido(i.nombre)).toEqual(["arcos/ar-1.md", "serie.md"]);
  });

  it("lo que cuelga de _papelera/ y la pizarra rota apartada no entran en la copia", async () => {
    await pizarra.guardar(conTexto("x"));
    await pizarra.copiaAPapelera(conTexto("vieja"));
    await fs.escribir(`${SERIE}/_pizarra/pizarra rota 2026-10-29 12-00-00.md`, "roto");
    const i = await inst.crear();
    expect((await inst.contenido(i.nombre)).sort()).toEqual(["_pizarra/pizarra.md", "arcos/ar-1.md", "serie.md"]);
  });
});
