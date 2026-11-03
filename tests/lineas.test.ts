import { describe, expect, it } from "vitest";
import { lineasTemporada } from "../src/lib/vistas/lineas";
import { Constructor } from "./fixtures/constructor";

describe("líneas de arcos de una temporada (T4.3)", () => {
  function serie() {
    const b = new Constructor();
    const t1 = b.temporada({}, 4);
    const t2 = b.temporada({}, 4);
    const ven = b.arco({ titulo: "El eco" });
    const amo = b.arco({ titulo: "Amor", nivel: "temporada", temporada: t1.id, tipo_trama: "C" });
    const des = b.arco({ titulo: "Descartado", madurez: "descartado" });
    b.evento({ episodio: t1.eps[1], arcos: [[ven, "abre"], [amo, "abre"], [des, "abre"]] });
    b.evento({ episodio: t1.eps[2], arcos: [[amo, "cierra"]] });
    b.evento({ episodio: t2.eps[1], arcos: [[ven, "cierra"]] });
    return { b, t1, t2, ven, amo, m: b.modelo() };
  }

  it("un arco que cierra en la temporada va de su primer evento al que cierra", () => {
    const { m, t1, amo } = serie();
    const l = lineasTemporada(m, t1.id).find((x) => x.arco.id === amo)!;
    expect([l.desde, l.hasta, l.sigue]).toEqual([1, 2, null]);
    expect(l.paradas.map((p) => [p.i, p.papel])).toEqual([[1, "abre"], [2, "cierra"]]);
  });

  it("un arco que sigue a la temporada siguiente llega al final con '→ T02'", () => {
    const { m, t1, ven } = serie();
    const l = lineasTemporada(m, t1.id).find((x) => x.arco.id === ven)!;
    expect([l.desde, l.hasta, l.sigue]).toEqual([1, 4, "T02"]);
  });

  it("un arco que viene de antes empieza en el borde", () => {
    const { m, t2, ven } = serie();
    const l = lineasTemporada(m, t2.id).find((x) => x.arco.id === ven)!;
    expect([l.desde, l.hasta, l.sigue]).toEqual([-1, 1, null]);
  });

  it("sin cierre y sin temporada siguiente: 'sin cierre'; los descartados salen al final", () => {
    const { b, t2 } = serie();
    const solo = b.arco({ titulo: "Solo" });
    b.evento({ episodio: t2.eps[0], arcos: [[solo, "abre"]] });
    const ls = lineasTemporada(b.modelo(), t2.id);
    expect(ls.find((x) => x.arco.id === solo)!.sigue).toBe("sin cierre");
    expect(ls.at(-1)!.arco.titulo).toBe("Descartado");
  });
});
