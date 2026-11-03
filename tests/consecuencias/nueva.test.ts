import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { comprobar } from "../../src/lib/comprobaciones";
import { simularNueva, type SimulacionNueva } from "../../src/lib/consecuencias/nueva";
import { GUIA_INICIAL } from "../../src/lib/guia/guia-inicial";
import { leerGuia } from "../../src/lib/guia/guia-md";
import { AVISO_CANON } from "../../src/lib/vistas/crear";
import type { Nivel } from "../../src/lib/vistas/visor";
import { abrir, serieBasica } from "./ayuda";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 21, 10, 0));
});
afterEach(() => vi.useRealTimers());

const guia = leerGuia(GUIA_INICIAL);
const nunca = () => false;

function hecha(r: SimulacionNueva) {
  if ("error" in r) throw new Error(r.error);
  return r;
}

describe("«Si la creas así…» (spec 005, RF-30 a RF-32)", () => {
  it("una escena en un acto: dónde aparece y las escenas que se renumeran", () => {
    const { b, t, e1, s2, s3 } = serieBasica();
    const m = b.modelo();
    const nivel: Nivel = { tipo: "episodio", temporada: t, episodio: e1 };
    const r = hecha(simularNueva(m, nivel, "evento", { titulo: "Nueva", acto: "1" }, nunca, guia));
    expect(r.donde).toBe("T01E01, acto Inicio, escena 1");
    const f = new Map(r.afectadas.map((a) => [a.id, a.frases]));
    expect(f.get(e1)).toContain("3 → 4 escenas");
    expect(f.get(s2)).toEqual(["Escena 2 → 3"]);
    expect(f.get(s3)).toEqual(["Escena 3 → 4"]);
    // Sin acto, al final
    expect(hecha(simularNueva(m, nivel, "evento", { titulo: "Otra" }, nunca, guia)).donde).toBe("T01E01, sin acto, escena 4");
  });

  it("dónde, por tipo: episodio, temporada, trama de serie y de temporada, secreto", () => {
    const { b, t } = serieBasica();
    const m = b.modelo();
    const serie: Nivel = { tipo: "serie" };
    const temporada: Nivel = { tipo: "temporada", temporada: t };
    expect(hecha(simularNueva(m, temporada, "episodio", {}, nunca, guia)).donde).toBe("Episodio 3 de T01");
    expect(hecha(simularNueva(m, serie, "temporada", {}, nunca, guia)).donde).toBe("T02, al final");
    expect(hecha(simularNueva(m, serie, "trama", {}, nunca, guia)).donde).toBe("Trama de la serie");
    expect(hecha(simularNueva(m, temporada, "trama-temporada", {}, nunca, guia)).donde).toBe("Trama de T01");
    expect(hecha(simularNueva(m, serie, "secreto", {}, nunca, guia)).donde).toBe("Secreto de la serie");
    const ep = hecha(simularNueva(m, temporada, "episodio", {}, nunca, guia));
    expect(new Map(ep.afectadas.map((a) => [a.id, a.frases])).get(t)).toEqual(["2 → 3 episodios"]);
  });

  it("los avisos que saltarán, primero los de la nueva y con sus reglas", () => {
    const { b } = serieBasica();
    const m = b.modelo();
    const r = hecha(simularNueva(m, { tipo: "serie" }, "trama", { titulo: "La cinta", tipoArco: "trama" }, nunca, guia));
    const c03 = r.avisos.find((x) => x.aviso.id === "C03");
    expect(c03).toBeDefined();
    expect(c03!.deOtra).toBe(false);
    expect(c03!.reglas.map((x) => x.id)).toEqual(["G07", "G08", "G10"]);
    expect(r.avisos[0].deOtra).toBe(false);
  });

  it("no toca el modelo ni el disco", async () => {
    const { b, t, e1 } = serieBasica();
    const x = await abrir(b);
    await x.s.guardado.vaciar();
    const escrito: string[] = [];
    x.fs.alOperar = (op, ruta) => {
      if (op !== "leer" && op !== "listar") escrito.push(`${op} ${ruta}`);
    };
    const antes = JSON.stringify([...x.s.modelo.todas()]);
    const version = x.s.modelo.version;
    const nivel: Nivel = { tipo: "episodio", temporada: t, episodio: e1 };
    hecha(simularNueva(x.s.modelo, nivel, "evento", { titulo: "Nueva", acto: "2" }, nunca, guia, x.s.resultado()));
    hecha(simularNueva(x.s.modelo, { tipo: "temporada", temporada: t }, "episodio", {}, nunca, guia));
    await vi.advanceTimersByTimeAsync(2000);
    expect(JSON.stringify([...x.s.modelo.todas()])).toBe(antes);
    expect(x.s.modelo.version).toBe(version);
    expect(escrito).toEqual([]);
    x.fs.alOperar = null;
    await x.s.cerrar();
  });

  it("si no se puede crear así, dice por qué con el texto que impide Crear", () => {
    const { b, t, e1 } = serieBasica();
    const m = b.modelo();
    const r = simularNueva(m, { tipo: "episodio", temporada: t, episodio: e1 }, "evento", {}, (id) => id === e1, guia);
    expect(r).toEqual({ error: AVISO_CANON });
    expect(simularNueva(m, { tipo: "serie" }, "episodio", {}, nunca, guia)).toEqual({ error: "Para crear un episodio hace falta estar en su nivel." });
    expect(simularNueva(m, { tipo: "serie" }, "evento", {}, nunca, guia, comprobar(m))).toEqual({ error: "Para crear una escena hace falta estar en un episodio." });
  });
});
