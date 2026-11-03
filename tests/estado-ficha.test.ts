import { describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import type { Fs } from "../src/lib/almacen/fs";
import { Modelo } from "../src/lib/modelo/modelo";
import { cambiarEstadoCanon, ponerEstadoFicha, rutaFicha } from "../src/lib/wiki/estado-ficha";
import { pasarAWiki } from "../src/lib/wiki/pasar";
import { APPDATOS, VAULT, vaultDePrueba } from "./fixtures/wiki";

// Spec 001: la ficha de la wiki sigue el estado de su pieza. Solo se toca la
// línea estado_canon; nunca se escribe fuera de la narrativa de la serie.

const OP = { fecha: "2026-10-20", carpetaSerie: "appDatos/_prueba" };

async function pasada() {
  const fs = await vaultDePrueba();
  const m = new Modelo(await new Almacen(fs, APPDATOS).abrirSerie("_prueba"));
  const r = await pasarAWiki(fs, VAULT, m, "te-t001", OP);
  m.poner(r.pieza!);
  const pieza = m.temporadas.get("te-t001")!;
  return { fs, m, pieza, abs: `${VAULT}/${r.ruta}`, rutas: m.serie.wiki };
}

describe("cambiar solo estado_canon (RF-26)", () => {
  const ficha = [
    "---",
    "tipo: temporada",
    'estado_canon: "borrador"  # lo puso el autor',
    "personajes:",
    "  - \"[[Telmo]]\"",
    "---",
    "# T01",
    "",
    "estado_canon: esto es texto, no se toca",
    "",
  ].join("\n");

  it("cambia solo esa línea y conserva comillas, comentario, el resto de propiedades y el texto", () => {
    const nuevo = cambiarEstadoCanon(ficha, "canon");
    expect(nuevo).toBe(ficha.replace('estado_canon: "borrador"  # lo puso el autor', 'estado_canon: "canon"  # lo puso el autor'));
  });

  it("si no tiene la línea, la añade al final de las propiedades", () => {
    const sin = "---\ntipo: arco\n---\nTexto\n";
    expect(cambiarEstadoCanon(sin, "descartado")).toBe("---\ntipo: arco\nestado_canon: descartado\n---\nTexto\n");
  });

  it("si no tiene propiedades, las crea", () => {
    expect(cambiarEstadoCanon("# Solo texto\n", "idea")).toBe("---\nestado_canon: idea\n---\n# Solo texto\n");
  });

  it("respeta los finales de línea de Windows", () => {
    const crlf = "---\r\ntipo: arco\r\nestado_canon: borrador\r\n---\r\nTexto\r\n";
    expect(cambiarEstadoCanon(crlf, "canon")).toBe("---\r\ntipo: arco\r\nestado_canon: canon\r\n---\r\nTexto\r\n");
  });

  it("no toca una clave sangrada que se llame igual", () => {
    const anidada = "---\ntipo: arco\notro:\n  estado_canon: x\n---\n";
    expect(cambiarEstadoCanon(anidada, "canon")).toBe("---\ntipo: arco\notro:\n  estado_canon: x\nestado_canon: canon\n---\n");
  });
});

describe("dónde está la ficha (RF-33)", () => {
  const rutas = { raiz: "W", personajes: "", lugares: "", eras: "", timeline: "", narrativa: "W/01_Narrativa", log: "W/Log.md" };

  it("dentro de la carpeta de narrativa, en la de su tipo", () => {
    expect(rutaFicha(rutas, { tipo: "arco", wiki: "[[Amistad rota]]" })).toBe("W/01_Narrativa/Arcos/Amistad rota.md");
  });

  it("un enlace que intenta salir de la wiki no vale", () => {
    for (const wiki of ["[[../../secretos]]", "[[..]]", "[[Arcos/../../x]]", "[[C:\\x]]", "[[/etc/x]]", "[[ ]]"]) {
      expect(rutaFicha(rutas, { tipo: "arco", wiki }), wiki).toBeNull();
    }
  });

  it("sin carpeta de narrativa configurada, no hay ficha", () => {
    expect(rutaFicha({ ...rutas, narrativa: "" }, { tipo: "arco", wiki: "[[X]]" })).toBeNull();
  });
});

describe("poner el estado en la ficha (RF-25, RF-27)", () => {
  it("cambia el estado de la ficha y lo apunta en el Log", async () => {
    const { fs, pieza, abs, rutas } = await pasada();
    const r = await ponerEstadoFicha(fs, VAULT, rutas, pieza, "canon", { fecha: "2026-10-21" });
    expect(r.ok).toBe(true);
    expect(await fs.leer(abs)).toContain("estado_canon: canon");
    const log = await fs.leer(`${VAULT}/${rutas.log}`);
    expect(log).toContain("## [2026-10-21] atelier | Estado de [[T01 - Cerrar la emisora]]: canon");
  });

  it("devuelve la nueva fecha de la ficha, para no marcarla como «cambió en la wiki»", async () => {
    const { fs, pieza, abs, rutas } = await pasada();
    const r = await ponerEstadoFicha(fs, VAULT, rutas, pieza, "descartado", { fecha: "2026-10-21" });
    expect(r.ok && r.mtime).toBe(new Date((await fs.fecha(abs))!).toISOString());
  });

  it("si la ficha ya no está, no la recrea y lo dice", async () => {
    const { fs, pieza, abs, rutas } = await pasada();
    await fs.borrar(abs);
    const r = await ponerEstadoFicha(fs, VAULT, rutas, pieza, "canon", { fecha: "2026-10-21" });
    expect(r).toMatchObject({ ok: false, motivo: "no está" });
    expect(await fs.existe(abs)).toBe(false);
  });

  it("si la ficha cambia mientras tanto, no escribe y lo dice", async () => {
    const { fs, pieza, abs, rutas } = await pasada();
    const original = await fs.leer(abs);
    fs.reloj = () => Date.now() + 10_000;
    const entrometido: Fs = Object.assign(Object.create(Object.getPrototypeOf(fs)), fs, {
      leer: async (ruta: string) => {
        const t = await fs.leer(ruta);
        if (ruta === abs) await fs.cambiarDesdeFuera(abs, `${t}\nAñadido en Obsidian\n`);
        return t;
      },
    });
    const r = await ponerEstadoFicha(entrometido, VAULT, rutas, pieza, "canon", { fecha: "2026-10-21" });
    expect(r).toMatchObject({ ok: false, motivo: "cambió mientras tanto" });
    expect(await fs.leer(abs)).toBe(`${original}\nAñadido en Obsidian\n`);
  });

  it("con un enlace que sale de la wiki no toca ninguna nota", async () => {
    const { fs, pieza, rutas } = await pasada();
    const antes = fs.rutas().map((r) => [r, fs.rutas().length]);
    const r = await ponerEstadoFicha(fs, VAULT, rutas, { ...pieza, wiki: "[[../../../appDatos/guia]]" }, "canon", { fecha: "2026-10-21" });
    expect(r).toMatchObject({ ok: false, motivo: "enlace no válido" });
    expect(fs.rutas().map((x) => [x, fs.rutas().length])).toEqual(antes);
  });

  it("si ya tenía ese estado, no escribe ni apunta nada", async () => {
    const { fs, pieza, rutas } = await pasada();
    const log = await fs.leer(`${VAULT}/${rutas.log}`);
    const r = await ponerEstadoFicha(fs, VAULT, rutas, pieza, "borrador", { fecha: "2026-10-21" });
    expect(r.ok).toBe(true);
    expect(await fs.leer(`${VAULT}/${rutas.log}`)).toBe(log);
  });
});
