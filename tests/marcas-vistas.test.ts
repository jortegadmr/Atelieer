import { describe, expect, it } from "vitest";
import { copiaModelo } from "../src/lib/consecuencias/copia";
import { marcasRejilla, marcasTramas } from "../src/lib/consecuencias/vistas";
import type { Arco, Evento } from "../src/lib/modelo/tipos";
import { Constructor } from "./fixtures/constructor";

// Spec 009, RF-30: las marcas de antes en la rejilla y en Tramas.

function serie() {
  const b = new Constructor();
  const t = b.temporada({}, 2);
  const otra = b.temporada({}, 1);
  const x = b.arco({ titulo: "X" });
  const y = b.arco({ titulo: "Y" });
  const a = b.evento({ titulo: "A", episodio: t.eps[0], arcos: [[x, "abre"]] });
  const mueve = b.evento({ titulo: "Mueve", episodio: t.eps[0], arcos: [[x, "avanza"]] });
  const suelta = b.evento({ titulo: "Suelta", episodio: t.eps[1], arcos: [] });
  const fuera = b.evento({ titulo: "Fuera", episodio: otra.eps[0], arcos: [[x, "gira"]] });
  return { m: b.modelo(), t, x, y, a, mueve, suelta, fuera };
}

const cambiar = (m: ReturnType<typeof serie>["m"], id: string, f: (e: Evento) => void) => {
  const e = structuredClone(m.eventos.get(id)!);
  f(e);
  m.poner(e);
};

describe("marcas en la rejilla (spec 009, RF-30)", () => {
  it("el papel de antes, Estaba aquí donde estaba la escena y Nueva", () => {
    const { m, t, x, y, a, mueve, suelta } = serie();
    const base = copiaModelo(m);
    cambiar(m, a, (e) => (e.arcos = [{ arco: x, papel: "cierra" }]));
    cambiar(m, mueve, (e) => ((e.episodio = t.eps[1]), (e.arcos = [{ arco: x, papel: "gira" }])));
    cambiar(m, suelta, (e) => (e.arcos = [{ arco: y, papel: "avanza" }]));
    m.poner({ ...m.eventos.get(a)!, id: "ev-nueva", titulo: "Nueva" });
    const r = marcasRejilla(base, m, [a, mueve, suelta, "ev-nueva"], t.id);
    expect([...r.papelAntes]).toEqual([
      [`${a}|${x}`, "abre"],
      [`${mueve}|${x}`, "avanza"],
    ]);
    expect([...r.estabanAqui]).toEqual([
      [`${x}|${t.eps[0]}`, [{ id: mueve, titulo: "Mueve" }]],
      [`|${t.eps[1]}`, [{ id: suelta, titulo: "Suelta" }]],
    ]);
    expect([...r.nuevas]).toEqual(["ev-nueva"]);
  });

  it("solo cuentan las piezas cambiadas de esta temporada", () => {
    const { m, t, a, fuera } = serie();
    const base = copiaModelo(m);
    cambiar(m, a, (e) => (e.episodio = t.eps[1]));
    cambiar(m, fuera, (e) => (e.arcos = []));
    const r = marcasRejilla(base, m, [fuera], t.id);
    expect([r.papelAntes.size, r.estabanAqui.size, r.nuevas.size]).toEqual([0, 0, 0]);
  });
});

describe("marcas en Tramas (spec 009, RF-30)", () => {
  function conArcos() {
    const r = serie();
    const editarArco = (id: string, f: (a: Arco) => void) => {
      const a = structuredClone(r.m.arcos.get(id)!);
      f(a);
      r.m.poner(a);
    };
    return { ...r, editarArco };
  }

  it("cómo estaba cada campo cambiado del arco que se ve, recortado como en «Lo cambiado»", () => {
    const { m, t, x, editarArco } = conArcos();
    editarArco(x, (a) => {
      a.quiere = "Evitar la desgracia";
      a.protagonistas = ["[[Telmo]]"];
      a.estados = [{ temporada: t.id, inicio: "solo", fin: "" }];
    });
    const base = copiaModelo(m);
    editarArco(x, (a) => {
      a.quiere = "x".repeat(10);
      a.gana = "Algo nuevo";
      a.protagonistas = ["[[Telmo]]", "[[Nando]]"];
      a.estados = [{ temporada: t.id, inicio: "acompañado", fin: "" }];
      a.beats[0] = { ...a.beats[0], temporada: t.id };
    });
    editarArco(x, (a) => (a.impide = `  ${"largo ".repeat(30)}`));
    const r = marcasTramas(base, m, [x], x);
    expect(r.campos.get("Qué quiere")).toBe("Evitar la desgracia");
    expect(r.campos.get("Qué gana")).toBe("vacío");
    expect(r.campos.get("Protagonistas")).toBe("Telmo");
    expect(r.campos.get("Qué se lo impide")).toBe("vacío");
    expect(r.campos.has("Qué necesita")).toBe(false);
    expect([...r.estados]).toEqual([[t.id, "solo / —"]]);
    expect([...r.beats]).toEqual([[0, "sin fijar"]]);
  });

  it("Nueva y Ya no está en la lista; el arco que no cambió no lleva marcas", () => {
    const { m, x, y } = conArcos();
    const base = copiaModelo(m);
    m.quitar(y);
    m.poner({ ...structuredClone(m.arcos.get(x)!), id: "ar-nuevo", titulo: "Nuevo" });
    const r = marcasTramas(base, m, [y, "ar-nuevo"], x);
    expect([...r.nuevos]).toEqual(["ar-nuevo"]);
    expect(r.yaNoEsta).toEqual([{ id: y, titulo: "Y" }]);
    expect(r.campos.size + r.estados.size + r.beats.size).toBe(0);
  });
});
