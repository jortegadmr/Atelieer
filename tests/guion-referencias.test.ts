import { describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { agrupar, candidatas, construir, partir, resolver, unir, type Ref } from "../src/lib/guion/referencias";
import { Wiki, type Ficha } from "../src/lib/wiki/fichas";
import { APPDATOS, VAULT, vaultDePrueba } from "./fixtures/wiki";

const ref = (texto: string): Ref => partir(texto).find((s): s is Ref => s.t === "ref")!;
const ficha = (nombre: string, ruta: string, aliases: string[] = []): Ficha => ({ nombre, tipo: "personaje", ruta, aliases, resumen: "", detalle: "", motor: { quiere: "", necesita: "", herida: "", mentira: "" } });

describe("Referencias del guion (spec 013, T3)", () => {
  it("[[Vera]], con alias y con ruta: ida y vuelta idéntica", () => {
    const t = "Entra [[Vera]] y [[Vera|la Gaviota]] con [[01_Wiki/Personajes/Vera|Vera]].\n[[Hugo]]";
    const s = partir(t);
    expect(unir(s)).toBe(t);
    const refs = s.filter((x): x is Ref => x.t === "ref");
    expect(refs.map((r) => [r.nombre, r.alias, r.ruta])).toEqual([
      ["Vera", undefined, undefined],
      ["Vera", "la Gaviota", undefined],
      ["Vera", "Vera", "01_Wiki/Personajes/Vera"],
      ["Hugo", undefined, undefined],
    ]);
  });

  it("[[ sin cerrar, vacío o con salto de línea es texto", () => {
    for (const t of ["abre [[Vera y sigue", "vacío [[]] aquí", "salto [[Ma\nra]] fin", "[[ ]]", "[[a[[b]]"]) expect(unir(partir(t))).toBe(t);
    expect(partir("abre [[Vera y sigue").every((s) => s.t === "texto")).toBe(true);
    expect(partir("salto [[Ma\nra]] fin").every((s) => s.t === "texto")).toBe(true);
    expect(partir("[[a[[b]]").some((s) => s.t === "ref" && s.nombre === "b")).toBe(true);
  });

  it("un enlace con encabezado [[Vera#Motor]] apunta a Vera", () => {
    expect(ref("[[Vera#Motor]]").nombre).toBe("Vera");
  });

  it("[[../../x]] no resuelve a nada ni arma una ruta", () => {
    const fichas = [ficha("Vera", "01_Wiki/Personajes/Vera.md")];
    expect(resolver(ref("[[../../secreto/x]]"), fichas)).toBeNull();
    expect(resolver(ref("[[C:\\Windows\\system32]]"), fichas)).toBeNull();
    // una ruta con «..» no apunta a nada, aunque el nombre exista
    expect(candidatas(ref("[[../../01_Wiki/Personajes/Vera]]"), fichas)).toEqual([]);
    expect(candidatas(ref("[[./Vera]]"), fichas)).toEqual([]);
  });

  it("dos fichas con el mismo nombre: ambigua sin ruta, una con ruta", () => {
    const a = ficha("Vera", "01_Wiki/Personajes/Vera.md");
    const b = ficha("Vera", "01_Wiki/Lugares/Vera.md");
    expect(resolver(ref("[[Vera]]"), [a, b])).toBeNull();
    expect(candidatas(ref("[[Vera]]"), [a, b]).length).toBe(2);
    expect(resolver(ref("[[01_Wiki/Lugares/Vera|Vera]]"), [a, b])).toBe(b);
    expect(construir(b, [a, b])).toBe("[[01_Wiki/Lugares/Vera|Vera]]");
    expect(construir(a, [a])).toBe("[[Vera]]");
    expect(construir(a, [a], "la Gaviota")).toBe("[[Vera|la Gaviota]]");
  });

  it("sin ficha → null y el texto no cambia; una ficha nueva con ese nombre la resuelve", () => {
    const r = ref("[[Hugo]]");
    expect(resolver(r, [])).toBeNull();
    expect(unir(partir("[[Hugo]]"))).toBe("[[Hugo]]");
    const nueva = ficha("Hugo", "01_Wiki/Personajes/Hugo.md");
    expect(resolver(r, [nueva])).toBe(nueva);
  });

  it("resuelve por alias, sin tildes ni mayúsculas", () => {
    const f = ficha("Vera Soler", "01_Wiki/Personajes/Vera.md", ["La Gaviota"]);
    expect(resolver(ref("[[la gaviota]]"), [f])).toBe(f);
    expect(resolver(ref("[[VERA SOLER]]"), [f])).toBe(f);
  });

  it("agrupar quita (V.O.), (O.S.), (CONT'D), tildes y caja", () => {
    for (const n of ["VERA", "Vera", "VERA (V.O.)", "VERA (O.S.)", "vera (CONT'D)", "VERA (V.O.) (CONT'D)", "[[Vera]]"]) expect(agrupar(n)).toBe("vera");
    expect(agrupar("SOLER")).toBe("soler");
    expect(agrupar("Vera Soler (V.O.)")).toBe("vera soler");
  });
});

describe("Wiki.listar y lo que ofrece se resuelve luego (spec 013, T3)", () => {
  async function wiki() {
    const fs = await vaultDePrueba();
    const d = await new Almacen(fs, APPDATOS).abrirSerie("_prueba");
    const w = new Wiki(fs, VAULT, d.serie.wiki);
    await w.cargar();
    return w;
  }

  it("con consulta vacía da las primeras; con texto filtra por «contiene» sin tildes", async () => {
    const w = await wiki();
    expect(w.listar(["personaje", "lugar", "era"], "", 100).length).toBeGreaterThan(5);
    expect(w.listar(["personaje"], "", 2).length).toBe(2);
    expect(w.listar(["personaje"], "SA").map((f) => f.nombre)).toContain("Sabela");
    expect(w.listar(["personaje"], "sa").map((f) => f.nombre)).not.toContain("Telmo");
    expect(w.listar(["lugar"], "torre")[0]!.nombre).toBe("Torre de la emisora");
    expect(w.listar(["personaje"], "zzz")).toEqual([]);
  });

  it("las que empiezan por el texto van primero", async () => {
    const w = await wiki();
    expect(w.listar(["personaje"], "t")[0]!.nombre).toBe("Telmo");
  });

  it("lo que ofrece el selector se resuelve después", async () => {
    const w = await wiki();
    const fichas = [...w.de("personaje"), ...w.de("lugar"), ...w.de("era")];
    for (const f of w.listar(["personaje", "lugar", "era"], "", 100)) {
      const texto = construir(f, fichas);
      expect(resolver(ref(texto), fichas)?.ruta).toBe(f.ruta);
    }
  });
});
