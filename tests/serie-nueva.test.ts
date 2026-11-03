import { describe, expect, it } from "vitest";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { crearCarpetasWiki, prepararVaultNueva, recorrido, rutaRelativaSegura } from "../src/lib/app/serie-nueva";
import { Constructor } from "./fixtures/constructor";

const rutas = { raiz: "Serie/01_Wiki", personajes: "Serie/01_Wiki/Personajes", lugares: "Serie/01_Wiki/Lugares", eras: "Serie/01_Wiki/Eras", timeline: "", narrativa: "", log: "" };

describe("vault nueva", () => {
  it("prepara una carpeta que no existe con .obsidian y appDatos", async () => {
    const fs = new FsMemoria();
    const r = await prepararVaultNueva(fs, "C:/Vaults/Nueva");
    expect(r).toEqual({ ok: true, vault: "C:/Vaults/Nueva", raiz: "C:/Vaults/Nueva/appDatos" });
    expect(await fs.existe("C:/Vaults/Nueva/.obsidian")).toBe(true);
    expect(await fs.existe("C:/Vaults/Nueva/appDatos")).toBe(true);
  });

  it("no toca una carpeta que ya tiene cosas", async () => {
    const fs = new FsMemoria();
    await fs.escribir("C:/Mis/notas.md", "hola");
    const r = await prepararVaultNueva(fs, "C:/Mis");
    expect(r.ok).toBe(false);
    expect(await fs.existe("C:/Mis/appDatos")).toBe(false);
    expect(await fs.leer("C:/Mis/notas.md")).toBe("hola");
  });

  it("acepta una carpeta vacía que ya existe", async () => {
    const fs = new FsMemoria();
    await fs.crearDir("C:/Vacia");
    expect((await prepararVaultNueva(fs, "C:/Vacia/")).ok).toBe(true);
  });
});

describe("carpetas de la wiki", () => {
  it("crea la raíz y cada categoría, y no pisa lo que ya está", async () => {
    const fs = new FsMemoria();
    await fs.escribir("V/Serie/01_Wiki/Personajes/Telmo.md", "ficha");
    const creadas = await crearCarpetasWiki(fs, "V", rutas);
    expect(creadas).not.toContain("Serie/01_Wiki/Personajes");
    expect(creadas).toContain("Serie/01_Wiki/Glosario");
    expect(creadas).toContain("Serie/01_Wiki/Lugares");
    expect(await fs.leer("V/Serie/01_Wiki/Personajes/Telmo.md")).toBe("ficha");
    expect(await crearCarpetasWiki(fs, "V", rutas)).toEqual([]);
  });
});

describe("recorrido guiado", () => {
  it("una serie vacía empieza por la premisa y nada es obligatorio", () => {
    const b = new Constructor();
    const r = recorrido(b.modelo(), { personajes: 0, lugares: 0, conGuion: 0 });
    expect(r.hechos).toBe(0);
    expect(r.siguiente?.id).toBe("premisa");
    expect(r.pasos.map((p) => p.id)).toEqual(["premisa", "personajes", "lugares", "arcos", "temporadas", "episodios", "escenas", "guion"]);
  });

  it("avanza según lo que hay y sugiere el primer hueco, aunque se haya saltado alguno", () => {
    const b = new Constructor();
    b.serie.premisa = "Un técnico vuelve a su pueblo.";
    b.arco({});
    b.temporada({}, 1);
    const r = recorrido(b.modelo(), { personajes: 0, lugares: 2, conGuion: 0 });
    const hecho = Object.fromEntries(r.pasos.map((p) => [p.id, p.hecho]));
    expect(hecho).toMatchObject({ premisa: true, personajes: false, lugares: true, arcos: true, temporadas: true, episodios: true, escenas: false, guion: false });
    expect(r.siguiente?.id).toBe("personajes");
  });

  it("un [PENDIENTE] no cuenta como premisa; los descartados no cuentan", () => {
    const b = new Constructor();
    b.serie.premisa = "[PENDIENTE]";
    b.arco({ madurez: "descartado" });
    const r = recorrido(b.modelo(), { personajes: 1, lugares: 1, conGuion: 1 });
    expect(r.pasos.find((p) => p.id === "premisa")!.hecho).toBe(false);
    expect(r.pasos.find((p) => p.id === "arcos")!.hecho).toBe(false);
  });

  it("todo hecho no deja siguiente", () => {
    const b = new Constructor();
    b.serie.premisa = "x";
    b.arco({});
    const t = b.temporada({}, 1);
    b.evento({ episodio: t.eps[0] });
    expect(recorrido(b.modelo(), { personajes: 1, lugares: 1, conGuion: 1 }).siguiente).toBeNull();
  });
});

describe("rutas y vaults seguras", () => {
  it("la wiki no puede salirse de la vault", async () => {
    const fs = new FsMemoria();
    await expect(crearCarpetasWiki(fs, "V", { ...rutas, raiz: "../../x" })).rejects.toThrow(/no vale/);
    await expect(crearCarpetasWiki(fs, "V", { ...rutas, raiz: "C:/fuera" })).rejects.toThrow(/no vale/);
    expect(rutaRelativaSegura("Serie/01_Wiki")).toBe(true);
    for (const mala of ["..", "a/../b", "/abs", "C:\\x", "a//b", "a/...", ""]) expect(rutaRelativaSegura(mala), mala).toBe(false);
  });

  it("no crea una vault dentro de la de ahora ni que la contenga", async () => {
    const fs = new FsMemoria();
    const actual = "C:/Vault/appDatos";
    for (const c of ["C:/Vault", "C:/Vault/Nueva", "C:/Vault/appDatos/x", "C:"]) {
      expect((await prepararVaultNueva(fs, c, actual)).ok, c).toBe(false);
    }
    expect((await prepararVaultNueva(fs, "C:/Otra", actual)).ok).toBe(true);
    expect((await prepararVaultNueva(fs, "C:/x/../y")).ok).toBe(false);
  });
});
