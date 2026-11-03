import { describe, expect, it } from "vitest";
import * as c from "../src/lib/modelo/consultas";
import * as op from "../src/lib/modelo/operaciones";
import { Constructor } from "./fixtures/constructor";

function serie() {
  const b = new Constructor();
  const t1 = b.temporada({ titulo: "Uno" }, 2);
  const t2 = b.temporada({ titulo: "Dos" }, 1);
  const t3 = b.temporada({ titulo: "Tres", estado: "prevista" });
  const ev = b.evento({ episodio: t2.eps[0] });
  const suelto = b.evento({ temporada: t2.id });
  return { b, t1, t2, t3, ev, suelto, m: b.modelo() };
}

const ids = (l: { id: string }[]) => l.map((p) => p.id).sort();

describe("operaciones de la vista Serie (T2.3)", () => {
  it("crear una temporada la añade al final, prevista, y escribe ella y la serie", () => {
    const { m } = serie();
    const { pieza, cambio } = op.crearTemporada(m);
    expect(pieza.estado).toBe("prevista");
    expect(cambio.guardar.map((p) => p.tipo).sort()).toEqual(["serie", "temporada"]);
    const s = cambio.guardar.find((p) => p.tipo === "serie")!;
    expect(s.tipo === "serie" && s.temporadas.at(-1)).toBe(pieza.id);
    expect(cambio.borrar).toEqual([]);
  });

  it("mover una temporada cambia su código y solo escribe la serie", () => {
    const { m, t1, t2, t3 } = serie();
    const cambio = op.moverTemporada(m, t3.id, 1);
    expect(cambio.guardar.map((p) => p.tipo)).toEqual(["serie"]);
    m.poner(cambio.guardar[0]);
    expect(c.temporadasEnOrden(m).map((t) => t.id)).toEqual([t1.id, t3.id, t2.id]);
    expect(c.codigo(m, t2.id)).toBe("T03");
    expect(c.codigo(m, t2.eps[0])).toBe("T03E01");
  });

  it("borrar una temporada se lleva sus episodios, sus eventos y sus puntos clave, y la quita de la serie", () => {
    const { m, t2, ev, suelto } = serie();
    const { pieza: pt } = op.crearPunto(m, { posicion: { temporada: t2.id, episodio: "" } });
    m.poner(pt);
    const cambio = op.borrarPieza(m, t2.id);
    expect(ids(cambio.borrar)).toEqual([t2.id, t2.eps[0], ev, suelto, pt.id].sort());
    const s = cambio.guardar.find((p) => p.tipo === "serie")!;
    expect(s.tipo === "serie" && s.temporadas.includes(t2.id)).toBe(false);
  });

  it("borrar un episodio lo quita de su temporada y manda sus eventos a la bandeja", () => {
    const { m, t2, ev } = serie();
    const { pieza: pt } = op.crearPunto(m, { posicion: { temporada: t2.id, episodio: t2.eps[0] } });
    m.poner(pt);
    const cambio = op.borrarPieza(m, t2.eps[0]);
    const p = cambio.guardar.find((x) => x.id === pt.id)!;
    expect(p.tipo === "punto" && p.posicion).toEqual({ temporada: t2.id, episodio: "" });
    expect(ids(cambio.borrar)).toEqual([t2.eps[0]]);
    const t = cambio.guardar.find((p) => p.tipo === "temporada")!;
    expect(t.tipo === "temporada" && t.episodios).toEqual([]);
    const e = cambio.guardar.find((p) => p.id === ev)!;
    expect(e.tipo === "evento" && e.episodio).toBe("");
  });

  it("un punto clave se crea y se borra solo", () => {
    const { m, t1 } = serie();
    const { pieza, cambio } = op.crearPunto(m, { clase: "giro", posicion: { temporada: t1.id, episodio: "" } });
    expect(cambio.guardar).toEqual([pieza]);
    m.poner(pieza);
    expect(op.borrarPieza(m, pieza.id)).toEqual({ guardar: [], borrar: [pieza] });
  });

  it("editar copia la pieza, la cambia y deja la original como estaba", () => {
    const { m, t1 } = serie();
    const antes = m.temporadas.get(t1.id)!;
    const cambio = op.editar(m, t1.id, (t) => {
      if (t.tipo === "temporada") t.titulo = "Nuevo";
    });
    const despues = cambio.guardar[0];
    expect(despues.tipo === "temporada" && despues.titulo).toBe("Nuevo");
    expect(antes.titulo).toBe("Uno");
  });
});

describe("operaciones de la vista Temporada (paso 4)", () => {
  it("insertar un episodio entre E03 y E04 cambia los códigos de los siguientes y sus eventos siguen en su sitio", () => {
    const b = new Constructor();
    const t = b.temporada({}, 5);
    const ev = b.evento({ episodio: t.eps[3] });
    const m = b.modelo();
    const { pieza, cambio } = op.insertarEpisodio(m, t.id, 3);
    expect(cambio.guardar.map((p) => p.tipo).sort()).toEqual(["episodio", "temporada"]);
    for (const p of cambio.guardar) m.poner(p);
    expect(c.codigo(m, pieza.id)).toBe("T01E04");
    expect(c.codigo(m, t.eps[3])).toBe("T01E05");
    expect(m.eventos.get(ev)!.episodio).toBe(t.eps[3]);
  });

  it("mover un episodio solo reescribe su temporada", () => {
    const b = new Constructor();
    const t = b.temporada({}, 3);
    const m = b.modelo();
    const cambio = op.moverEpisodio(m, t.eps[2], 0);
    expect(cambio.guardar.map((p) => p.tipo)).toEqual(["temporada"]);
    m.poner(cambio.guardar[0]);
    expect(c.episodiosDeTemporada(m, t.id).map((e) => e.id)).toEqual([t.eps[2], t.eps[0], t.eps[1]]);
  });

  it("un evento nuevo va el último de su celda o de la bandeja", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    b.evento({ episodio: t.eps[0], orden: 4 });
    b.evento({ temporada: t.id, orden: 2 });
    const m = b.modelo();
    expect(op.crearEvento(m, { temporada: t.id, episodio: t.eps[0] }).pieza.orden).toBe(5);
    expect(op.crearEvento(m, { temporada: t.id }).pieza.orden).toBe(3);
  });

  it("un secreto nuevo se guarda solo", () => {
    const { m } = serie();
    const { pieza, cambio } = op.crearSecreto(m, { titulo: "Nuevo" });
    expect(cambio.guardar).toEqual([pieza]);
    expect(pieza.id).toMatch(/^sc-/);
  });
});

describe("mover eventos (T5.4, M10)", () => {
  function rejilla() {
    const b = new Constructor();
    const t = b.temporada({}, 3);
    const ven = b.arco();
    const otro = b.arco();
    const a = b.evento({ episodio: t.eps[0], arcos: [[ven, "abre"]] });
    const x = b.evento({ episodio: t.eps[1], arcos: [[ven, "avanza"]] });
    const y = b.evento({ episodio: t.eps[1], arcos: [[otro, "avanza"]] });
    const suelto = b.evento({ temporada: t.id, arcos: [[ven, "avanza"]] });
    return { b, t, ven, a, x, y, suelto, m: b.modelo() };
  }
  const aplicar = (m: ReturnType<typeof rejilla>["m"], cambio: { guardar: import("../src/lib/modelo/tipos").Pieza[] }) => {
    for (const p of cambio.guardar) m.poner(p);
  };

  it("de la bandeja a una celda le pone episodio, al final de la celda", () => {
    const { m, t, x, y, suelto } = rejilla();
    aplicar(m, op.moverEvento(m, suelto, t.eps[1]));
    expect(c.eventosDeEpisodio(m, t.eps[1]).map((e) => e.id)).toEqual([x, y, suelto]);
    expect(c.bandeja(m, t.id)).toEqual([]);
  });

  it("de una celda a la bandeja se lo quita", () => {
    const { m, t, a } = rejilla();
    aplicar(m, op.moverEvento(m, a, ""));
    expect(m.eventos.get(a)!.episodio).toBe("");
    expect(c.bandeja(m, t.id).map((e) => e.id)).toContain(a);
  });

  it("en horizontal cambia de episodio y nunca cambia sus arcos", () => {
    const { m, t, a, ven } = rejilla();
    aplicar(m, op.moverEvento(m, a, t.eps[2]));
    const e = m.eventos.get(a)!;
    expect(e.episodio).toBe(t.eps[2]);
    expect(e.arcos).toEqual([{ arco: ven, papel: "abre" }]);
  });

  it("dentro de la celda cambia el orden, y solo escribe lo que cambia", () => {
    const { m, t, x, y } = rejilla();
    const cambio = op.moverEvento(m, y, t.eps[1], 0);
    aplicar(m, cambio);
    expect(c.eventosDeEpisodio(m, t.eps[1]).map((e) => e.id)).toEqual([y, x]);
    expect(cambio.guardar.map((p) => p.id).sort()).toEqual([x, y].sort());
    expect(op.moverEvento(m, y, t.eps[1], 0).guardar).toEqual([]);
  });
});
