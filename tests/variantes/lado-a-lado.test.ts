import { describe, expect, it } from "vitest";
import { comprobar } from "../../src/lib/comprobaciones";
import type { Pieza, PiezaDe } from "../../src/lib/modelo/tipos";
import { ladoALado } from "../../src/lib/variantes/lado-a-lado";
import { modeloQuedaria } from "../../src/lib/variantes/quedaria";
import { variante } from "../../src/lib/variantes/tipos";
import { serieBasica } from "../consecuencias/ayuda";

function preparar() {
  const x = serieBasica();
  const m = x.b.modelo();
  const q = modeloQuedaria(m, variante("va-aaaa", "x", ""));
  return { ...x, m, q };
}

describe("lado a lado (spec 006, RF-23)", () => {
  it("todos los campos del panel en su orden, con lo que cambia marcado", () => {
    const { m, q, s1 } = preparar();
    const p = structuredClone(q.eventos.get(s1)!) as PiezaDe<"evento">;
    p.titulo = "Nando se va";
    p.cambio = ["+", "-"];
    q.poner(p as Pieza);
    const l = ladoALado(s1, m, q, comprobar(m).avisos, comprobar(q).avisos);
    expect(l.izquierda?.titulo).toBe("Uno");
    expect(l.derecha?.titulo).toBe("Nando se va");
    expect(l.filas.length).toBeGreaterThan(5);
    const cambian = l.filas.filter((f) => f.cambia).map((f) => f.etiqueta);
    expect(cambian).toContain("Título");
    expect(l.filas.find((f) => f.etiqueta === "Título")).toMatchObject({ izquierda: "Uno", derecha: "Nando se va" });
    expect(l.filas.filter((f) => !f.cambia).every((f) => f.izquierda === f.derecha)).toBe(true);
  });

  it("la estructura de una temporada se lee: texto y código del episodio, sin separadores", () => {
    const { m, q, t, e1 } = preparar();
    const p = structuredClone(q.temporadas.get(t)!) as PiezaDe<"temporada">;
    p.estructura.detonante = { texto: "Llega la cinta", episodio: e1 };
    q.poner(p as Pieza);
    const l = ladoALado(t, m, q, [], []);
    const f = l.filas.find((x) => x.etiqueta === "Estructura (Detonante)")!;
    expect(f.cambia).toBe(true);
    expect(f.izquierda).toBe("vacío");
    expect(f.derecha).toMatch(/^Llega la cinta · \S+$/);
    expect(l.filas.every((x) => !x.izquierda.includes("\u0000") && !x.derecha.includes("\u0000"))).toBe(true);
  });

  it("una pieza que no existe en un lado deja esa columna vacía (null)", () => {
    const { m, q, s1 } = preparar();
    q.quitar(s1);
    const l = ladoALado(s1, m, q, [], []);
    expect(l.derecha).toBeNull();
    expect(l.izquierda?.titulo).toBe("Uno");
    expect(l.filas.every((f) => !f.cambia && f.derecha === "")).toBe(true);
  });

  it("los avisos de cada lado son los de esa pieza", () => {
    const { m, q, s2 } = preparar();
    q.poner({ ...structuredClone(q.eventos.get(s2)!), cambio: ["+", "+"] } as Pieza);
    const l = ladoALado(s2, m, q, comprobar(m).avisos, comprobar(q).avisos);
    expect(l.derecha!.avisos.map((a) => a.id)).toContain("C02");
    expect(l.izquierda!.avisos.map((a) => a.id)).not.toContain("C02");
    expect([...l.izquierda!.avisos, ...l.derecha!.avisos].every((a) => a.pieza === s2)).toBe(true);
  });

  it("marca los campos que cambiaron también en la serie", () => {
    const { m, q, s1 } = preparar();
    const l = ladoALado(s1, m, q, [], [], new Set(["Título"]));
    expect(l.filas.find((f) => f.etiqueta === "Título")!.enSerie).toBe(true);
  });
});
