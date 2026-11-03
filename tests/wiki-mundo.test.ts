import { beforeEach, describe, expect, it } from "vitest";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import type { RutasWiki } from "../src/lib/modelo/tipos";
import {
  CATEGORIAS,
  aplicarRenombrar,
  carpetaDeCategoria,
  conIdea,
  conRelaciones,
  contarCategorias,
  copiarMia,
  crearFichaMundo,
  fichaDeTexto,
  leerCategoria,
  leerIdeas,
  leerRelaciones,
  moverFicha,
  planRenombrar,
  quitarFicha,
  nombreMundoValido,
  subcarpetaValida,
  usosDeFicha,
} from "../src/lib/wiki/mundo";
import { separar } from "../src/lib/wiki/md";

// Spec 015, T1-T6: el mundo escrito desde Atelier, sobre un disco en memoria.

const VAULT = "/V";
const MESA = `${VAULT}/appDatos/s`;
const RUTAS: RutasWiki = {
  raiz: "Wiki",
  personajes: "Wiki/Personajes",
  lugares: "Wiki/Lugares",
  eras: "Wiki/Eras",
  timeline: "Wiki/Timeline.md",
  narrativa: "Wiki/Narrativa",
  log: "Wiki/Log.md",
};
const OP = { fecha: "2026-10-29", hora: "12-00-00" };

let fs: FsMemoria;

const ficha = (nombre: string, extra = "") => `---\ntipo: personaje\nestado_canon: idea\naliases: [${nombre.toLowerCase()}]\n${extra}---\n\n# ${nombre}\n\n> **Resumen:** Algo de ${nombre}.\n`;

beforeEach(async () => {
  fs = new FsMemoria();
  await fs.crearDir(`${VAULT}/Wiki/Personajes`);
  await fs.escribir(`${VAULT}/Wiki/Log.md`, "# Log\n");
  await fs.escribir(`${VAULT}/Wiki/Personajes/Vera.md`, ficha("Vera"));
  await fs.escribir(`${VAULT}/Wiki/Personajes/Telmo.md`, ficha("Telmo", "relaciones:\n  - \"[[Vera]] — amistad\"\n"));
  await fs.crearDir(`${MESA}/eventos`);
  await fs.escribir(`${MESA}/eventos/ev-aaaa.md`, "---\nid: ev-aaaa\n---\n\nHabla con [[Vera]] y con [[Vera|la doctora]]. También [[Wiki/Personajes/Vera]].\n");
  await fs.crearDir(`${MESA}/_guion`);
  await fs.escribir(`${MESA}/_guion/ev-aaaa.md`, "---\natelier_guion: 1\n---\nINT. CASA\n\n[[Vera]]\nHola.\n");
});

describe("categorías y lectura (spec 015, T1)", () => {
  it("las nueve categorías de la spec, con las tres de hoy en las carpetas de la serie", () => {
    expect(CATEGORIAS.map((c) => c.id).sort()).toEqual(["documento", "era", "especie", "evento", "glosario", "grupo", "lugar", "personaje", "poder"]);
    expect(carpetaDeCategoria(RUTAS, "personaje")).toBe("Wiki/Personajes");
    expect(carpetaDeCategoria(RUTAS, "grupo")).toBe("Wiki/Grupos");
    expect(carpetaDeCategoria(RUTAS, "poder")).toBe("Wiki/Poderes y reglas");
    expect(carpetaDeCategoria({ ...RUTAS, raiz: "" }, "grupo")).toBe("");
  });

  it("lee las fichas de una categoría con alias, resumen, estado y relaciones", async () => {
    const r = await leerCategoria(fs, VAULT, RUTAS, "personaje");
    expect(r.map((f) => f.nombre)).toEqual(["Telmo", "Vera"]);
    const telmo = r[0]!;
    expect(telmo.resumen).toBe("Algo de Telmo.");
    expect(telmo.estado).toBe("idea");
    expect(telmo.aliases).toEqual(["telmo"]);
    expect(telmo.relaciones).toEqual([{ con: "Vera", tipo: "amistad" }]);
  });

  it("una categoría sin carpeta está vacía y las subcarpetas se leen con su nombre", async () => {
    expect(await leerCategoria(fs, VAULT, RUTAS, "grupo")).toEqual([]);
    await fs.escribir(`${VAULT}/Wiki/Personajes/Los Faroleros/Marlo.md`, ficha("Marlo"));
    const dross = (await leerCategoria(fs, VAULT, RUTAS, "personaje")).find((f) => f.nombre === "Marlo")!;
    expect(dross.subcarpeta).toBe("Los Faroleros");
    expect((await contarCategorias(fs, VAULT, RUTAS)).personaje).toBe(3);
  });

  it("una subcarpeta con .. o con unidad no vale", () => {
    expect(subcarpetaValida("")).toBe(true);
    expect(subcarpetaValida("Los Faroleros/Casa")).toBe(true);
    expect(subcarpetaValida("../fuera")).toBe(false);
    expect(subcarpetaValida("C:")).toBe(false);
    expect(subcarpetaValida("a/b*c")).toBe(false);
  });
});

describe("crear ficha (spec 015, T2)", () => {
  it("crea con solo un nombre, con la plantilla propuesta, Fuentes y entrada en el Log", async () => {
    const r = await crearFichaMundo(fs, VAULT, RUTAS, "grupo", "Los Faroleros", { ...OP, origen: "appDatos/s" });
    expect(r).toEqual({ estado: "creada", ruta: "Wiki/Grupos/Los Faroleros.md" });
    const texto = await fs.leer(`${VAULT}/Wiki/Grupos/Los Faroleros.md`);
    expect(texto).toContain("tipo: grupo");
    expect(texto).toContain("# Los Faroleros");
    expect(texto).toContain("> **Resumen:** [PENDIENTE]");
    expect(texto).toContain("## Miembros");
    expect(texto).toContain("## Ideas");
    expect(texto).toContain("creada desde Atelier el 2026-10-29");
    expect(texto).not.toContain("{{");
    expect(await fs.leer(`${VAULT}/Wiki/Log.md`)).toContain("Crear ficha: Los Faroleros");
  });

  it("usa la plantilla del vault si el autor la tiene", async () => {
    await fs.escribir(`${VAULT}/_Plantillas/Mundo/Plantilla - Lugar.md`, "---\ntipo: lugar\n---\n# {{title}}\n\n> **Resumen:** [PENDIENTE]\n\n## Fuentes\n\n- `00_Raw/...` —\n");
    await crearFichaMundo(fs, VAULT, RUTAS, "lugar", "Taller", { ...OP, origen: "appDatos/s" });
    expect(await fs.leer(`${VAULT}/Wiki/Lugares/Taller.md`)).toContain("tipo: lugar");
  });

  it("no pisa una que ya existe y rechaza nombres que no valen", async () => {
    const antes = await fs.leer(`${VAULT}/Wiki/Personajes/Vera.md`);
    expect((await crearFichaMundo(fs, VAULT, RUTAS, "personaje", "Vera", { ...OP, origen: "o" })).estado).toBe("ya existe");
    expect(await fs.leer(`${VAULT}/Wiki/Personajes/Vera.md`)).toBe(antes);
    for (const malo of ["../Vera", "a/b", "x:y", "", "   ", "a#b"]) await expect(crearFichaMundo(fs, VAULT, RUTAS, "grupo", malo, { ...OP, origen: "o" })).rejects.toThrow();
    await expect(crearFichaMundo(fs, VAULT, RUTAS, "grupo", "X", { ...OP, origen: "o", subcarpeta: "../fuera" })).rejects.toThrow();
    await expect(crearFichaMundo(fs, VAULT, { ...RUTAS, raiz: "" }, "grupo", "X", { ...OP, origen: "o" })).rejects.toThrow(/carpeta/);
    expect(fs.rutas().some((r) => r.includes("fuera"))).toBe(false);
  });

  it("[[Nombre]] como nombre se limpia y la subcarpeta se respeta", async () => {
    const r = await crearFichaMundo(fs, VAULT, RUTAS, "especie", "[[Costa]]", { ...OP, origen: "o", subcarpeta: "Antiguas" });
    expect(r.ruta).toBe("Wiki/Especies/Antiguas/Costa.md");
  });
});

describe("renombrar con enlaces (spec 015, T3)", () => {
  async function vera() {
    return (await leerCategoria(fs, VAULT, RUTAS, "personaje")).find((f) => f.nombre === "Vera")!;
  }
  const copias = `${MESA}/_fichas`;

  it("el plan cuenta las notas que cambian y no escribe nada", async () => {
    const antes = fs.rutas().length;
    const plan = await planRenombrar(fs, VAULT, RUTAS, MESA, await vera(), "Vero");
    expect(plan.ok).toBe(true);
    expect(plan.rutaNueva).toBe("Wiki/Personajes/Vero.md");
    expect(plan.cambios.map((c) => [c.ruta.split("/").pop(), c.veces]).sort()).toEqual([
      ["Telmo.md", 1],
      ["ev-aaaa.md", 1],
      ["ev-aaaa.md", 3],
    ]);
    expect(fs.rutas().length).toBe(antes);
  });

  it("renombra la nota, el título y los enlaces de piezas, guion y fichas, con copia de cómo estaban", async () => {
    const r = await aplicarRenombrar(fs, VAULT, RUTAS, MESA, await vera(), "Vero", { ...OP, copias });
    expect(r).toMatchObject({ ok: true, cambiadas: 3, fallos: [] });
    expect(await fs.existe(`${VAULT}/Wiki/Personajes/Vera.md`)).toBe(false);
    expect(await fs.leer(`${VAULT}/Wiki/Personajes/Vero.md`)).toContain("# Vero");
    expect(await fs.leer(`${MESA}/eventos/ev-aaaa.md`)).toBe("---\nid: ev-aaaa\n---\n\nHabla con [[Vero]] y con [[Vero|la doctora]]. También [[Wiki/Personajes/Vero]].\n");
    expect(await fs.leer(`${MESA}/_guion/ev-aaaa.md`)).toContain("[[Vero]]\nHola.");
    expect(await fs.leer(`${VAULT}/Wiki/Personajes/Telmo.md`)).toContain("[[Vero]] — amistad");
    const bak = fs.rutas().filter((x) => x.startsWith(copias));
    expect(bak.length).toBe(4);
    expect(await fs.leer(`${VAULT}/Wiki/Log.md`)).toContain("Renombrar ficha: Vera → Vero");
  });

  it("no toca enlaces de otras fichas con nombre parecido", async () => {
    await fs.escribir(`${MESA}/eventos/ev-bbbb.md`, "Ve a [[Maravilla]] y a [[Vera Luz]].\n");
    await aplicarRenombrar(fs, VAULT, RUTAS, MESA, await vera(), "Vero", { ...OP, copias });
    expect(await fs.leer(`${MESA}/eventos/ev-bbbb.md`)).toBe("Ve a [[Maravilla]] y a [[Vera Luz]].\n");
  });

  it("rechaza nombres inválidos, el mismo nombre y uno que ya existe, sin cambiar nada", async () => {
    const m = await vera();
    for (const malo of ["../x", "a/b", "", "Vera"]) expect((await aplicarRenombrar(fs, VAULT, RUTAS, MESA, m, malo, { ...OP, copias })).ok).toBe(false);
    const r = await aplicarRenombrar(fs, VAULT, RUTAS, MESA, m, "Telmo", { ...OP, copias });
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/Ya hay/);
    expect(await fs.existe(`${VAULT}/Wiki/Personajes/Vera.md`)).toBe(true);
  });

  it("un cambio solo de mayúsculas también renombra", async () => {
    const r = await aplicarRenombrar(fs, VAULT, RUTAS, MESA, await vera(), "VERA", { ...OP, copias });
    expect(r.ok).toBe(true);
    expect((await leerCategoria(fs, VAULT, RUTAS, "personaje")).map((f) => f.nombre)).toContain("VERA");
  });
});

describe("mover y quitar (spec 015, T4)", () => {
  it("mueve a una subcarpeta de su categoría y no sale de ella", async () => {
    const m = (await leerCategoria(fs, VAULT, RUTAS, "personaje")).find((f) => f.nombre === "Vera")!;
    expect(await moverFicha(fs, VAULT, RUTAS, m, "Los Faroleros", OP)).toBe("Wiki/Personajes/Los Faroleros/Vera.md");
    expect(await fs.existe(`${VAULT}/Wiki/Personajes/Vera.md`)).toBe(false);
    await expect(moverFicha(fs, VAULT, RUTAS, { ...m, ruta: "Wiki/Personajes/Los Faroleros/Vera.md" }, "../../fuera", OP)).rejects.toThrow();
  });

  it("no mueve a donde ya hay otra con ese nombre", async () => {
    await fs.escribir(`${VAULT}/Wiki/Personajes/Sub/Vera.md`, ficha("Vera"));
    const m = (await leerCategoria(fs, VAULT, RUTAS, "personaje")).find((f) => f.ruta === "Wiki/Personajes/Vera.md")!;
    await expect(moverFicha(fs, VAULT, RUTAS, m, "Sub", OP)).rejects.toThrow(/Ya hay/);
  });

  it("quitar manda la nota a la papelera de la serie sin borrar nada", async () => {
    const m = (await leerCategoria(fs, VAULT, RUTAS, "personaje")).find((f) => f.nombre === "Vera")!;
    const texto = await fs.leer(`${VAULT}/${m.ruta}`);
    const destino = await quitarFicha(fs, VAULT, RUTAS, MESA, m, OP);
    expect(destino).toBe(`${MESA}/_papelera/_wiki/2026-10-29 12-00-00 Vera.md`);
    expect(await fs.leer(destino)).toBe(texto);
    expect(await fs.existe(`${VAULT}/${m.ruta}`)).toBe(false);
    expect(await fs.leer(`${VAULT}/Wiki/Log.md`)).toContain("Quitar ficha: Vera");
  });

  it("copiar la mía deja el texto aparte sin pisar otra copia", async () => {
    const a = await copiarMia(fs, MESA, "Vera", "mi texto", OP);
    const b = await copiarMia(fs, MESA, "Vera", "otro", OP);
    expect(a).not.toBe(b);
    expect(await fs.leer(a)).toBe("mi texto");
  });
});

describe("usos y relaciones (spec 015, T5)", () => {
  it("dice quién nombra a la ficha: piezas, guion y otras fichas, con cuántas veces", async () => {
    const m = (await leerCategoria(fs, VAULT, RUTAS, "personaje")).find((f) => f.nombre === "Vera")!;
    const usos = await usosDeFicha(fs, VAULT, RUTAS, MESA, m);
    expect(usos.map((u) => `${u.nombre}:${u.tipo}:${u.veces}`).sort()).toEqual(["Telmo:ficha:1", "ev-aaaa:guion:1", "ev-aaaa:pieza:3"]);
  });

  it("las relaciones van y vuelven y se conserva lo demás de las propiedades", () => {
    const texto = "---\ntipo: personaje\n# comentario\nrol: \"capitán\"\n---\n\n# Telmo\n\ncuerpo\n";
    const r = conRelaciones(texto, [{ con: "Vera", tipo: "amistad" }, { con: "Marlo", tipo: "" }]);
    expect(r).toContain("# comentario");
    expect(r).toContain('rol: "capitán"');
    expect(r.endsWith("# Telmo\n\ncuerpo\n")).toBe(true);
    expect(leerRelaciones(separar(r).propiedades)).toEqual([
      { con: "Vera", tipo: "amistad" },
      { con: "Marlo", tipo: "" },
    ]);
  });

  it("sin propiedades se crean y sin relaciones no se toca la nota", () => {
    expect(conRelaciones("# Solo cuerpo\n", [{ con: "Vera", tipo: "rivalidad" }]).startsWith("---\n")).toBe(true);
    expect(conRelaciones("---\ntipo: lugar\n---\ncuerpo\n", [])).toBe("---\ntipo: lugar\n---\ncuerpo\n");
  });

  it("CRLF y BOM se conservan al escribir relaciones", () => {
    const t = "\uFEFF---\r\ntipo: lugar\r\n---\r\ncuerpo\r\n";
    const r = conRelaciones(t, [{ con: "Vera", tipo: "amistad" }]);
    expect(r.startsWith("\uFEFF")).toBe(true);
    expect(r.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("fichaDeTexto lee estado en lista y alias", () => {
    const f = fichaDeTexto("---\nestado_canon: [borrador]\naliases: [A, B]\n---\n# X\n", "grupo", "Wiki/Grupos/X.md", "Wiki/Grupos");
    expect(f).toMatchObject({ nombre: "X", estado: "borrador", aliases: ["A", "B"], subcarpeta: "" });
  });
});

describe("bloc de ideas (spec 015, T6)", () => {
  it("crea la sección Ideas antes de Fuentes y añade al final de la existente", () => {
    const base = "# X\n\n> **Resumen:** a\n\n## Fuentes\n\n- f\n";
    const a = conIdea(base, "primera idea");
    expect(a).toBe("# X\n\n> **Resumen:** a\n\n## Ideas\n\n- primera idea\n\n## Fuentes\n\n- f\n");
    const b = conIdea(a, "segunda");
    expect(leerIdeas(b)).toEqual(["primera idea", "segunda"]);
    expect(b).toContain("- segunda\n\n## Fuentes");
  });

  it("sin Fuentes la sección va al final, y una idea vacía no cambia nada", () => {
    expect(conIdea("# X\n", "algo")).toBe("# X\n\n## Ideas\n\n- algo\n");
    expect(conIdea("# X\n", "   ")).toBe("# X\n");
  });

  it("una sección Ideas vacía se rellena sin perder lo que sigue", () => {
    const r = conIdea("# X\n\n## Ideas\n\n## Fuentes\n\n- f\n", "una");
    expect(r).toBe("# X\n\n## Ideas\n\n- una\n\n## Fuentes\n\n- f\n");
  });
});

describe("nombres seguros para fichas y carpetas", () => {
  it("rechaza puntos, finales en punto o espacio, reservados de Windows y arranques que rompen el YAML", () => {
    for (const malo of ["..", "...", "Ana.", "Ana ", "CON", "nul.txt", "COM1", "*Ana", "&x", "!x", "{x}", "- x", "> x"]) {
      expect(nombreMundoValido(malo), malo).toBe(false);
    }
    for (const bueno of ["Ana", "El Alcalde", "Telmo-2", "Ánima", "Condesa"]) {
      expect(nombreMundoValido(bueno), bueno).toBe(true);
    }
  });

  it("subcarpetas con componentes de solo puntos no valen", () => {
    expect(subcarpetaValida("a/.../b")).toBe(false);
    expect(subcarpetaValida("a/b ")).toBe(false);
    expect(subcarpetaValida("Casa/Norte")).toBe(true);
  });
});
