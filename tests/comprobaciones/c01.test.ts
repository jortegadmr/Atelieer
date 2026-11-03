import { describe, expect, it } from "vitest";
import { c01 } from "../../src/lib/comprobaciones";
import { Constructor } from "../fixtures/constructor";
import { quien } from "./ayuda";

describe("C01 · carga de temporada y episodio (§12)", () => {
  it("C01a: episodio o temporada que no cambia", () => {
    const b = new Constructor();
    const t = b.temporada({ carga: ["+", "+"] }, 0);
    const e1 = b.episodio(t.id, { carga: ["+", "+"] });
    const e2 = b.episodio(t.id, { carga: ["+", "-"] });
    const a = c01(b.modelo()).filter((x) => x.id === "C01a");
    expect(quien(a)).toEqual([["C01a", e1], ["C01a", t.id]].sort());
    expect(a.some((x) => x.pieza === e2)).toBe(false);
    expect(a.find((x) => x.pieza === e1)!.clase).toBe("aviso");
  });

  it("C01b: no encaja con la anterior, también entre temporadas", () => {
    const b = new Constructor();
    const t1 = b.temporada({ carga: ["+", "+"] }, 0);
    b.episodio(t1.id, { carga: ["-", "+"] });
    const e2 = b.episodio(t1.id, { carga: ["-", "+"] });
    const t2 = b.temporada({ carga: ["-", "+"] }, 0);
    const e3 = b.episodio(t2.id, { carga: ["-", "+"] });
    const a = c01(b.modelo()).filter((x) => x.id === "C01b");
    expect(quien(a)).toEqual([["C01b", e2], ["C01b", e3], ["C01b", t2.id]].sort());
  });

  it("C01b no dispara si empieza como acabó la anterior o falta un dato", () => {
    const b = new Constructor();
    const t = b.temporada({}, 0);
    b.episodio(t.id, { carga: ["-", "+"] });
    b.episodio(t.id, { carga: ["+", "-"] });
    b.episodio(t.id, { carga: ["", "+"] });
    expect(c01(b.modelo()).filter((x) => x.id === "C01b")).toEqual([]);
  });

  it("C01c: el primer episodio empieza como su temporada y el último acaba como ella", () => {
    const b = new Constructor();
    const t = b.temporada({ carga: ["+", "-"] }, 0);
    const e1 = b.episodio(t.id, { carga: ["-", "+"] });
    const e2 = b.episodio(t.id, { carga: ["+", "+"] });
    const a = c01(b.modelo()).filter((x) => x.id === "C01c");
    expect(quien(a)).toEqual([["C01c", e1], ["C01c", e2]].sort());
  });

  it("C01c no dispara si coinciden", () => {
    const b = new Constructor();
    const t = b.temporada({ carga: ["+", "-"] }, 0);
    b.episodio(t.id, { carga: ["+", "-"] });
    expect(c01(b.modelo()).filter((x) => x.id === "C01c")).toEqual([]);
  });
});
