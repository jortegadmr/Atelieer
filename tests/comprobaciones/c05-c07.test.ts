import { describe, expect, it } from "vitest";
import { c05, c06, c07 } from "../../src/lib/comprobaciones";
import { Constructor } from "../fixtures/constructor";
import { resumen } from "./ayuda";

function conPrincipal(principal: boolean) {
  const b = new Constructor();
  const t = b.temporada({}, 3);
  const ven = b.arco({ tipo_trama: "A", protagonistas: ["[[Telmo]]"] });
  if (principal) b.temporadas[0].principal = ven;
  b.evento({ episodio: t.eps[0], arcos: [[ven, "abre"]] });
  return { b, t, ven };
}

describe("C05 · subtrama con el mismo protagonista que la principal (§13, D6, D7)", () => {
  it("dispara en un B de trama con [Telmo] frente a la principal [Telmo]", () => {
    const { b, t } = conPrincipal(true);
    const sub = b.arco({ tipo_trama: "B", tipo_arco: "trama", protagonistas: ["[[Telmo]]"] });
    b.evento({ episodio: t.eps[1], arcos: [[sub, "abre"]] });
    expect(resumen(c05(b.modelo()))).toEqual([["C05", sub, "aviso"]]);
  });

  it("no dispara si no coinciden todos: [Telmo, Nando] frente a [Telmo]", () => {
    const { b, t } = conPrincipal(true);
    const sub = b.arco({ tipo_trama: "B", tipo_arco: "relacion", protagonistas: ["[[Telmo]]", "[[Nando]]"] });
    b.evento({ episodio: t.eps[1], arcos: [[sub, "abre"]] });
    expect(c05(b.modelo())).toEqual([]);
  });

  it("un tramo de la principal con el mismo protagonista NO dispara", () => {
    const { b, t, ven } = conPrincipal(true);
    const tramo = b.arco({ tipo_trama: "B", nivel: "temporada", temporada: t.id, tramo_de: ven, protagonistas: ["[[Telmo]]"] });
    b.evento({ episodio: t.eps[1], arcos: [[tramo, "abre"]] });
    expect(c05(b.modelo())).toEqual([]);
  });

  it("sin principal elegida no se comprueba", () => {
    const { b, t } = conPrincipal(false);
    const sub = b.arco({ tipo_trama: "B", protagonistas: ["[[Telmo]]"] });
    b.evento({ episodio: t.eps[1], arcos: [[sub, "abre"]] });
    expect(c05(b.modelo())).toEqual([]);
  });
});

function paraC06() {
  const b = new Constructor();
  const t1 = b.temporada({}, 8);
  const t2 = b.temporada({}, 2);
  const pri = b.arco({ tipo_trama: "A", protagonistas: ["[[Telmo]]"] });
  b.temporadas[0].principal = pri;
  const sub = b.arco({ tipo_trama: "B", protagonistas: ["[[Nando]]"] });
  return { b, t1, t2, pri, sub };
}

describe("C06 · subtrama que arranca antes que la principal o acaba después (§13)", () => {
  it("dispara si abre en E01 y la principal en E02", () => {
    const { b, t1, pri, sub } = paraC06();
    b.evento({ episodio: t1.eps[0], arcos: [[sub, "abre"]] });
    b.evento({ episodio: t1.eps[1], arcos: [[pri, "abre"]] });
    expect(resumen(c06(b.modelo()))).toEqual([["C06", sub, "aviso"]]);
  });

  it("dispara en el mismo episodio con orden menor", () => {
    const { b, t1, pri, sub } = paraC06();
    b.evento({ episodio: t1.eps[1], arcos: [[sub, "abre"]], orden: 1 });
    b.evento({ episodio: t1.eps[1], arcos: [[pri, "abre"]], orden: 2 });
    expect(c06(b.modelo())).toHaveLength(1);
  });

  it("dispara si cierra en E07 y la principal cierra en E05", () => {
    const { b, t1, pri, sub } = paraC06();
    b.evento({ episodio: t1.eps[0], arcos: [[pri, "abre"]] });
    b.evento({ episodio: t1.eps[1], arcos: [[sub, "abre"]] });
    b.evento({ episodio: t1.eps[4], arcos: [[pri, "cierra"]] });
    b.evento({ episodio: t1.eps[6], arcos: [[sub, "cierra"]] });
    const r = c06(b.modelo());
    expect(r).toHaveLength(1);
    expect(r[0].mensaje).toMatch(/después/);
  });

  it("no dispara si abre en E03, si el mismo evento abre las dos, ni si la principal sigue a la temporada siguiente", () => {
    const { b, t1, t2, pri, sub } = paraC06();
    b.evento({ episodio: t1.eps[0], arcos: [[pri, "abre"], [sub, "abre"]] });
    b.evento({ episodio: t1.eps[6], arcos: [[sub, "cierra"]] });
    b.evento({ episodio: t2.eps[0], arcos: [[pri, "cierra"]] });
    expect(c06(b.modelo())).toEqual([]);
    const otra = b.arco({ tipo_trama: "C", protagonistas: ["[[Sabela]]"] });
    b.evento({ episodio: t1.eps[2], arcos: [[otra, "abre"]] });
    expect(c06(b.modelo())).toEqual([]);
  });

  it("un tramo de la principal no cuenta como subtrama", () => {
    const { b, t1, pri } = paraC06();
    const tramo = b.arco({ tipo_trama: "B", nivel: "temporada", temporada: t1.id, tramo_de: pri });
    b.evento({ episodio: t1.eps[0], arcos: [[tramo, "abre"]] });
    b.evento({ episodio: t1.eps[1], arcos: [[pri, "abre"]] });
    expect(c06(b.modelo())).toEqual([]);
  });
});

function paraC07(subEventos: number) {
  const b = new Constructor();
  const t = b.temporada({}, 2);
  const pri = b.arco({ tipo_trama: "A" });
  const sub = b.arco({ tipo_trama: "B", tipo_arco: "relacion" });
  for (let i = 0; i < 10; i++) b.evento({ episodio: t.eps[i % 2], arcos: [[i < subEventos ? sub : pri, "avanza"]] });
  return { b, t, sub };
}

describe("C07 · subtrama con más del 30 % de los eventos de su temporada (§13)", () => {
  it("sugerencia con 4 de 10 eventos colocados", () => {
    const { b, sub } = paraC07(4);
    expect(resumen(c07(b.modelo()))).toEqual([["C07", sub, "sugerencia"]]);
  });

  it("no dispara con 3 de 10; los de la bandeja no cuentan", () => {
    const { b, t, sub } = paraC07(3);
    b.evento({ temporada: t.id, arcos: [[sub, "avanza"]] });
    b.evento({ temporada: t.id, arcos: [[sub, "avanza"]] });
    expect(c07(b.modelo())).toEqual([]);
  });
});
