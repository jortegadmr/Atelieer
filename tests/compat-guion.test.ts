// La v1.0 y los guiones de la v2 (spec 013, RNF-2): con el código congelado de
// la v1.0, la serie se ve igual con _guion/ que sin ella, y ni sus instantáneas
// ni su papelera la tocan. Y la v1.0 puede restaurar una copia de la v2 que
// lleva guiones dentro sin romper ni mover nada.

import { beforeEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { AlmacenGuion } from "../src/lib/almacen/almacen-guion";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Instantaneas } from "../src/lib/almacen/instantaneas";
import { vacio } from "../src/lib/guion/tipos";
import { crearPieza } from "../src/lib/modelo/ficheros";
import { Almacen as AlmacenV1 } from "./compat/v1/almacen";
import { Instantaneas as InstantaneasV1 } from "./compat/v1/instantaneas";

const RAIZ = "/appDatos";
const SERIE = `${RAIZ}/s`;
const NOTA = `${SERIE}/_guion/ev-aaaa.md`;
let fs: FsMemoria;
let v2: Almacen;
let guion: AlmacenGuion;

beforeEach(async () => {
  fs = new FsMemoria();
  v2 = new Almacen(fs, RAIZ);
  await v2.crearSerie("s", { titulo: "S" });
  await v2.guardar("s", crearPieza("evento", { id: "ev-aaaa", titulo: "Uno" }));
  guion = new AlmacenGuion(v2, "s");
  await guion.cargar("ev-aaaa");
});

const escribir = (texto: string) => ({ ...vacio("ev-aaaa"), texto });

async function conGuion(): Promise<string> {
  await guion.guardar("ev-aaaa", escribir("INT. TALLER – NOCHE\n\nCARMELA\nHola, [[Hugo]] \u202e y ---"));
  await guion.copiaAPapelera("ev-aaaa", escribir("uno viejo"));
  return fs.leer(NOTA);
}

const resumen = (d: Awaited<ReturnType<AlmacenV1["abrirSerie"]>>) => JSON.stringify({ ...d, problemas: d.problemas, conflictos: d.conflictos });

describe("la v1.0 no ve ni toca _guion/ (spec 013, RNF-2)", () => {
  it("abre la serie igual con guiones y su papelera que sin ellos, sin problemas ni avisos", async () => {
    const v1 = new AlmacenV1(fs, RAIZ);
    const sin = resumen(await v1.abrirSerie("s"));
    await conGuion();
    const con = await v1.abrirSerie("s");
    expect(resumen(con)).toBe(sin);
    expect(con.eventos.map((e) => e.titulo)).toEqual(["Uno"]);
    expect(con.problemas).toEqual([]);
    expect((await v1.listarSeries()).map((s) => [s.carpeta, s.problema])).toEqual([["s", undefined]]);
  });

  it("sin guiones, la serie es la de siempre: no se crea nada", async () => {
    const antes = fs.rutas();
    await new AlmacenV1(fs, RAIZ).abrirSerie("s");
    await guion.cargar("ev-aaaa");
    expect(fs.rutas()).toEqual(antes);
  });

  it("guardar y borrar piezas con la v1.0 no tocan el guion ni su papelera", async () => {
    const nota = await conGuion();
    const copias = fs.rutas().filter((r) => r.includes("/_papelera/_guion/"));
    const v1 = new AlmacenV1(fs, RAIZ);
    await v1.guardar("s", crearPieza("evento", { id: "ev-aaaa", titulo: "Editado por la v1.0" }));
    await v1.borrar("s", crearPieza("evento", { id: "ev-aaaa" }));
    expect(await fs.leer(NOTA)).toBe(nota);
    expect(fs.rutas().filter((r) => r.includes("/_papelera/_guion/"))).toEqual(copias);
  });

  it("sus instantáneas no incluyen guiones y restaurar no los toca ni los manda a la papelera", async () => {
    const nota = await conGuion();
    const inst = new InstantaneasV1(new AlmacenV1(fs, RAIZ), "s");
    const copia = await inst.crear("antes");
    expect((await inst.contenido(copia.nombre)).some((r) => r.includes("_guion"))).toBe(false);
    await inst.restaurar(copia.nombre);
    expect(await fs.leer(NOTA)).toBe(nota);
    expect(fs.rutas().filter((r) => r.includes("/_papelera/") && !r.includes("/_guion/"))).toEqual([]);
  });

  it("la v1.0 restaura una copia de la v2 con guiones dentro sin romper ni mover nada", async () => {
    const buena = await conGuion();
    const inst2 = new Instantaneas(v2, "s");
    const copia = await inst2.crear("de la v2");
    expect(await inst2.contenido(copia.nombre)).toContain("_guion/ev-aaaa.md");

    await guion.guardar("ev-aaaa", escribir("cambiado después"));
    const v1 = new AlmacenV1(fs, RAIZ);
    await new InstantaneasV1(v1, "s").restaurar(copia.nombre);

    expect(await fs.leer(NOTA)).toBe(buena);
    expect(fs.rutas().filter((r) => r.includes("/_papelera/") && !r.includes("/_guion/"))).toEqual([]);
    const d = await v1.abrirSerie("s");
    expect(d.problemas).toEqual([]);
    expect(d.eventos.map((e) => e.titulo)).toEqual(["Uno"]);
    // Y la v2 lo sigue leyendo
    const c = await new AlmacenGuion(v2, "s").cargar("ev-aaaa");
    expect(c.avisos).toEqual([]);
    expect(c.guion.texto).toContain("CARMELA");
  });

  it("restaurar una copia vieja sin guiones en la v2 no se lleva el guion a la papelera", async () => {
    const inst = new Instantaneas(v2, "s");
    const vieja = await inst.crear("sin guion");
    const nota = await conGuion();
    await inst.restaurar(vieja.nombre);
    expect(await fs.leer(NOTA)).toBe(nota);
  });
});
