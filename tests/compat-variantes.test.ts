// La v1.0 y las variantes de la v2 (spec 006, constitución 9): con el código
// congelado de la v1.0, la serie se ve igual con _variantes/ que sin ella, y ni
// sus instantáneas ni su papelera la tocan. Las de la v2, tampoco.

import { beforeEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Instantaneas } from "../src/lib/almacen/instantaneas";
import { crearPieza, escribirPieza } from "../src/lib/modelo/ficheros";
import { AlmacenVariantes } from "../src/lib/variantes/almacen-variantes";
import { escribirVariante } from "../src/lib/variantes/formato";
import { variante } from "../src/lib/variantes/tipos";
import { Almacen as AlmacenV1 } from "./compat/v1/almacen";
import { Instantaneas as InstantaneasV1 } from "./compat/v1/instantaneas";

const RAIZ = "/appDatos";
const NOTA = `${RAIZ}/s/_variantes/va-k2m9.md`;
let fs: FsMemoria;
let v2: Almacen;

beforeEach(async () => {
  fs = new FsMemoria();
  v2 = new Almacen(fs, RAIZ);
  await v2.crearSerie("s", { titulo: "S" });
  await v2.guardar("s", crearPieza("evento", { id: "ev-aaaa", titulo: "Uno" }));
});

async function conVariante() {
  const v = variante("va-k2m9", "Prueba", "2026-10-21 18:20");
  const ev = crearPieza("evento", { id: "ev-aaaa", titulo: "Uno" });
  v.piezas.set("ev-aaaa", { tipo: "evento", base: escribirPieza(ev), pieza: { ...ev, titulo: "Cambiado en la variante" } });
  v.piezas.set("ev-nuev", { tipo: "evento", base: null, pieza: crearPieza("evento", { id: "ev-nuev", titulo: "Solo en la variante" }) });
  await new AlmacenVariantes(v2, "s").guardar("va-k2m9", escribirVariante(v));
  return fs.leer(NOTA);
}

const resumen = (d: Awaited<ReturnType<AlmacenV1["abrirSerie"]>>) => JSON.stringify({ ...d, problemas: d.problemas, conflictos: d.conflictos });

describe("la v1.0 no ve ni toca _variantes/ (spec 006, RNF v1.0)", () => {
  it("abre la serie igual con variantes guardadas que sin ellas", async () => {
    const v1 = new AlmacenV1(fs, RAIZ);
    const sin = resumen(await v1.abrirSerie("s"));
    await conVariante();
    const con = await v1.abrirSerie("s");
    expect(resumen(con)).toBe(sin);
    expect(con.eventos.map((e) => e.titulo)).toEqual(["Uno"]);
    expect(con.problemas).toEqual([]);
    expect((await v1.listarSeries()).map((s) => s.carpeta)).toEqual(["s"]);
  });

  it("sus instantáneas no incluyen las variantes y restaurar no las toca", async () => {
    const nota = await conVariante();
    const inst = new InstantaneasV1(new AlmacenV1(fs, RAIZ), "s");
    const copia = await inst.crear("antes");
    expect((await inst.contenido(copia.nombre)).some((r) => r.includes("_variantes"))).toBe(false);
    await inst.restaurar(copia.nombre);
    expect(await fs.leer(NOTA)).toBe(nota);
  });

  it("su papelera no la toca", async () => {
    const nota = await conVariante();
    await new AlmacenV1(fs, RAIZ).borrar("s", crearPieza("evento", { id: "ev-aaaa" }));
    expect(await fs.leer(NOTA)).toBe(nota);
  });

  it("las instantáneas de la v2 tampoco las incluyen ni las tocan al restaurar", async () => {
    const nota = await conVariante();
    const inst = new Instantaneas(v2, "s");
    const copia = await inst.crear("antes");
    expect((await inst.contenido(copia.nombre)).some((r) => r.includes("_variantes"))).toBe(false);
    await inst.restaurar(copia.nombre);
    expect(await fs.leer(NOTA)).toBe(nota);
  });
});

// Spec 009: las copias de las fichas antes de escribirlas (_fichas/) tampoco las ve ni las toca
const COPIA = `${RAIZ}/s/_fichas/2026-10-22 10-00-00 T01 - Cerrar la emisora.md`;

async function conCopia() {
  await fs.escribir(COPIA, "---\ntipo: temporada\nestado_canon: borrador\n---\n# T01\n");
  return fs.leer(COPIA);
}

describe("la v1.0 no ve ni toca _fichas/ (spec 009, RNF v1.0)", () => {
  it("abre la serie igual con copias de fichas que sin ellas", async () => {
    const v1 = new AlmacenV1(fs, RAIZ);
    const sin = resumen(await v1.abrirSerie("s"));
    await conCopia();
    const con = await v1.abrirSerie("s");
    expect(resumen(con)).toBe(sin);
    expect(con.problemas).toEqual([]);
  });

  it("sus instantáneas no incluyen las copias y restaurar no las toca", async () => {
    const copia = await conCopia();
    const inst = new InstantaneasV1(new AlmacenV1(fs, RAIZ), "s");
    const hecha = await inst.crear("antes");
    expect((await inst.contenido(hecha.nombre)).some((r) => r.includes("_fichas"))).toBe(false);
    await inst.restaurar(hecha.nombre);
    expect(await fs.leer(COPIA)).toBe(copia);
  });

  it("su papelera no las toca", async () => {
    const copia = await conCopia();
    await new AlmacenV1(fs, RAIZ).borrar("s", crearPieza("evento", { id: "ev-aaaa" }));
    expect(await fs.leer(COPIA)).toBe(copia);
  });

  it("las instantáneas de la v2 tampoco las incluyen ni las tocan al restaurar", async () => {
    const copia = await conCopia();
    const inst = new Instantaneas(v2, "s");
    const hecha = await inst.crear("antes");
    expect((await inst.contenido(hecha.nombre)).some((r) => r.includes("_fichas"))).toBe(false);
    await inst.restaurar(hecha.nombre);
    expect(await fs.leer(COPIA)).toBe(copia);
  });
});
