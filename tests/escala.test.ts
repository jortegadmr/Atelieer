import { describe, expect, it } from "vitest";
import { escalaSerie } from "../src/lib/vistas/escala";
import { Constructor } from "./fixtures/constructor";

describe("escala de la vista Serie (T2.3)", () => {
  it("cada temporada ocupa sus episodios; una prevista sin episodios, los previstos o la media", () => {
    const b = new Constructor();
    const t1 = b.temporada({}, 8);
    const t2 = b.temporada({}, 6);
    const t3 = b.temporada({ estado: "prevista" });
    const t4 = b.temporada({ estado: "prevista", episodios_previstos: 10 });
    const e = escalaSerie(b.modelo());
    expect(e.temporadas.map((t) => [t.t.id, t.desde, t.ancho])).toEqual([
      [t1.id, 0, 8],
      [t2.id, 8, 6],
      [t3.id, 14, 7],
      [t4.id, 21, 10],
    ]);
    expect(e.total).toBe(31);
  });

  it("sin ninguna temporada con episodios, cada una cuenta 8", () => {
    const b = new Constructor();
    b.temporada({ estado: "prevista" });
    expect(escalaSerie(b.modelo()).total).toBe(8);
  });

  it("posiciones: un episodio es su centro; una temporada sola, su centro, su inicio o su fin", () => {
    const b = new Constructor();
    const t1 = b.temporada({}, 4);
    const t2 = b.temporada({}, 4);
    const e = escalaSerie(b.modelo());
    expect(e.x({ temporada: t1.id, episodio: t1.eps[2] })).toBe(2.5);
    expect(e.x({ temporada: t2.id, episodio: "" })).toBe(6);
    expect(e.x({ temporada: t2.id, episodio: "" }, "inicio")).toBe(4);
    expect(e.x({ temporada: t2.id, episodio: "" }, "fin")).toBe(8);
    expect(e.x({ temporada: "", episodio: "" })).toBeNull();
    expect(e.pct(2)).toBe(25);
  });
});
