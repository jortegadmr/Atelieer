import { describe, expect, it } from "vitest";
import { c14, c15, c16, c17, c18, c19 } from "../../src/lib/comprobaciones";
import { Constructor } from "../fixtures/constructor";
import { resumen } from "./ayuda";

function dos() {
  const b = new Constructor();
  const t1 = b.temporada({}, 4);
  const t2 = b.temporada({}, 4);
  return { b, t1, t2 };
}

describe("C14 · secreto que se revela sin ninguna pista antes (§15, F4)", () => {
  it("dispara sin pistas, con solo pistas falsas o con la única pista en el mismo episodio de la revelación", () => {
    const { b, t1, t2 } = dos();
    const s1 = b.secreto({ revelado_en: { episodio: t2.eps[3], evento: "" } });
    const s2 = b.secreto({ revelado_en: { episodio: t2.eps[3], evento: "" }, falsas: [{ episodio: t1.eps[0], evento: "", texto: "x", conclusion: "" }] });
    const s3 = b.secreto({ revelado_en: { episodio: t2.eps[3], evento: "" }, pistas: [{ episodio: t2.eps[3], evento: "", texto: "x", clase: "sutil" }] });
    expect(c14(b.modelo()).map((x) => x.pieza).sort()).toEqual([s1, s2, s3].sort());
    expect(c14(b.modelo())[0].clase).toBe("aviso");
  });

  it("no dispara con una pista en T1E03, ni sin revelación", () => {
    const { b, t1, t2 } = dos();
    b.secreto({ revelado_en: { episodio: t2.eps[3], evento: "" }, pistas: [{ episodio: t1.eps[2], evento: "", texto: "x", clase: "sutil" }] });
    b.secreto({});
    expect(c14(b.modelo())).toEqual([]);
  });

  it("una pista en un evento anterior del mismo episodio cuenta", () => {
    const { b, t2 } = dos();
    const antes = b.evento({ episodio: t2.eps[3], orden: 1 });
    const rev = b.evento({ episodio: t2.eps[3], orden: 2 });
    b.secreto({ revelado_en: { episodio: t2.eps[3], evento: rev }, pistas: [{ episodio: "", evento: antes, texto: "x", clase: "obvia" }] });
    expect(c14(b.modelo())).toEqual([]);
  });
});

describe("C15 · pista sembrada después de la revelación (§15)", () => {
  it("dispara con una pista en T2E05 y la revelación en T2E04", () => {
    const b = new Constructor();
    const t = b.temporada({}, 6);
    const s = b.secreto({ revelado_en: { episodio: t.eps[3], evento: "" }, pistas: [{ episodio: t.eps[4], evento: "", texto: "x", clase: "sutil" }] });
    expect(resumen(c15(b.modelo()))).toEqual([["C15", s, "aviso"]]);
  });

  it("no dispara con la pista en T2E03", () => {
    const b = new Constructor();
    const t = b.temporada({}, 6);
    b.secreto({ revelado_en: { episodio: t.eps[3], evento: "" }, pistas: [{ episodio: t.eps[2], evento: "", texto: "x", clase: "sutil" }] });
    expect(c15(b.modelo())).toEqual([]);
  });
});

describe("C16 · episodio que acaba sin ninguna incógnita abierta (§11)", () => {
  it("sugerencia si al acabar todos los arcos empezados están cerrados y no queda secreto por revelar", () => {
    const b = new Constructor();
    const t = b.temporada({}, 3);
    const a = b.arco();
    b.evento({ episodio: t.eps[0], arcos: [[a, "abre"]] });
    b.evento({ episodio: t.eps[1], arcos: [[a, "cierra"]] });
    expect(resumen(c16(b.modelo()))).toEqual([["C16", t.eps[1], "sugerencia"]]);
  });

  it("no dispara con un arco empezado sin cerrar", () => {
    const b = new Constructor();
    const t = b.temporada({}, 3);
    const a = b.arco();
    b.evento({ episodio: t.eps[0], arcos: [[a, "abre"]] });
    b.evento({ episodio: t.eps[2], arcos: [[a, "cierra"]] });
    expect(c16(b.modelo())).toEqual([]);
  });

  it("no dispara con un secreto que se revela más tarde o sin fecha", () => {
    const b = new Constructor();
    const t = b.temporada({}, 3);
    const x = b.arco();
    b.evento({ episodio: t.eps[0], arcos: [[x, "abre"]] });
    b.evento({ episodio: t.eps[0], arcos: [[x, "cierra"]] });
    b.secreto({ revelado_en: { episodio: t.eps[2], evento: "" } });
    expect(c16(b.modelo())).toEqual([]);
    const b2 = new Constructor();
    const t2 = b2.temporada({}, 3);
    const y = b2.arco();
    b2.evento({ episodio: t2.eps[0], arcos: [[y, "abre"]] });
    b2.evento({ episodio: t2.eps[0], arcos: [[y, "cierra"]] });
    b2.secreto({});
    expect(c16(b2.modelo())).toEqual([]);
  });

  it("no dispara en el último episodio de la serie", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const a = b.arco();
    b.evento({ episodio: t.eps[0], arcos: [[a, "abre"]] });
    b.evento({ episodio: t.eps[0], arcos: [[a, "cierra"]] });
    expect(c16(b.modelo())).toEqual([]);
  });
});

describe("C17 · arco de personaje sin necesita o sin estado en una temporada en marcha", () => {
  it("sugerencia sin necesita", () => {
    const b = new Constructor();
    const a = b.arco({ tipo_arco: "personaje" });
    expect(resumen(c17(b.modelo()))).toEqual([["C17", a, "sugerencia"]]);
  });

  it("sugerencia en una temporada en marcha donde está presente sin estado inicial y final", () => {
    const b = new Constructor();
    const t = b.temporada({ estado: "en marcha" }, 2);
    const a = b.arco({ tipo_arco: "personaje", necesita: "Pedir ayuda" });
    b.evento({ episodio: t.eps[0], arcos: [[a, "abre"]] });
    const r = c17(b.modelo());
    expect(r.map((x) => [x.id, x.pieza])).toEqual([["C17", a]]);
    expect(r[0].mensaje).toMatch(/T01/);
  });

  it("no dispara completo ni en una temporada prevista", () => {
    const b = new Constructor();
    const t1 = b.temporada({ estado: "en marcha" }, 2);
    const t2 = b.temporada({ estado: "prevista" }, 2);
    const a = b.arco({ tipo_arco: "personaje", necesita: "Pedir ayuda", estados: [{ temporada: t1.id, inicio: "Calla", fin: "Habla" }] });
    b.evento({ episodio: t1.eps[0], arcos: [[a, "abre"]] });
    b.evento({ episodio: t2.eps[0], arcos: [[a, "avanza"]] });
    expect(c17(b.modelo())).toEqual([]);
  });
});

describe("C18 · serie sin final decidido (§18, F1.6)", () => {
  it("sugerencia sin final; con texto, no", () => {
    const b = new Constructor();
    expect(resumen(c18(b.modelo()))).toEqual([["C18", b.serie.id, "sugerencia"]]);
    b.serie.final_decidido = "La salda.";
    expect(c18(b.modelo())).toEqual([]);
  });
});

describe("C19 · temporada sin trama principal elegida (D7)", () => {
  it("sugerencia si no tiene principal y hay arcos B o C presentes", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const sub = b.arco({ tipo_trama: "B" });
    b.evento({ episodio: t.eps[0], arcos: [[sub, "abre"]] });
    expect(resumen(c19(b.modelo()))).toEqual([["C19", t.id, "sugerencia"]]);
  });

  it("no dispara con principal", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const pri = b.arco({ tipo_trama: "A" });
    const sub = b.arco({ tipo_trama: "B" });
    b.temporadas[0].principal = pri;
    b.evento({ episodio: t.eps[0], arcos: [[sub, "abre"]] });
    expect(c19(b.modelo())).toEqual([]);
  });
});
