import { beforeEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { AlmacenPizarra } from "../src/lib/almacen/almacen-pizarra";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { escribirPizarra, leerPizarra } from "../src/lib/pizarra/formato";
import { crearNota, editarNota } from "../src/lib/pizarra/operaciones";
import { vacia, type Pizarra } from "../src/lib/pizarra/tipos";

const RAIZ = "C:/Vault/appDatos";
const SERIE = `${RAIZ}/cabo sal`;
const RUTA = `${SERIE}/_pizarra/pizarra.md`;
const PAPELERA = `${SERIE}/_papelera/_pizarra`;

let fs: FsMemoria;
let almacen: Almacen;
let pizarra: AlmacenPizarra;

function conTexto(texto: string, id = "pz-a"): Pizarra {
  const r = crearNota(vacia(), { x: 1, y: 2 }, id);
  if ("error" in r) throw new Error(r.error);
  return editarNota(r.pizarra, id, texto).pizarra;
}

beforeEach(async () => {
  fs = new FsMemoria();
  fs.reloj = () => new Date(2026, 9, 29, 12, 0, 0).getTime();
  almacen = new Almacen(fs, RAIZ);
  almacen.reloj = () => new Date(2026, 9, 29, 12, 0, 5);
  await fs.crearDir(RAIZ);
  await almacen.crearSerie("cabo sal", { titulo: "Cabo Sal" });
  pizarra = new AlmacenPizarra(almacen, "cabo sal");
});

describe("Papelera y relectura de la pizarra (spec 012, T4b)", () => {
  it("la copia va a _papelera/_pizarra/ con el sello y es una pizarra que se puede leer", async () => {
    const nombre = await pizarra.copiaAPapelera(conTexto("lo que iba a perder"));
    expect(nombre).toBe("2026-10-29 12-00-05.md");
    const t = await fs.leer(`${PAPELERA}/${nombre}`);
    const r = leerPizarra(t) as { pizarra: Pizarra };
    expect(r.pizarra.elementos[0]).toMatchObject({ texto: "lo que iba a perder" });
  });

  it("con el mismo sello pone (2), (3)… y no pisa ninguna", async () => {
    const a = await pizarra.copiaAPapelera(conTexto("a"));
    const b = await pizarra.copiaAPapelera(conTexto("b"));
    const c = await pizarra.copiaAPapelera(conTexto("c"));
    expect([a, b, c]).toEqual(["2026-10-29 12-00-05.md", "2026-10-29 12-00-05 (2).md", "2026-10-29 12-00-05 (3).md"]);
    expect(await fs.leer(`${PAPELERA}/${a}`)).toContain('"a"');
    expect(await fs.leer(`${PAPELERA}/${c}`)).toContain('"c"');
  });

  it("si la copia falla a medias no queda un fichero a medias", async () => {
    fs.fallo = (op) => (op === "renombrar" ? "entero" : null);
    await expect(pizarra.copiaAPapelera(conTexto("x"))).rejects.toThrow();
    fs.fallo = null;
    expect(fs.rutas().filter((r) => r.includes("_papelera/_pizarra"))).toEqual([]);
  });

  it("la serie se abre igual con la pizarra y su papelera presentes, sin problemas", async () => {
    const limpia = await almacen.abrirSerie("cabo sal");
    await pizarra.cargar();
    await pizarra.guardar(conTexto("hola"));
    await pizarra.copiaAPapelera(conTexto("vieja"));
    const con = await almacen.abrirSerie("cabo sal");
    expect(con.problemas).toEqual(limpia.problemas);
    expect(con.problemas).toEqual([]);
    expect(con.eventos).toEqual(limpia.eventos);
    expect(con.serie).toEqual(limpia.serie);
  });

  it("comprobarFuera dice si el disco ya no es lo conocido", async () => {
    expect(await pizarra.comprobarFuera()).toBe(false); // sin fichero y sin haberlo tenido
    await pizarra.cargar();
    await pizarra.guardar(conTexto("mía"));
    expect(await pizarra.comprobarFuera()).toBe(false);
    await fs.cambiarDesdeFuera(RUTA, escribirPizarra(conTexto("de fuera")));
    expect(await pizarra.comprobarFuera()).toBe(true);
  });

  it("comprobarFuera avisa si el fichero se borró y si aparece uno que no había", async () => {
    await pizarra.cargar();
    await fs.crearDir(`${SERIE}/_pizarra`);
    await fs.cambiarDesdeFuera(RUTA, escribirPizarra(conTexto("nueva")));
    expect(await pizarra.comprobarFuera()).toBe(true);
    await pizarra.releer();
    expect(await pizarra.comprobarFuera()).toBe(false);
    await fs.borrar(RUTA);
    expect(await pizarra.comprobarFuera()).toBe(true);
  });

  it("releer pone lo conocido al día y el siguiente guardado ya no da CambioFuera", async () => {
    await pizarra.cargar();
    await pizarra.guardar(conTexto("mía"));
    const deFuera = escribirPizarra(conTexto("de fuera"));
    await fs.cambiarDesdeFuera(RUTA, deFuera);
    const c = await pizarra.releer();
    expect(c.pizarra.elementos[0]).toMatchObject({ texto: "de fuera" });
    await pizarra.guardar(conTexto("sobre lo de fuera"));
    expect(await fs.leer(RUTA)).toContain("sobre lo de fuera");
  });

  it("releer con el fichero borrado da una pizarra vacía y deja guardar", async () => {
    await pizarra.cargar();
    await pizarra.guardar(conTexto("mía"));
    await fs.borrar(RUTA);
    const c = await pizarra.releer();
    expect(c.pizarra).toEqual(vacia());
    await pizarra.guardar(conTexto("otra"));
    expect(await fs.existe(RUTA)).toBe(true);
  });
});
