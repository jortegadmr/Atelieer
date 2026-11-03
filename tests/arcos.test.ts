import { describe, expect, it } from "vitest";
import * as c from "../src/lib/modelo/consultas";
import * as op from "../src/lib/modelo/operaciones";
import { sugerirSiembras } from "../src/lib/modelo/siembras";
import { Constructor } from "./fixtures/constructor";

function serie() {
  const b = new Constructor();
  const t1 = b.temporada({}, 4);
  const t2 = b.temporada({}, 2);
  const ven = b.arco({ titulo: "El eco", protagonistas: ["[[Telmo]]"], color: 1 });
  const tor = b.arco({ titulo: "La tormenta", nivel: "temporada", temporada: t1.id, tramo_de: ven });
  const ev = b.evento({ episodio: t1.eps[0], arcos: [[ven, "abre"], [tor, "abre"]] });
  return { b, t1, t2, ven, tor, ev, m: b.modelo() };
}

describe("arcos (T3.3)", () => {
  it("crear un arco lo añade al final del orden de la serie", () => {
    const { m, ven, tor } = serie();
    const { pieza, cambio } = op.crearArco(m, { tipo_trama: "C", tipo_arco: "relacion" });
    const s = cambio.guardar.find((p) => p.tipo === "serie")!;
    expect(s.tipo === "serie" && s.arcos).toEqual([ven, tor, pieza.id]);
    expect(pieza.titulo).toBe("");
  });

  it("un tramo copia del arco el tipo, el protagonista y el color", () => {
    const { m, t2, ven } = serie();
    const { pieza } = op.crearTramo(m, ven, t2.id);
    expect(pieza).toMatchObject({
      nivel: "temporada",
      temporada: t2.id,
      tramo_de: ven,
      tipo_arco: "trama",
      tipo_trama: "A",
      protagonistas: ["[[Telmo]]"],
      color: 1,
      titulo: "El eco en T02",
    });
  });

  it("reordenar arcos solo escribe la serie, y el orden manda en las listas", () => {
    const { m, ven, tor } = serie();
    const cambio = op.moverArco(m, tor, 0);
    expect(cambio.guardar.map((p) => p.tipo)).toEqual(["serie"]);
    m.poner(cambio.guardar[0]);
    expect(c.arcosEnOrden(m).map((a) => a.id)).toEqual([tor, ven]);
  });

  it("borrar un arco lo quita de sus eventos, deja huérfanos a sus tramos y lo quita como principal", () => {
    const { b, t1, ven, tor, ev } = serie();
    b.temporadas[0].principal = ven;
    const m = b.modelo();
    const cambio = op.borrarPieza(m, ven);
    expect(cambio.borrar.map((p) => p.id)).toEqual([ven]);
    const e = cambio.guardar.find((p) => p.id === ev)!;
    expect(e.tipo === "evento" && e.arcos).toEqual([{ arco: tor, papel: "abre" }]);
    const t = cambio.guardar.find((p) => p.id === tor)!;
    expect(t.tipo === "arco" && t.tramo_de).toBe("");
    const te = cambio.guardar.find((p) => p.id === t1.id)!;
    expect(te.tipo === "temporada" && te.principal).toBe("");
    const s = cambio.guardar.find((p) => p.tipo === "serie")!;
    expect(s.tipo === "serie" && s.arcos.includes(ven)).toBe(false);
  });
});

describe("Sugerir siembras (D10)", () => {
  it("propone las pistas de los secretos que se revelan en eventos del arco", () => {
    const { b, t1, t2, ven } = serie();
    const rev = b.evento({ episodio: t2.eps[0], arcos: [[ven, "gira"]] });
    b.secreto({
      titulo: "Quién grabó la cinta",
      verdad: "Nando",
      revelado_en: { episodio: t2.eps[0], evento: rev },
      pistas: [{ episodio: t1.eps[2], evento: "", texto: "La frecuencia copiada", clase: "sutil" }],
    });
    b.secreto({ titulo: "Otro", revelado_en: { episodio: t2.eps[1], evento: "" }, pistas: [{ episodio: t1.eps[1], evento: "", texto: "No", clase: "obvia" }] });
    const m = b.modelo();
    expect(sugerirSiembras(m, ven)).toEqual([
      { siembra: "La frecuencia copiada", donde: "T01E03", recogida: "Se revela: Quién grabó la cinta", donde_recogida: "T02E01" },
    ]);
  });

  it("también si el secreto se revela en un episodio donde el arco tiene eventos; y no repite las que ya están", () => {
    const { b, t1, ven } = serie();
    b.secreto({ titulo: "S", revelado_en: { episodio: t1.eps[0], evento: "" }, pistas: [{ episodio: t1.eps[0], evento: "", texto: "P", clase: "sutil" }] });
    b.arcos[0].siembras = [{ siembra: "P", donde: "T01E01", recogida: "", donde_recogida: "" }];
    expect(sugerirSiembras(b.modelo(), ven)).toEqual([]);
  });

  it("nunca copia la verdad del secreto (regla 10)", () => {
    const { b, t1, ven } = serie();
    b.secreto({ titulo: "S", verdad: "LA VERDAD", revelado_en: { episodio: t1.eps[0], evento: "" }, pistas: [{ episodio: t1.eps[0], evento: "", texto: "P", clase: "sutil" }] });
    expect(JSON.stringify(sugerirSiembras(b.modelo(), ven))).not.toContain("LA VERDAD");
  });
});
