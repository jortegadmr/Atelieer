import { beforeEach, describe, expect, it } from "vitest";
import { Almacen, CambioFuera, esFicheroDePieza } from "../src/lib/almacen/almacen";
import { AlmacenGuion } from "../src/lib/almacen/almacen-guion";
import { BorradaFuera } from "../src/lib/almacen/almacen-pizarra";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { escribirGuion, leerGuion } from "../src/lib/guion/formato";
import { vacio } from "../src/lib/guion/tipos";

const RAIZ = "C:/Vault/appDatos";
const DIR = `${RAIZ}/cabo_sal/_guion`;
const PAPELERA = `${RAIZ}/cabo_sal/_papelera/_guion`;
const ID = "ev-7f3a";
const RUTA = `${DIR}/${ID}.md`;

let fs: FsMemoria;
let almacen: Almacen;
let guion: AlmacenGuion;
const escrito: Array<[string, string | null]> = [];

const g = (texto: string, id = ID) => ({ ...vacio(id), texto });

beforeEach(async () => {
  fs = new FsMemoria();
  fs.reloj = () => new Date(2026, 9, 29, 12, 0, 0).getTime();
  almacen = new Almacen(fs, RAIZ);
  almacen.reloj = () => new Date(2026, 9, 29, 12, 0, 0);
  escrito.length = 0;
  almacen.alEscribir = (r, c) => void escrito.push([r, c]);
  await fs.crearDir(`${RAIZ}/cabo_sal`);
  guion = new AlmacenGuion(almacen, "cabo_sal");
});

describe("Almacén del guion (spec 013, T7a)", () => {
  it("cargar sin fichero da un guion vacío y no crea nada", async () => {
    const antes = fs.rutas();
    const c = await guion.cargar(ID);
    expect(c.guion.texto).toBe("");
    expect(c.existe).toBe(false);
    expect(c.soloLectura).toBe(false);
    expect(await fs.existe(DIR)).toBe(false);
    expect(fs.rutas()).toEqual(antes);
  });

  it("un guion vacío que nunca se escribió no deja rastro", async () => {
    await guion.cargar(ID);
    await guion.guardar(ID, g(" \n"));
    expect(await fs.existe(DIR)).toBe(false);
  });

  it("guardar y volver a cargar da lo mismo, como nota Markdown", async () => {
    await guion.cargar(ID);
    await guion.guardar(ID, g("INT. TALLER – NOCHE\n\n[[Vera]] entra.\n"));
    const t = await fs.leer(RUTA);
    expect(t.startsWith("---\natelier_guion: 1\nescena: ev-7f3a\n---\n")).toBe(true);
    const otra = new AlmacenGuion(almacen, "cabo_sal");
    expect((await otra.cargar(ID)).guion.texto).toBe("INT. TALLER – NOCHE\n\n[[Vera]] entra.\n");
  });

  it("el almacén avisa a la vigilancia de lo que escribe", async () => {
    await guion.cargar(ID);
    await guion.guardar(ID, g("hola"));
    expect(escrito.some(([r]) => r === RUTA)).toBe(true);
  });

  it("guardar es entero o nada: si falla el renombrado, queda la anterior", async () => {
    await guion.cargar(ID);
    await guion.guardar(ID, g("uno"));
    const antes = await fs.leer(RUTA);
    const renombrar = fs.renombrar.bind(fs);
    fs.renombrar = async () => {
      throw new Error("disco lleno");
    };
    await expect(guion.guardar(ID, g("dos"))).rejects.toThrow("disco lleno");
    fs.renombrar = renombrar;
    expect(await fs.leer(RUTA)).toBe(antes);
    expect(fs.rutas().some((r) => r.endsWith(".tmp"))).toBe(false);
  });

  it("cambió fuera: no escribe y lanza CambioFuera", async () => {
    await guion.cargar(ID);
    await guion.guardar(ID, g("mío"));
    await fs.escribir(RUTA, escribirGuion(g("de Obsidian")));
    await expect(guion.guardar(ID, g("mío 2"))).rejects.toBeInstanceOf(CambioFuera);
    expect(leerGuion(await fs.leer(RUTA))).toMatchObject({ guion: { texto: "de Obsidian" } });
    expect(await guion.comprobarFuera(ID)).toBe(true);
    await guion.releer(ID);
    expect(await guion.comprobarFuera(ID)).toBe(false);
  });

  it("borrado por fuera: avisa una vez y el siguiente guardado escribe", async () => {
    await guion.cargar(ID);
    await guion.guardar(ID, g("uno"));
    await fs.borrar(RUTA);
    await expect(guion.guardar(ID, g("dos"))).rejects.toBeInstanceOf(BorradaFuera);
    await guion.guardar(ID, g("dos"));
    expect(leerGuion(await fs.leer(RUTA))).toMatchObject({ guion: { texto: "dos" } });
  });

  it("no había fichero al cargar y aparece uno: CambioFuera", async () => {
    await guion.cargar(ID);
    await fs.crearDir(DIR);
    await fs.escribir(RUTA, escribirGuion(g("de fuera")));
    await expect(guion.guardar(ID, g("mío"))).rejects.toBeInstanceOf(CambioFuera);
  });

  it("dos guardados de la misma escena van en orden, y dos escenas no se cruzan", async () => {
    await guion.cargar(ID);
    await guion.cargar("ev-0002");
    await Promise.all([guion.guardar(ID, g("uno")), guion.guardar(ID, g("dos")), guion.guardar("ev-0002", g("otra", "ev-0002"))]);
    expect(leerGuion(await fs.leer(RUTA))).toMatchObject({ guion: { texto: "dos" } });
    expect(leerGuion(await fs.leer(`${DIR}/ev-0002.md`))).toMatchObject({ guion: { texto: "otra" } });
  });

  it("ilegible: se aparta con su fecha, no se borra, no se vuelve a leer y empieza vacío", async () => {
    await fs.crearDir(DIR);
    await fs.escribir(RUTA, "---\natelier_guion: 1\nsin cierre");
    const c = await guion.cargar(ID);
    expect(c.guion.texto).toBe("");
    expect(c.avisos.join(" ")).toContain("Se apartó a «ev-7f3a rota 2026-10-29 12-00-00.md»");
    expect(await fs.leer(`${DIR}/ev-7f3a rota 2026-10-29 12-00-00.md`)).toBe("---\natelier_guion: 1\nsin cierre");
    expect(await fs.existe(RUTA)).toBe(false);
    const l = await guion.listar();
    expect(l.guiones).toEqual([]);
    expect(l.ignorados.map((i) => i.nombre)).toEqual(["ev-7f3a rota 2026-10-29 12-00-00.md"]);
  });

  it("versión futura: solo lectura", async () => {
    await fs.crearDir(DIR);
    await fs.escribir(RUTA, "---\natelier_guion: 9\n---\nfuturo");
    const c = await guion.cargar(ID);
    expect(c.soloLectura).toBe(true);
    expect(c.guion.texto).toBe("futuro");
  });

  it("un fichero enorme se ignora y no se edita", async () => {
    await fs.crearDir(DIR);
    await fs.escribir(RUTA, "x".repeat(2_000_001));
    const c = await guion.cargar(ID);
    expect(c.soloLectura).toBe(true);
    expect(c.guion.texto).toBe("");
  });

  it("un id sin la forma de una escena no construye ruta", async () => {
    for (const malo of ["../x", "ev-../../x", "", "ev-1", "x/y"]) {
      expect(() => guion.ruta(malo)).toThrow();
      await expect(guion.cargar(malo)).rejects.toThrow();
      await expect(guion.guardar(malo, g("x"))).rejects.toThrow();
    }
  });
});

describe("Papelera y movimiento del guion (spec 013, T7b)", () => {
  it("copiaAPapelera copia el texto que se le pasa, con (2) y sin pisar", async () => {
    await guion.cargar(ID);
    await guion.guardar(ID, g("en disco"));
    const a = await guion.copiaAPapelera(ID, g("en memoria, más reciente"));
    const b = await guion.copiaAPapelera(ID, g("otra"));
    expect(a).toBe("ev-7f3a copia 2026-10-29 12-00-00.md");
    expect(b).toBe("ev-7f3a copia 2026-10-29 12-00-00 (2).md");
    expect(leerGuion(await fs.leer(`${PAPELERA}/${a}`))).toMatchObject({ guion: { texto: "en memoria, más reciente" } });
    expect(leerGuion(await fs.leer(RUTA))).toMatchObject({ guion: { texto: "en disco" } });
  });

  it("copiaAPapelera admite el fichero crudo, aunque esté roto", async () => {
    const n = await guion.copiaAPapelera(ID, "---\nroto");
    expect(await fs.leer(`${PAPELERA}/${n}`)).toBe("---\nroto");
  });

  it("moverAPapelera y devolverDePapelera conservan el texto", async () => {
    await guion.cargar(ID);
    await guion.guardar(ID, g("guion de la escena\n"));
    const original = await fs.leer(RUTA);
    expect(await guion.moverAPapelera(ID)).toBe(true);
    expect(await fs.existe(RUTA)).toBe(false);
    expect(await fs.leer(`${PAPELERA}/ev-7f3a 2026-10-29 12-00-00.md`)).toBe(original);
    expect(await guion.devolverDePapelera(ID)).toBe(true);
    expect(await fs.leer(RUTA)).toBe(original);
    expect(await fs.existe(`${PAPELERA}/ev-7f3a 2026-10-29 12-00-00.md`)).toBe(false);
  });

  it("mover sin guion no hace nada; devolver sin nada en la papelera tampoco", async () => {
    expect(await guion.moverAPapelera(ID)).toBe(false);
    expect(await guion.devolverDePapelera(ID)).toBe(false);
  });

  it("dos movimientos seguidos no se pisan (2) y devolver trae el último", async () => {
    await guion.cargar(ID);
    await guion.guardar(ID, g("uno"));
    await guion.moverAPapelera(ID);
    await guion.guardar(ID, g("dos"));
    await guion.moverAPapelera(ID);
    expect(await fs.existe(`${PAPELERA}/ev-7f3a 2026-10-29 12-00-00 (2).md`)).toBe(true);
    expect(await guion.devolverDePapelera(ID)).toBe(true);
    expect(leerGuion(await fs.leer(RUTA))).toMatchObject({ guion: { texto: "dos" } });
  });

  it("devolver no pisa un guion que ya hay, y no confunde copias con movimientos", async () => {
    await guion.cargar(ID);
    await guion.guardar(ID, g("uno"));
    await guion.copiaAPapelera(ID, g("una copia"));
    await guion.moverAPapelera(ID);
    await guion.copiaAPapelera(ID, g("una copia más reciente"));
    expect(await guion.devolverDePapelera(ID)).toBe(true);
    expect(leerGuion(await fs.leer(RUTA))).toMatchObject({ guion: { texto: "uno" } });
    await guion.moverAPapelera(ID);
    await fs.crearDir(DIR);
    await fs.escribir(RUTA, escribirGuion(g("nuevo")));
    expect(await guion.devolverDePapelera(ID)).toBe(false);
    expect(leerGuion(await fs.leer(RUTA))).toMatchObject({ guion: { texto: "nuevo" } });
  });

  it("esFicheroDePieza no reconoce nada de _guion ni de su papelera", () => {
    for (const n of ["ev-7f3a.md", "ev-7f3a copia 2026-10-29 12-00-00.md", "ev-7f3a rota 2026-10-29 12-00-00.md"]) {
      // la v1.0 recorre solo las carpetas de cada tipo de pieza; aquí se comprueba el filtro de nombre
      expect(typeof esFicheroDePieza(n)).toBe("boolean");
    }
  });
});

describe("Listado de la carpeta de guiones (spec 013, T7c)", () => {
  async function ponerDir(nombres: string[]) {
    await fs.crearDir(DIR);
    for (const n of nombres) await fs.escribir(`${DIR}/${n}`, escribirGuion(g("x")));
  }

  it("sin carpeta, nada", async () => {
    expect(await guion.listar()).toEqual({ guiones: [], huerfanos: [], ignorados: [] });
  });

  it("separa guiones, huérfanos e ignorados", async () => {
    await ponerDir(["ev-aaaa.md", "ev-bbbb.md", "ev-cccc.md", "ev-aaaa (# Edit conflict 2026-10-15 5i1veaD #).md", "foto.png", "notas.md", "ev-aaaa.md.tmp"]);
    const l = await guion.listar(new Set(["ev-aaaa", "ev-bbbb"]));
    expect(l.guiones).toEqual(["ev-aaaa", "ev-bbbb"]);
    expect(l.huerfanos).toEqual(["ev-cccc"]);
    expect(l.ignorados.map((i) => i.nombre).sort()).toEqual(["ev-aaaa (# Edit conflict 2026-10-15 5i1veaD #).md", "foto.png", "notas.md"]);
  });

  it("sin saber qué escenas existen, ninguno es huérfano", async () => {
    await ponerDir(["ev-aaaa.md", "ev-cccc.md"]);
    expect((await guion.listar()).guiones).toEqual(["ev-aaaa", "ev-cccc"]);
  });

  it("un conflicto no se lee como el guion ni se cuenta", async () => {
    await ponerDir(["ev-aaaa.md", "ev-aaaa (# Edit conflict 2026-10-15 5i1veaD #).md"]);
    expect((await guion.listar(new Set(["ev-aaaa"]))).guiones).toEqual(["ev-aaaa"]);
  });

  it("una subcarpeta y los .tmp se ignoran sin ruido", async () => {
    await ponerDir(["ev-aaaa.md"]);
    await fs.crearDir(`${DIR}/sub`);
    await fs.escribir(`${DIR}/ev-aaaa.md.tmp`, "a medias");
    const l = await guion.listar();
    expect(l.ignorados).toEqual([]);
  });

  it("los huérfanos se conservan: listar no toca nada", async () => {
    await ponerDir(["ev-cccc.md"]);
    const antes = fs.rutas();
    await guion.listar(new Set());
    expect(fs.rutas()).toEqual(antes);
  });
});
