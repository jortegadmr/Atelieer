import { describe, expect, it } from "vitest";
import * as v from "../src/lib/modelo/vocabulario";

// Los valores tienen que coincidir exactamente con la spec 4.1 y el plan 3.4,
// porque son los mismos que usa la wiki.
describe("vocabulario (spec 4.1)", () => {
  it("madurez = estado_canon de la regla 9", () => {
    expect(v.MADUREZ).toEqual(["idea", "borrador", "canon", "descartado"]);
  });

  it("estado de escritura del episodio", () => {
    expect(v.ESTADO_ESCRITURA).toEqual(["idea", "escaleta", "guion"]);
  });

  it("tipo de arco y tipo A/B/C", () => {
    expect(v.TIPO_ARCO).toEqual(["trama", "personaje", "relacion"]);
    expect(v.etiqueta(v.TIPO_ARCO, "relacion")).toBe("relación");
    expect(v.TIPO_TRAMA).toEqual(["A", "B", "C"]);
    expect(v.etiqueta(v.TIPO_TRAMA, "A")).toBe("principal");
    expect(v.etiqueta(v.TIPO_TRAMA, "B")).toBe("secundaria");
    expect(v.etiqueta(v.TIPO_TRAMA, "C")).toBe("de respiro");
  });

  it("beats de la plantilla Arco, en orden", () => {
    expect(v.BEATS.map((b) => v.etiqueta(v.BEATS, b))).toEqual([
      "planteamiento",
      "complicación",
      "punto medio",
      "crisis",
      "resolución",
    ]);
  });

  it("nivel de secreto", () => {
    expect(v.NIVEL_SECRETO).toEqual(["menor", "mayor", "central"]);
  });

  it("papel del evento en un arco", () => {
    expect(v.PAPEL).toEqual(["abre", "avanza", "gira", "cierra"]);
  });

  it("cómo se cuenta (regla 13)", () => {
    expect(v.MODO).toEqual(["escena", "flashback", "leyenda"]);
    expect(v.etiqueta(v.MODO, "escena")).toBe("en escena");
    expect(v.etiqueta(v.MODO, "leyenda")).toBe("leyenda contada");
  });

  it("acto del evento (D9)", () => {
    expect(v.ACTO).toEqual(["teaser", "1", "2", "3"]);
  });

  it("resto de listas del plan 3.4", () => {
    expect(v.NIVEL_ARCO).toEqual(["serie", "temporada"]);
    expect(v.ESTADO_TEMPORADA).toEqual(["prevista", "en marcha", "cerrada"]);
    expect(v.CLASE_PUNTO).toEqual(["inicio", "detonante", "giro", "crisis", "climax", "fin", "otro"]);
    expect(v.etiqueta(v.CLASE_PUNTO, "climax")).toBe("clímax");
    expect(v.CLASE_PISTA).toEqual(["obvia", "sutil"]);
    expect(v.CARGA).toEqual(["+", "-"]);
    expect(v.etiqueta(v.CARGA, "-")).toBe("−");
    expect(v.PEGAMENTO_POR).toEqual(["trama", "tema"]);
    expect(v.TIPO_PIEZA).toEqual(["serie", "punto", "temporada", "episodio", "arco", "evento", "secreto"]);
  });

  it("cada lista tiene una etiqueta por valor y ninguna sobra", () => {
    for (const lista of v.LISTAS) {
      expect(Object.keys(lista.etiquetas).sort()).toEqual([...lista.valores].sort());
    }
  });

  it("es valor de una lista", () => {
    expect(v.esValor(v.MADUREZ, "canon")).toBe(true);
    expect(v.esValor(v.MADUREZ, "Canon")).toBe(false);
    expect(v.esValor(v.MADUREZ, 3)).toBe(false);
  });
});
