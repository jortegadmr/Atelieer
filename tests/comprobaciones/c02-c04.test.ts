import { describe, expect, it } from "vitest";
import { c02, c03, c04 } from "../../src/lib/comprobaciones";
import { Constructor } from "../fixtures/constructor";
import { resumen } from "./ayuda";

describe("C02 · evento cuyo valor empieza y acaba igual (Escena 1.3)", () => {
  it("dispara con + → +", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const e = b.evento({ episodio: t.eps[0], cambio: ["+", "+"] });
    expect(resumen(c02(b.modelo()))).toEqual([["C02", e, "aviso"]]);
  });

  it("no dispara con − → + ni con un lado sin decidir", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    b.evento({ episodio: t.eps[0], cambio: ["-", "+"] });
    b.evento({ episodio: t.eps[0], cambio: ["+", ""] });
    expect(c02(b.modelo())).toEqual([]);
  });
});

const completo = { quiere: "El eco", gana: "Paz", pierde: "Amigo", bomba: "La marea viva" };

describe("C03 · arco A de trama sin quiere, gana / pierde o bomba (§10)", () => {
  it("dispara en un A de trama sin bomba y dice qué falta", () => {
    const b = new Constructor();
    const a = b.arco({ tipo_trama: "A", tipo_arco: "trama", ...completo, bomba: "" });
    const r = c03(b.modelo());
    expect(resumen(r)).toEqual([["C03", a, "aviso"]]);
    expect(r[0].mensaje).toMatch(/bomba/);
    expect(r[0].mensaje).not.toMatch(/quiere/);
  });

  it("no dispara en un A de trama completo, un A de relación sin bomba ni un B de trama vacío", () => {
    const b = new Constructor();
    b.arco({ tipo_trama: "A", tipo_arco: "trama", ...completo });
    b.arco({ tipo_trama: "A", tipo_arco: "relacion", ...completo, bomba: "" });
    b.arco({ tipo_trama: "B", tipo_arco: "trama" });
    expect(c03(b.modelo())).toEqual([]);
  });
});

describe("C04 · arco B o C sin bomba de tiempo (§10)", () => {
  it("es una sugerencia en un B de relación sin bomba", () => {
    const b = new Constructor();
    const a = b.arco({ tipo_trama: "B", tipo_arco: "relacion" });
    expect(resumen(c04(b.modelo()))).toEqual([["C04", a, "sugerencia"]]);
  });

  it("no dispara en un B con bomba, un A sin bomba (es C03) ni un B de personaje", () => {
    const b = new Constructor();
    b.arco({ tipo_trama: "B", tipo_arco: "trama", bomba: "Plazo" });
    b.arco({ tipo_trama: "A", tipo_arco: "trama" });
    b.arco({ tipo_trama: "B", tipo_arco: "personaje" });
    expect(c04(b.modelo())).toEqual([]);
  });
});
