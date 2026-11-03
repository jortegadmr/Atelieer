// La v1.0 y la pizarra de la v2 (spec 012, constitución 9, RNF-1): con el código
// congelado de la v1.0, la serie se ve igual con _pizarra/ que sin ella, y ni sus
// instantáneas ni su papelera la tocan. Y la v1.0 puede restaurar una copia de
// la v2 que lleva la pizarra dentro sin romper ni mover nada.

import { beforeEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { AlmacenPizarra } from "../src/lib/almacen/almacen-pizarra";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Instantaneas } from "../src/lib/almacen/instantaneas";
import { crearPieza } from "../src/lib/modelo/ficheros";
import { anadirTarjeta, crearNota, editarNota, unir } from "../src/lib/pizarra/operaciones";
import { vacia, type Pizarra } from "../src/lib/pizarra/tipos";
import { Almacen as AlmacenV1 } from "./compat/v1/almacen";
import { Instantaneas as InstantaneasV1 } from "./compat/v1/instantaneas";

const RAIZ = "/appDatos";
const SERIE = `${RAIZ}/s`;
const NOTA = `${SERIE}/_pizarra/pizarra.md`;
let fs: FsMemoria;
let v2: Almacen;
let pizarra: AlmacenPizarra;

beforeEach(async () => {
  fs = new FsMemoria();
  v2 = new Almacen(fs, RAIZ);
  await v2.crearSerie("s", { titulo: "S" });
  await v2.guardar("s", crearPieza("evento", { id: "ev-aaaa", titulo: "Uno" }));
  pizarra = new AlmacenPizarra(v2, "s");
  await pizarra.cargar();
});

/** Una pizarra con de todo: nota con texto raro, tarjeta y flecha */
function completa(texto = "idea\ncon `código`, ``` y --- y ‮ bidi"): Pizarra {
  let p = vacia();
  const n = crearNota(p, { x: 5, y: 6 }, "pz-a");
  if ("error" in n) throw new Error(n.error);
  p = editarNota(n.pizarra, "pz-a", texto).pizarra;
  const t = anadirTarjeta(p, "ev-aaaa", { x: 300, y: 6 }, "pz-a");
  if ("error" in t) throw new Error(t.error);
  const u = unir(t.pizarra, "pz-a", t.id, "provoca");
  if ("error" in u) throw new Error(u.error);
  return u.pizarra;
}

async function conPizarra(): Promise<string> {
  await pizarra.guardar(completa());
  await pizarra.copiaAPapelera(completa("una vieja"));
  return fs.leer(NOTA);
}

const resumen = (d: Awaited<ReturnType<AlmacenV1["abrirSerie"]>>) => JSON.stringify({ ...d, problemas: d.problemas, conflictos: d.conflictos });

describe("la v1.0 no ve ni toca _pizarra/ (spec 012, RNF-1)", () => {
  it("abre la serie igual con pizarra y su papelera que sin ellas, sin problemas ni avisos", async () => {
    const v1 = new AlmacenV1(fs, RAIZ);
    const sin = resumen(await v1.abrirSerie("s"));
    await conPizarra();
    const con = await v1.abrirSerie("s");
    expect(resumen(con)).toBe(sin);
    expect(con.eventos.map((e) => e.titulo)).toEqual(["Uno"]);
    expect(con.problemas).toEqual([]);
    expect((await v1.listarSeries()).map((s) => [s.carpeta, s.problema])).toEqual([["s", undefined]]);
  });

  it("sin pizarra, la serie es la de siempre: no se crea nada", async () => {
    const antes = fs.rutas();
    const v1 = new AlmacenV1(fs, RAIZ);
    await v1.abrirSerie("s");
    await pizarra.cargar();
    expect(fs.rutas()).toEqual(antes);
  });

  it("guardar y borrar piezas con la v1.0 no tocan la pizarra ni su papelera", async () => {
    const nota = await conPizarra();
    const copias = fs.rutas().filter((r) => r.includes("/_papelera/_pizarra/"));
    const v1 = new AlmacenV1(fs, RAIZ);
    await v1.guardar("s", crearPieza("evento", { id: "ev-aaaa", titulo: "Editado por la v1.0" }));
    await v1.borrar("s", crearPieza("evento", { id: "ev-aaaa" }));
    expect(await fs.leer(NOTA)).toBe(nota);
    expect(fs.rutas().filter((r) => r.includes("/_papelera/_pizarra/"))).toEqual(copias);
  });

  it("sus instantáneas no incluyen la pizarra y restaurar no la toca ni la manda a la papelera", async () => {
    const nota = await conPizarra();
    const inst = new InstantaneasV1(new AlmacenV1(fs, RAIZ), "s");
    const copia = await inst.crear("antes");
    expect((await inst.contenido(copia.nombre)).some((r) => r.includes("_pizarra"))).toBe(false);
    await inst.restaurar(copia.nombre);
    expect(await fs.leer(NOTA)).toBe(nota);
    expect(fs.rutas().filter((r) => r.includes("/_papelera/") && !r.includes("/_pizarra/"))).toEqual([]);
  });

  it("la v1.0 restaura una copia de la v2 con la pizarra dentro sin romper ni mover nada", async () => {
    const buena = await conPizarra();
    const inst2 = new Instantaneas(v2, "s");
    const copia = await inst2.crear("de la v2");
    expect(await inst2.contenido(copia.nombre)).toContain("_pizarra/pizarra.md");

    // La pizarra cambia y la v1.0 restaura la copia de la v2
    await pizarra.guardar(completa("cambiada después"));
    const v1 = new AlmacenV1(fs, RAIZ);
    await new InstantaneasV1(v1, "s").restaurar(copia.nombre);

    expect(await fs.leer(NOTA)).toBe(buena);
    expect(fs.rutas().filter((r) => r.includes("/_papelera/") && !r.includes("/_pizarra/"))).toEqual([]);
    const d = await v1.abrirSerie("s");
    expect(d.problemas).toEqual([]);
    expect(d.eventos.map((e) => e.titulo)).toEqual(["Uno"]);
    // Y la v2 la sigue leyendo
    const c = await new AlmacenPizarra(v2, "s").cargar();
    expect(c.avisos).toEqual([]);
    expect(c.pizarra.elementos).toHaveLength(2);
  });

  it("las instantáneas de la v2 con la pizarra no se la llevan a la papelera al restaurar una copia vieja", async () => {
    const inst = new Instantaneas(v2, "s");
    const vieja = await inst.crear("sin pizarra");
    const nota = await conPizarra();
    await inst.restaurar(vieja.nombre);
    expect(await fs.leer(NOTA)).toBe(nota);
  });

  it("el texto de una nota con NUL, saltos y bidi sigue igual tras guardar y leer", async () => {
    const texto = "uno\0dos\ntres‮cuatro";
    await pizarra.guardar(completa(texto));
    const c = await new AlmacenPizarra(v2, "s").cargar();
    expect(c.pizarra.elementos[0]).toMatchObject({ texto });
  });
});
