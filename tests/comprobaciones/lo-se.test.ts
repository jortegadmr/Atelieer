import { describe, expect, it } from "vitest";
import { comprobar } from "../../src/lib/comprobaciones";
import { Constructor } from "../fixtures/constructor";

describe("«Lo sé» (spec 6.2)", () => {
  it("silencia el aviso solo en esa pieza", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const e1 = b.evento({ episodio: t.eps[0], avisos_silenciados: ["C08"] });
    const e2 = b.evento({ episodio: t.eps[0] });
    const r = comprobar(b.modelo());
    expect(r.avisos.filter((a) => a.id === "C08").map((a) => a.pieza)).toEqual([e2]);
    expect(r.silenciados.filter((a) => a.id === "C08").map((a) => a.pieza)).toEqual([e1]);
  });

  it("silenciar C01 silencia sus tres variantes en esa pieza", () => {
    const b = new Constructor();
    const t = b.temporada({ carga: ["+", "-"] }, 0);
    b.episodio(t.id, { carga: ["-", "-"], avisos_silenciados: ["C01"] });
    expect(comprobar(b.modelo()).avisos.filter((a) => a.id.startsWith("C01") && a.pieza !== t.id)).toEqual([]);
  });

  it("cada aviso dice pieza, mensaje, fuente y clase", () => {
    const b = new Constructor();
    const t = b.temporada({ carga: ["+", "+"] }, 2);
    b.arco({ tipo_trama: "A" });
    b.evento({ episodio: t.eps[0] });
    const r = comprobar(b.modelo());
    expect(r.avisos.length).toBeGreaterThan(2);
    for (const a of r.avisos) {
      expect(a.pieza).toBeTruthy();
      expect(a.mensaje).toBeTruthy();
      expect(a.fuente).toBeTruthy();
      expect(["aviso", "sugerencia"]).toContain(a.clase);
    }
  });
});
