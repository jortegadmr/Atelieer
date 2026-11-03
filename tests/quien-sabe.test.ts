import { describe, expect, it } from "vitest";
import { crearPieza } from "../src/lib/modelo/ficheros";
import type { Ficha } from "../src/lib/wiki/fichas";
import type { FuentePersonajes } from "../src/lib/vistas/lente";
import { quienSabe } from "../src/lib/vistas/quien-sabe";
import { Constructor } from "./fixtures/constructor";

// Quién sabe qué (spec 010, RF-31 a RF-34, T9)

function wiki(...fichas: string[][]): FuentePersonajes {
  const l = fichas.map(([nombre, ...aliases]) => ({ nombre, aliases, tipo: "personaje", ruta: `P/${nombre}.md`, resumen: "", detalle: "" }) as unknown as Ficha);
  return { de: (t) => (t === "personaje" ? l : []) };
}

const pista = (episodio: string, evento = "") => ({ episodio, evento, texto: "", clase: "sutil" as const });
const falsa = (episodio: string, evento = "") => ({ episodio, evento, texto: "", conclusion: "" });

/** Dos temporadas de 3 episodios */
function base() {
  const b = new Constructor();
  const t1 = b.temporada({}, 3);
  const t2 = b.temporada({}, 3);
  return { b, t1, t2 };
}

const textos = (q: ReturnType<typeof quienSabe>, i = 0) => q.filas[i].casillas.map((x) => x.texto);

describe("quién sabe qué (spec 010, T9)", () => {
  it("revelado en temporada anterior: Revelado en todas", () => {
    const { b, t1, t2 } = base();
    b.secreto({ titulo: "S", revelado_en: { episodio: t1.eps[1], evento: "" } });
    expect(textos(quienSabe(b.modelo(), null, t2.id))).toEqual(["Revelado", "Revelado", "Revelado"]);
    const q1 = quienSabe(b.modelo(), null, t1.id);
    expect(textos(q1)).toEqual(["No lo sabe", "Revelado", "Revelado"]);
    expect(q1.filas[0].casillas.map((x) => x.nuevo)).toEqual([false, true, false]);
  });

  it("pista después de la revelación no se marca como nueva", () => {
    const { b, t1 } = base();
    b.secreto({ titulo: "S", revelado_en: { episodio: t1.eps[0], evento: "" }, pistas: [pista(t1.eps[2])] });
    const q = quienSabe(b.modelo(), null, t1.id);
    expect(textos(q)).toEqual(["Revelado", "Revelado", "Revelado"]);
    expect(q.filas[0].casillas.map((x) => x.nuevo)).toEqual([true, false, false]);
  });

  it("pistas acumuladas por toda la serie", () => {
    const { b, t1, t2 } = base();
    b.secreto({ titulo: "S", pistas: [pista(t1.eps[0]), pista(t1.eps[2]), pista(t2.eps[1])], falsas: [falsa(t2.eps[0])] });
    expect(textos(quienSabe(b.modelo(), null, t2.id))).toEqual(["Pistas: 2 · Falsas: 1", "Pistas: 3 · Falsas: 1", "Pistas: 3 · Falsas: 1"]);
  });

  it("solo falsas: Falsas: M", () => {
    const { b, t1 } = base();
    b.secreto({ titulo: "S", falsas: [falsa(t1.eps[1]), falsa(t1.eps[1])] });
    expect(textos(quienSabe(b.modelo(), null, t1.id))).toEqual(["No lo sabe", "Falsas: 2", "Falsas: 2"]);
  });

  it("pista en escena aparcada o en la bandeja no cuenta, aunque lleve episodio marcado", () => {
    const { b, t1 } = base();
    const ap = b.evento({ episodio: t1.eps[0], madurez_mesa: "aparcado" });
    const ban = b.evento({ temporada: t1.id });
    const desc = b.evento({ episodio: t1.eps[0], madurez: "descartado" });
    b.secreto({ titulo: "S", pistas: [pista(t1.eps[0], ap), pista(t1.eps[0], ban), pista("", desc)], revelado_en: { episodio: t1.eps[1], evento: ban } });
    expect(textos(quienSabe(b.modelo(), null, t1.id))).toEqual(["No lo sabe", "No lo sabe", "No lo sabe"]);
  });

  it("marcada solo con episodio cuenta", () => {
    const { b, t1 } = base();
    b.secreto({ titulo: "S", pistas: [pista(t1.eps[1])] });
    expect(textos(quienSabe(b.modelo(), null, t1.id))).toEqual(["No lo sabe", "Pistas: 1", "Pistas: 1"]);
  });

  it("episodio marcado manda sobre el de la escena", () => {
    const { b, t1 } = base();
    const ev = b.evento({ episodio: t1.eps[0] });
    const ev2 = b.evento({ episodio: t1.eps[1] });
    b.secreto({ titulo: "S", pistas: [pista(t1.eps[2], ev), pista("", ev2)] });
    expect(textos(quienSabe(b.modelo(), null, t1.id))).toEqual(["No lo sabe", "Pistas: 1", "Pistas: 2"]);
  });

  it("revelación sin episodio nunca Revelado", () => {
    const { b, t1 } = base();
    const ban = b.evento({ temporada: t1.id });
    b.secreto({ titulo: "Sin", revelado_en: { episodio: "", evento: ban } });
    b.secreto({ titulo: "Roto", revelado_en: { episodio: "ep-no-existe", evento: "" } });
    const q = quienSabe(b.modelo(), null, t1.id);
    for (const f of q.filas) expect(f.casillas.every((x) => x.publico === "nada")).toBe(true);
  });

  it("fecha más temprana si se repite; los que se enteran, marcados", () => {
    const { b, t1 } = base();
    const [e1, e2, e3] = t1.eps;
    b.secreto({
      titulo: "S",
      conocen: ["[[Telmo]]", "[[el Técnico]]", "[[Ana]]"],
      extra: { conocen_desde: [{ personaje: "[[Telmo]]", episodio: e3 }, { personaje: "[[el Técnico]]", episodio: e2 }, { personaje: "[[Ana]]", episodio: e1 }] },
    });
    const c = quienSabe(b.modelo(), wiki(["Telmo", "el Técnico"]), t1.id).filas[0].casillas;
    expect(c.map((x) => x.saben)).toEqual([["Ana"], ["Telmo", "Ana"], ["Telmo", "Ana"]]);
    expect(c.map((x) => x.seEnteran)).toEqual([["Ana"], ["Telmo"], []]);
  });

  it("sin fecha y con fecha en episodio sin temporada van aparte", () => {
    const { b, t1 } = base();
    b.episodios.push(crearPieza("episodio", { id: "ep-suelto", temporada: "" }));
    b.secreto({
      titulo: "S",
      conocen: ["[[Telmo]]", "[[Ana]]", "[[Nando]]", "[[Lia]]"],
      extra: { conocen_desde: [{ personaje: "[[Ana]]", episodio: "ep-suelto" }, { personaje: "[[Nando]]", episodio: "ep-borrado" }, { personaje: "[[Lia]]", episodio: 3 }] },
    });
    const f = quienSabe(b.modelo(), null, t1.id).filas[0];
    expect(f.sinFecha).toEqual(["Telmo", "Nando", "Lia"]);
    expect(f.fuera.map((x) => x.nombre)).toEqual(["Ana"]);
    expect(f.casillas.every((x) => x.saben.length === 0)).toBe(true);
  });

  it("alias en Lo conocen es el mismo personaje", () => {
    const { b, t1 } = base();
    b.secreto({ titulo: "S", conocen: ["[[Telmo]]", "[[el Técnico]]"], extra: { conocen_desde: [{ personaje: "[[el Técnico]]", episodio: t1.eps[0] }] } });
    const f = quienSabe(b.modelo(), wiki(["Telmo", "el Técnico"]), t1.id).filas[0];
    expect(f.sinFecha).toEqual([]);
    expect(f.casillas[0].saben).toEqual(["Telmo"]);
  });

  it("orden de filas: por revelación y título; sin revelar al final; descartados fuera", () => {
    const { b, t1, t2 } = base();
    b.secreto({ titulo: "Zeta", revelado_en: { episodio: t1.eps[0], evento: "" } });
    b.secreto({ titulo: "Beta", revelado_en: { episodio: t2.eps[0], evento: "" } });
    b.secreto({ titulo: "Alfa", revelado_en: { episodio: t2.eps[0], evento: "" } });
    b.secreto({ titulo: "Nunca" });
    b.secreto({ titulo: "Antes" });
    b.secreto({ titulo: "Fuera", madurez: "descartado" });
    expect(quienSabe(b.modelo(), null, t1.id).filas.map((f) => f.secreto.titulo)).toEqual(["Zeta", "Alfa", "Beta", "Antes", "Nunca"]);
  });
});
