import { describe, expect, it } from "vitest";
import { tramaDominante } from "../src/lib/modelo/dominante";
import { Constructor } from "./fixtures/constructor";

describe("trama dominante del episodio (D8)", () => {
  it("gana la que más eventos tiene en él", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const a = b.arco({ tipo_trama: "A" });
    const bb = b.arco({ tipo_trama: "B" });
    b.evento({ episodio: t.eps[0], arcos: [[a, "abre"]] });
    b.evento({ episodio: t.eps[0], arcos: [[bb, "abre"]] });
    b.evento({ episodio: t.eps[0], arcos: [[bb, "avanza"]] });
    expect(tramaDominante(b.modelo(), t.eps[0])).toBe(bb);
  });

  it("empate: gana la de tipo más alto (A, B, C)", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const c = b.arco({ tipo_trama: "C" });
    const bb = b.arco({ tipo_trama: "B" });
    b.evento({ episodio: t.eps[0], arcos: [[c, "abre"], [bb, "abre"]] });
    expect(tramaDominante(b.modelo(), t.eps[0])).toBe(bb);
  });

  it("si sigue el empate, gana la principal de la temporada", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const x = b.arco({ tipo_trama: "A", titulo: "Ana" });
    const y = b.arco({ tipo_trama: "A", titulo: "Zoe" });
    b.temporadas[0].principal = y;
    b.evento({ episodio: t.eps[0], arcos: [[x, "abre"], [y, "abre"]] });
    expect(tramaDominante(b.modelo(), t.eps[0])).toBe(y);
  });

  it("la fijada a mano manda", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const a = b.arco({ tipo_trama: "A" });
    const c = b.arco({ tipo_trama: "C" });
    b.episodios[0].dominante_manual = c;
    b.evento({ episodio: t.eps[0], arcos: [[a, "abre"]] });
    expect(tramaDominante(b.modelo(), t.eps[0])).toBe(c);
  });

  it("sin eventos no hay dominante; los descartados no cuentan", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const a = b.arco({ tipo_trama: "A" });
    b.evento({ episodio: t.eps[0], arcos: [[a, "abre"]], madurez: "descartado" });
    expect(tramaDominante(b.modelo(), t.eps[0])).toBe("");
  });
});
