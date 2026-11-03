import { describe, expect, it } from "vitest";
import { c08, c09, c10, c11, c12, c13 } from "../../src/lib/comprobaciones";
import { nOlvido } from "../../src/lib/comprobaciones/olvido";
import { Constructor } from "../fixtures/constructor";
import { resumen } from "./ayuda";

describe("C08 · evento que no marca ninguna casilla del test de relleno (§25)", () => {
  it("dispara sin casillas", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const e = b.evento({ episodio: t.eps[0], relleno: { avanza: false, revela: false } });
    expect(resumen(c08(b.modelo()))).toEqual([["C08", e, "aviso"]]);
  });

  it("no dispara si revela; los descartados no se comprueban", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    b.evento({ episodio: t.eps[0], relleno: { avanza: false, revela: true } });
    b.evento({ episodio: t.eps[0], madurez: "descartado" });
    expect(c08(b.modelo())).toEqual([]);
  });
});

describe("C09 · evento sin microconflicto (§10)", () => {
  it("sugerencia sin gana ni pierde", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const e = b.evento({ episodio: t.eps[0] });
    expect(resumen(c09(b.modelo()))).toEqual([["C09", e, "sugerencia"]]);
  });

  it("no dispara con uno de los dos", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    b.evento({ episodio: t.eps[0], pierde: "Tiempo" });
    expect(c09(b.modelo())).toEqual([]);
  });
});

describe("C10 · arco de temporada sin cerrar al acabar su temporada (§12)", () => {
  it("dispara en un tramo de T1 sin evento que lo cierre en T1", () => {
    const b = new Constructor();
    const t = b.temporada({}, 5);
    const a = b.arco({ nivel: "temporada", temporada: t.id });
    b.evento({ episodio: t.eps[0], arcos: [[a, "abre"]] });
    expect(resumen(c10(b.modelo()))).toEqual([["C10", a, "aviso"]]);
  });

  it("no dispara si cierra en T1E05, ni sin eventos con fin manual dentro de T1", () => {
    const b = new Constructor();
    const t = b.temporada({}, 5);
    const a = b.arco({ nivel: "temporada", temporada: t.id });
    b.evento({ episodio: t.eps[0], arcos: [[a, "abre"]] });
    b.evento({ episodio: t.eps[4], arcos: [[a, "cierra"]] });
    b.arco({ nivel: "temporada", temporada: t.id, fin: { temporada: t.id, episodio: t.eps[3] } });
    expect(c10(b.modelo())).toEqual([]);
  });
});

describe("C11 · arco olvidado (§25, D5)", () => {
  it("N = un tercio de los episodios, hacia arriba, nunca menos de 2", () => {
    expect(nOlvido(8, 0.3334)).toBe(3);
    expect(nOlvido(10, 0.3334)).toBe(4);
    expect(nOlvido(6, 0.3334)).toBe(2);
    expect(nOlvido(3, 0.3334)).toBe(2);
  });

  it("dispara en una temporada de 8 (N = 3) con eventos en E01 y E06 (4 vacíos)", () => {
    const b = new Constructor();
    const t = b.temporada({}, 8);
    const a = b.arco();
    b.evento({ episodio: t.eps[0], arcos: [[a, "abre"]] });
    b.evento({ episodio: t.eps[5], arcos: [[a, "cierra"]] });
    expect(resumen(c11(b.modelo()))).toEqual([["C11", a, "sugerencia"]]);
  });

  it("no dispara con E01 y E05 (3 vacíos) ni por los huecos después de su cierre", () => {
    const b = new Constructor();
    const t = b.temporada({}, 8);
    const a = b.arco();
    b.evento({ episodio: t.eps[0], arcos: [[a, "abre"]] });
    b.evento({ episodio: t.eps[4], arcos: [[a, "cierra"]] });
    expect(c11(b.modelo())).toEqual([]);
  });

  it("sin cierre, el hueco hasta el final cuenta, pero no los episodios que aún no tienen ningún evento", () => {
    const b = new Constructor();
    const t1 = b.temporada({}, 8);
    b.temporada({}, 8);
    const a = b.arco();
    const otro = b.arco();
    b.evento({ episodio: t1.eps[0], arcos: [[a, "abre"]] });
    b.evento({ episodio: t1.eps[3], arcos: [[a, "avanza"]] });
    b.evento({ episodio: t1.eps[7], arcos: [[otro, "abre"]] });
    // a: E05-E08 vacíos (4 > 3) dispara; T2 entera está sin escribir y no cuenta
    expect(c11(b.modelo()).map((x) => x.pieza)).toEqual([a]);
    expect(c11(b.modelo())[0].mensaje).toMatch(/4 episodios/);
  });

  it("no dispara en una temporada de 6 (N = 2) con E01 y E04", () => {
    const b = new Constructor();
    const t = b.temporada({}, 6);
    const a = b.arco();
    b.evento({ episodio: t.eps[0], arcos: [[a, "abre"]] });
    b.evento({ episodio: t.eps[3], arcos: [[a, "cierra"]] });
    expect(c11(b.modelo())).toEqual([]);
  });
});

describe("C12 · arco A de serie cerrado antes del último episodio (§12)", () => {
  it("dispara si cierra en T1E08 y existe T2 con episodios", () => {
    const b = new Constructor();
    const t1 = b.temporada({}, 8);
    b.temporada({}, 2);
    const a = b.arco({ tipo_trama: "A", nivel: "serie" });
    b.evento({ episodio: t1.eps[7], arcos: [[a, "cierra"]] });
    expect(resumen(c12(b.modelo()))).toEqual([["C12", a, "aviso"]]);
  });

  it("no dispara si cierra en el último episodio existente", () => {
    const b = new Constructor();
    b.temporada({}, 8);
    const t2 = b.temporada({}, 2);
    b.temporada({ estado: "prevista" });
    const a = b.arco({ tipo_trama: "A", nivel: "serie" });
    b.evento({ episodio: t2.eps[1], arcos: [[a, "cierra"]] });
    expect(c12(b.modelo())).toEqual([]);
  });
});

describe("C13 · inicio o fin manual que no coincide con los eventos (spec 4.4)", () => {
  it("dispara con inicio manual T1E03 y un evento que abre en T1E01", () => {
    const b = new Constructor();
    const t = b.temporada({}, 5);
    const a = b.arco();
    b.arcos[0].inicio = { temporada: t.id, episodio: t.eps[2] };
    b.evento({ episodio: t.eps[0], arcos: [[a, "abre"]] });
    expect(resumen(c13(b.modelo()))).toEqual([["C13", a, "aviso"]]);
  });

  it("no dispara si coinciden, si el manual dice solo la temporada, ni sin eventos que abran o cierren", () => {
    const b = new Constructor();
    const t = b.temporada({}, 5);
    const a = b.arco();
    b.arcos[0].inicio = { temporada: t.id, episodio: t.eps[0] };
    b.evento({ episodio: t.eps[0], arcos: [[a, "abre"]] });
    const x = b.arco();
    b.arcos[1].inicio = { temporada: t.id, episodio: "" };
    b.evento({ episodio: t.eps[3], arcos: [[x, "abre"]] });
    const y = b.arco();
    b.arcos[2].fin = { temporada: t.id, episodio: t.eps[4] };
    b.evento({ episodio: t.eps[1], arcos: [[y, "avanza"]] });
    expect(c13(b.modelo())).toEqual([]);
  });
});
