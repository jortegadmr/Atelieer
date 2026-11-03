import { beforeEach, describe, expect, it } from "vitest";
import { Almacen, CambioFuera } from "../src/lib/almacen/almacen";
import { AlmacenPizarra } from "../src/lib/almacen/almacen-pizarra";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { escribirPizarra, leerPizarra } from "../src/lib/pizarra/formato";
import { crearNota, editarNota } from "../src/lib/pizarra/operaciones";
import { vacia, type Nota, type Pizarra } from "../src/lib/pizarra/tipos";

const RAIZ = "C:/Vault/appDatos";
const DIR = `${RAIZ}/cabo_sal/_pizarra`;
const RUTA = `${DIR}/pizarra.md`;

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
  almacen.reloj = () => new Date(2026, 9, 29, 12, 0, 0);
  await fs.crearDir(`${RAIZ}/cabo_sal`);
  pizarra = new AlmacenPizarra(almacen, "cabo_sal");
});

describe("Almacén de la pizarra (spec 012, T4a)", () => {
  it("cargar sin fichero da una pizarra vacía y no crea nada", async () => {
    const antes = fs.rutas();
    const c = await pizarra.cargar();
    expect(c.pizarra).toEqual(vacia());
    expect(c.soloLectura).toBe(false);
    expect(await fs.existe(DIR)).toBe(false);
    expect(fs.rutas()).toEqual(antes);
  });

  it("una pizarra vacía que nunca se escribió no se guarda", async () => {
    await pizarra.cargar();
    await pizarra.guardar(vacia());
    expect(await fs.existe(DIR)).toBe(false);
  });

  it("guardar y volver a cargar da lo mismo, como nota Markdown", async () => {
    await pizarra.cargar();
    const p = conTexto("hola");
    await pizarra.guardar(p);
    expect(fs.rutas()).toContain(RUTA);
    const t = await fs.leer(RUTA);
    expect(t.startsWith("# Pizarra")).toBe(true);
    const otro = new AlmacenPizarra(almacen, "cabo_sal");
    const c = await otro.cargar();
    expect(c.pizarra).toEqual(p);
    expect(c.avisos).toEqual([]);
  });

  it("guardar conserva lo que el autor escribió fuera del bloque", async () => {
    await pizarra.cargar();
    await pizarra.guardar(conTexto("uno"));
    const t = await fs.leer(RUTA);
    // El autor la edita en Obsidian y la app la lee antes de guardar
    const editado = `Mis apuntes\n\n${t}\nMás apuntes\n`;
    await fs.cambiarDesdeFuera(RUTA, editado);
    const otro = new AlmacenPizarra(almacen, "cabo_sal");
    const c = await otro.cargar();
    await otro.guardar(conTexto("dos"));
    const final = await fs.leer(RUTA);
    expect(final.startsWith("Mis apuntes\n")).toBe(true);
    expect(final.endsWith("\nMás apuntes\n")).toBe(true);
    expect((leerPizarra(final) as { pizarra: Pizarra }).pizarra.elementos[0]).toMatchObject({ texto: "dos" });
    expect(c.pizarra.elementos).toHaveLength(1);
  });

  it("guardar es entero o nada: si falla el renombrado queda la anterior", async () => {
    await pizarra.cargar();
    await pizarra.guardar(conTexto("buena"));
    const buena = await fs.leer(RUTA);
    fs.fallo = (op) => (op === "renombrar" ? "entero" : null);
    await expect(pizarra.guardar(conTexto("otra"))).rejects.toThrow();
    fs.fallo = null;
    expect(await fs.leer(RUTA)).toBe(buena);
    // Y no queda un .tmp suelto
    expect(fs.rutas().filter((r) => r.endsWith(".tmp"))).toEqual([]);
  });

  it("si cambió fuera, no escribe y lanza CambioFuera", async () => {
    await pizarra.cargar();
    await pizarra.guardar(conTexto("mía"));
    const deFuera = escribirPizarra(conTexto("de fuera"));
    await fs.cambiarDesdeFuera(RUTA, deFuera);
    await expect(pizarra.guardar(conTexto("otra mía"))).rejects.toBeInstanceOf(CambioFuera);
    expect(await fs.leer(RUTA)).toBe(deFuera);
  });

  it("borrado por fuera: avisa una vez y el siguiente guardado escribe", async () => {
    await pizarra.cargar();
    await pizarra.guardar(conTexto("mía"));
    await fs.borrar(RUTA);
    await expect(pizarra.guardar(conTexto("sigo"))).rejects.toBeInstanceOf(CambioFuera);
    expect(await fs.existe(RUTA)).toBe(false);
    await pizarra.guardar(conTexto("sigo"));
    expect((await fs.leer(RUTA)).includes("sigo")).toBe(true);
  });

  it("no había fichero al cargar y aparece uno: CambioFuera", async () => {
    await pizarra.cargar();
    const deFuera = escribirPizarra(conTexto("de otro equipo"));
    await fs.crearDir(DIR);
    await fs.cambiarDesdeFuera(RUTA, deFuera);
    await expect(pizarra.guardar(conTexto("mía"))).rejects.toBeInstanceOf(CambioFuera);
    expect(await fs.leer(RUTA)).toBe(deFuera);
  });

  it("dos guardados seguidos van en orden y no se cruzan", async () => {
    await pizarra.cargar();
    const a = pizarra.guardar(conTexto("primero"));
    const b = pizarra.guardar(conTexto("segundo"));
    await Promise.all([a, b]);
    const p = (leerPizarra(await fs.leer(RUTA)) as { pizarra: Pizarra }).pizarra;
    expect((p.elementos[0] as Nota).texto).toBe("segundo");
  });

  it("un fichero ilegible se aparta con su fecha, no se borra, y se empieza con una pizarra vacía", async () => {
    await fs.crearDir(DIR);
    await fs.escribir(RUTA, "# Pizarra\n\n```json\n{ roto\n```\n");
    const c = await pizarra.cargar();
    expect(c.pizarra).toEqual(vacia());
    expect(c.avisos.join(" ")).toMatch(/pizarra rota 2026-10-29 12-00-00\.md/);
    expect(await fs.existe(RUTA)).toBe(false);
    expect(await fs.leer(`${DIR}/pizarra rota 2026-10-29 12-00-00.md`)).toContain("{ roto");
    // Y la pizarra nueva se guarda sin problema
    await pizarra.guardar(conTexto("nueva"));
    expect(await fs.existe(RUTA)).toBe(true);
  });

  it("dos ilegibles el mismo segundo no se pisan", async () => {
    await fs.crearDir(DIR);
    await fs.escribir(RUTA, "roto 1");
    await pizarra.cargar();
    await fs.escribir(RUTA, "roto 2");
    await new AlmacenPizarra(almacen, "cabo_sal").cargar();
    const rotas = fs.rutas().filter((r) => r.includes("pizarra rota"));
    expect(rotas).toHaveLength(2);
    expect(await fs.leer(rotas[0])).not.toBe(await fs.leer(rotas[1]));
  });

  it("un conflicto de Proton no se lee como la pizarra", async () => {
    await fs.crearDir(DIR);
    await fs.escribir(`${DIR}/pizarra (# Edit conflict 2026-10-29 abc #).md`, escribirPizarra(conTexto("del conflicto")));
    const c = await pizarra.cargar();
    expect(c.pizarra).toEqual(vacia());
  });

  it("una pizarra de una versión más nueva se carga en solo lectura", async () => {
    await fs.crearDir(DIR);
    await fs.escribir(RUTA, "# Pizarra\n\n```json\n" + JSON.stringify({ version: 9, elementos: [], flechas: [] }) + "\n```\n");
    const c = await pizarra.cargar();
    expect(c.soloLectura).toBe(true);
    expect(c.avisos.length).toBeGreaterThan(0);
  });
});
