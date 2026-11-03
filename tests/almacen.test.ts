import { beforeEach, describe, expect, it } from "vitest";
import { Almacen, carpetaParaTitulo } from "../src/lib/almacen/almacen";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { crearPieza } from "../src/lib/modelo/ficheros";
import type { Arco, Evento } from "../src/lib/modelo/tipos";

const RAIZ = "C:/Vault/appDatos";
let fs: FsMemoria;
let almacen: Almacen;

beforeEach(async () => {
  fs = new FsMemoria();
  fs.reloj = () => new Date(2026, 9, 19, 18, 20, 5).getTime();
  almacen = new Almacen(fs, RAIZ);
  almacen.reloj = () => new Date(2026, 9, 19, 18, 20, 5);
  await fs.crearDir(RAIZ);
});

describe("listar series", () => {
  it("solo las carpetas con serie.md, también las que empiezan por _", async () => {
    await almacen.crearSerie("cabo sal", { titulo: "Cabo Sal" });
    await almacen.crearSerie("_prueba", { titulo: "Prueba" });
    await fs.crearDir(`${RAIZ}/plantillas`);
    await fs.escribir(`${RAIZ}/guia.md`, "---\ntipo: guia\n---\n");
    const series = await almacen.listarSeries();
    expect(series.map((s) => [s.carpeta, s.titulo])).toEqual([
      ["_prueba", "Prueba"],
      ["cabo sal", "Cabo Sal"],
    ]);
  });

  it("una serie con serie.md roto sale en la lista con su problema", async () => {
    await fs.escribir(`${RAIZ}/rota/serie.md`, "---\ntitulo: [mal\n---\n");
    const [s] = await almacen.listarSeries();
    expect(s.carpeta).toBe("rota");
    expect(s.problema).toMatch(/propiedades/);
  });

  it("carpetaParaTitulo quita acentos, espacios y mayúsculas", () => {
    expect(carpetaParaTitulo("El Ñandú de Mürren")).toBe("el_nandu_de_murren");
  });
});

describe("crear, guardar y abrir", () => {
  it("crear una serie deja serie.md y sus carpetas", async () => {
    const s = await almacen.crearSerie("nueva", { titulo: "Nueva" });
    expect(s.id).toMatch(/^se-/);
    for (const c of ["puntos", "temporadas", "episodios", "arcos", "eventos", "secretos"]) {
      expect(await fs.existe(`${RAIZ}/nueva/${c}`)).toBe(true);
    }
    await expect(almacen.crearSerie("nueva", { titulo: "Otra" })).rejects.toThrow(/ya existe/);
  });

  it("guardar y leer devuelve lo mismo, cada pieza en <id>.md", async () => {
    const serie = await almacen.crearSerie("s", { titulo: "S" });
    const t = crearPieza("temporada", { id: "te-a1b2", titulo: "Cerrar la emisora" });
    const ep = crearPieza("episodio", { id: "ep-k2m9", temporada: "te-a1b2", titulo: "La cinta" });
    const ar = crearPieza("arco", { id: "ar-v3n9", titulo: "El eco", protagonistas: ["[[Telmo]]"] });
    const ev = crearPieza("evento", {
      id: "ev-7f3k",
      temporada: "te-a1b2",
      episodio: "ep-k2m9",
      arcos: [{ arco: "ar-v3n9", papel: "abre" }],
    });
    const sc = crearPieza("secreto", { id: "sc-b8x1", titulo: "Quién grabó la cinta" });
    const pt = crearPieza("punto", { id: "pt-q8w1", clase: "giro" });
    serie.temporadas = ["te-a1b2"];
    for (const p of [serie, t, ep, ar, ev, sc, pt]) await almacen.guardar("s", p);
    expect(fs.rutas()).toContain(`${RAIZ}/s/eventos/ev-7f3k.md`);
    expect(fs.rutas()).toContain(`${RAIZ}/s/puntos/pt-q8w1.md`);

    const d = await almacen.abrirSerie("s");
    expect(d.problemas).toEqual([]);
    expect(d.serie).toEqual(serie);
    expect(d.temporadas).toEqual([t]);
    expect(d.episodios).toEqual([ep]);
    expect(d.arcos).toEqual([ar]);
    expect(d.eventos).toEqual([ev]);
    expect(d.secretos).toEqual([sc]);
    expect(d.puntos).toEqual([pt]);
  });

  it("cambiar un título no rompe relaciones ni renombra el fichero", async () => {
    await almacen.crearSerie("s", { titulo: "S" });
    const ar = crearPieza("arco", { id: "ar-v3n9", titulo: "El eco" });
    const ev = crearPieza("evento", { id: "ev-1", arcos: [{ arco: "ar-v3n9", papel: "abre" }] });
    await almacen.guardar("s", ar);
    await almacen.guardar("s", ev);
    const antes = fs.rutas();
    ar.titulo = "El eco de Telmo";
    await almacen.guardar("s", ar);
    expect(fs.rutas()).toEqual(antes);
    const d = await almacen.abrirSerie("s");
    const arco = d.arcos[0] as Arco;
    expect(arco.titulo).toBe("El eco de Telmo");
    expect((d.eventos[0] as Evento).arcos[0].arco).toBe(arco.id);
  });

  it("guarda con escritura segura", async () => {
    await almacen.crearSerie("s", { titulo: "S" });
    const ops: string[] = [];
    fs.alOperar = (op, ruta) => ops.push(`${op} ${ruta.split("/").pop()}`);
    await almacen.guardar("s", crearPieza("evento", { id: "ev-1" }));
    expect(ops).toEqual(["escribir ev-1.md.tmp", "renombrar ev-1.md.tmp"]);
  });
});

describe("borrar", () => {
  it("mueve el fichero a _papelera/ con la fecha en el nombre", async () => {
    await almacen.crearSerie("s", { titulo: "S" });
    const ev = crearPieza("evento", { id: "ev-1", titulo: "Adiós" });
    await almacen.guardar("s", ev);
    const ruta = (await almacen.borrar("s", ev))!;
    expect(ruta).toBe(`${RAIZ}/s/_papelera/2026-10-19 18-20-05 ev-1.md`);
    expect(await fs.existe(`${RAIZ}/s/eventos/ev-1.md`)).toBe(false);
    expect(await fs.leer(ruta)).toContain("titulo: Adiós");
    const d = await almacen.abrirSerie("s");
    expect(d.eventos).toEqual([]);
  });

  it("borrar una pieza que no llegó a guardarse no hace nada", async () => {
    await almacen.crearSerie("s", { titulo: "S" });
    expect(await almacen.borrar("s", crearPieza("evento", { id: "ev-nunca" }))).toBeNull();
  });

  it("dos borrados en el mismo segundo no se pisan", async () => {
    await almacen.crearSerie("s", { titulo: "S" });
    const ev = crearPieza("evento", { id: "ev-1" });
    await almacen.guardar("s", ev);
    const r1 = await almacen.borrar("s", ev);
    await almacen.guardar("s", ev);
    const r2 = await almacen.borrar("s", ev);
    expect(r1).not.toBe(r2);
  });
});

describe("lo que no es una pieza", () => {
  it("las carpetas _… y .… y los .tmp no se leen como piezas", async () => {
    await almacen.crearSerie("s", { titulo: "S" });
    await almacen.guardar("s", crearPieza("evento", { id: "ev-1" }));
    await fs.escribir(`${RAIZ}/s/_papelera/2026-10-19 ev-9.md`, "---\nid: ev-9\ntipo: evento\n---\n");
    await fs.escribir(`${RAIZ}/s/eventos/_borrador/ev-8.md`, "---\nid: ev-8\ntipo: evento\n---\n");
    await fs.escribir(`${RAIZ}/s/eventos/.oculto.md`, "---\nid: ev-7\ntipo: evento\n---\n");
    await fs.escribir(`${RAIZ}/s/eventos/ev-6.md.tmp`, "---\nid: ev-6\ntipo: evento\n---\n");
    await fs.escribir(`${RAIZ}/s/eventos/notas.txt`, "hola");
    await fs.escribir(`${RAIZ}/s/.abierta`, "equipo: PC");
    const d = await almacen.abrirSerie("s");
    expect(d.eventos.map((e) => e.id)).toEqual(["ev-1"]);
    expect(d.problemas).toEqual([]);
  });

  it("un fichero con YAML roto no tumba la serie: se marca y se enseña", async () => {
    await almacen.crearSerie("s", { titulo: "S" });
    await almacen.guardar("s", crearPieza("evento", { id: "ev-1" }));
    await fs.escribir(`${RAIZ}/s/eventos/ev-2.md`, "---\ntitulo: [roto\n---\n");
    const d = await almacen.abrirSerie("s");
    expect(d.eventos.map((e) => e.id)).toEqual(["ev-1"]);
    expect(d.problemas).toHaveLength(1);
    expect(d.problemas[0].ruta).toBe(`${RAIZ}/s/eventos/ev-2.md`);
    expect(d.problemas[0].mensaje).toMatch(/propiedades/);
  });

  it("un id repetido se marca y se queda el primero", async () => {
    await almacen.crearSerie("s", { titulo: "S" });
    await fs.escribir(`${RAIZ}/s/eventos/ev-1.md`, "---\nid: ev-1\ntipo: evento\ntitulo: A\n---\n");
    await fs.escribir(`${RAIZ}/s/eventos/copia.md`, "---\nid: ev-1\ntipo: evento\ntitulo: B\n---\n");
    const d = await almacen.abrirSerie("s");
    expect(d.eventos).toHaveLength(1);
    expect(d.problemas[0].mensaje).toMatch(/repetido/);
  });

  it("si falta una carpeta de piezas, la serie abre igual", async () => {
    await fs.escribir(`${RAIZ}/m/serie.md`, "---\nid: se-1\ntipo: serie\ntitulo: Mínima\n---\n");
    const d = await almacen.abrirSerie("m");
    expect(d.serie.titulo).toBe("Mínima");
    expect(d.eventos).toEqual([]);
  });

  it("una serie con serie.md roto no se abre y lo dice", async () => {
    await fs.escribir(`${RAIZ}/rota/serie.md`, "sin propiedades");
    await expect(almacen.abrirSerie("rota")).rejects.toThrow(/serie\.md/);
  });
});
