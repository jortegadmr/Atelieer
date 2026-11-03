import { strToU8, zipSync } from "fflate";
import { beforeEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { AlmacenGuion } from "../src/lib/almacen/almacen-guion";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Instantaneas } from "../src/lib/almacen/instantaneas";
import { escribirGuion } from "../src/lib/guion/formato";
import { vacio } from "../src/lib/guion/tipos";
import { crearPieza } from "../src/lib/modelo/ficheros";

const RAIZ = "/d";
const SERIE = `${RAIZ}/s`;
let fs: FsMemoria;
let almacen: Almacen;
let inst: Instantaneas;
let guion: AlmacenGuion;
let hora: Date;

const g = (texto: string, id: string) => ({ ...vacio(id), texto });
const ruta = (id: string) => `${SERIE}/_guion/${id}.md`;

beforeEach(async () => {
  fs = new FsMemoria();
  almacen = new Almacen(fs, RAIZ);
  almacen.reloj = () => hora;
  await almacen.crearSerie("s", { titulo: "S" });
  await almacen.guardar("s", crearPieza("arco", { id: "ar-1", titulo: "La cinta oculta" }));
  hora = new Date(2026, 9, 29, 12, 0, 0);
  inst = new Instantaneas(almacen, "s", () => hora);
  guion = new AlmacenGuion(almacen, "s");
});

describe("instantáneas y guiones (spec 013, T8b)", () => {
  it("la copia lleva los guiones y restaurar los devuelve", async () => {
    await guion.cargar("ev-aaaa");
    await guion.cargar("ev-bbbb");
    await guion.guardar("ev-aaaa", g("el de la copia", "ev-aaaa"));
    await guion.guardar("ev-bbbb", g("otro", "ev-bbbb"));
    const buenoA = await fs.leer(ruta("ev-aaaa"));
    const i = await inst.crear("antes");
    expect((await inst.contenido(i.nombre)).filter((x) => x.startsWith("_guion/")).sort()).toEqual(["_guion/ev-aaaa.md", "_guion/ev-bbbb.md"]);

    await guion.guardar("ev-aaaa", g("cambiado después", "ev-aaaa"));
    hora = new Date(2026, 9, 29, 12, 5, 0);
    await inst.restaurar(i.nombre);
    expect(await fs.leer(ruta("ev-aaaa"))).toBe(buenoA);
  });

  it("lo restaurado se puede recuperar de la instantánea automática de antes", async () => {
    const i = await inst.crear("sin guion");
    await guion.cargar("ev-aaaa");
    await guion.guardar("ev-aaaa", g("el de ahora", "ev-aaaa"));
    const deAhora = await fs.leer(ruta("ev-aaaa"));
    await guion.guardar("ev-aaaa", g("el de ahora, más nuevo", "ev-aaaa"));
    const masNuevo = await fs.leer(ruta("ev-aaaa"));
    hora = new Date(2026, 9, 29, 12, 5, 0);
    await inst.restaurar(i.nombre);
    const auto = (await inst.listar()).find((x) => x.auto && x.fecha === "2026-10-29 12-05")!;
    expect(await inst.contenido(auto.nombre)).toContain("_guion/ev-aaaa.md");
    hora = new Date(2026, 9, 29, 12, 10, 0);
    await inst.restaurar(auto.nombre);
    expect(await fs.leer(ruta("ev-aaaa"))).toBe(masNuevo);
    expect(deAhora).not.toBe(masNuevo);
  });

  it("restaurar una copia sin guiones no toca los actuales ni los manda a la papelera", async () => {
    const i = await inst.crear("sin guiones");
    await guion.cargar("ev-aaaa");
    await guion.guardar("ev-aaaa", g("el de ahora", "ev-aaaa"));
    const antes = await fs.leer(ruta("ev-aaaa"));
    hora = new Date(2026, 9, 29, 12, 5, 0);
    await inst.restaurar(i.nombre);
    expect(await fs.leer(ruta("ev-aaaa"))).toBe(antes);
    expect(fs.rutas().some((r) => r.includes("_papelera") && r.includes("ev-aaaa"))).toBe(false);
  });

  it("los conflictos y los ficheros raros de _guion no entran en la copia", async () => {
    await fs.crearDir(`${SERIE}/_guion`);
    await fs.escribir(ruta("ev-aaaa"), escribirGuion(g("x", "ev-aaaa")));
    await fs.escribir(`${SERIE}/_guion/ev-aaaa (# Edit conflict 2026-10-15 5i1veaD #).md`, "x");
    await fs.escribir(`${SERIE}/_guion/notas.md`, "x");
    await fs.escribir(`${SERIE}/_guion/ev-aaaa.md.tmp`, "x");
    const i = await inst.crear("raros");
    expect((await inst.contenido(i.nombre)).filter((x) => x.startsWith("_guion/"))).toEqual(["_guion/ev-aaaa.md"]);
  });

  it("las instantáneas sin guiones siguen igual", async () => {
    const i = await inst.crear("a secas");
    expect((await inst.contenido(i.nombre)).some((x) => x.startsWith("_guion"))).toBe(false);
  });

  it("un zip con rutas fuera de la serie no escribe fuera al restaurar", async () => {
    const nombre = "2026-10-29 11-00 auto.zip";
    await fs.crearDir(`${SERIE}/_instantaneas`);
    await fs.escribirBytes(`${SERIE}/_instantaneas/${nombre}`, zipSync({ "../fuera.md": strToU8("no"), "_guion/ev-aaaa.md": strToU8("sí") }));
    await inst.restaurar(nombre);
    expect(await fs.existe(`${RAIZ}/fuera.md`)).toBe(false);
    expect(await fs.existe(`${SERIE}/../fuera.md`)).toBe(false);
    expect(await fs.leer(ruta("ev-aaaa"))).toBe("sí");
  });
});
