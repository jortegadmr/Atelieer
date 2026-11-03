import { describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import * as c from "../src/lib/modelo/consultas";
import { Constructor } from "./fixtures/constructor";

function serieBasica() {
  const b = new Constructor();
  const t1 = b.temporada({ titulo: "Uno" }, 4);
  const t2 = b.temporada({ titulo: "Dos" }, 3);
  const ven = b.arco({ titulo: "El eco", tipo_trama: "A" });
  const tor = b.arco({ titulo: "La tormenta", nivel: "temporada", temporada: t1.id, tramo_de: ven });
  const her = b.arco({ titulo: "Amistad", tipo_trama: "B", tipo_arco: "relacion" });
  const e1 = b.evento({ episodio: t1.eps[0], arcos: [[ven, "abre"]] });
  const e2 = b.evento({ episodio: t1.eps[0], arcos: [[her, "abre"], [ven, "avanza"]] });
  const e3 = b.evento({ episodio: t1.eps[2], arcos: [[tor, "abre"]] });
  const e4 = b.evento({ episodio: t2.eps[1], arcos: [[ven, "cierra"]] });
  const bandeja = b.evento({ temporada: t1.id, arcos: [[ven, "avanza"]] });
  return { b, t1, t2, ven, tor, her, e1, e2, e3, e4, bandeja, m: b.modelo() };
}

describe("consultas del modelo (spec 4.3, 4.4)", () => {
  it("eventos de un episodio, por orden", () => {
    const { m, t1, e1, e2 } = serieBasica();
    expect(c.eventosDeEpisodio(m, t1.eps[0]).map((e) => e.id)).toEqual([e1, e2]);
    expect(c.eventosDeEpisodio(m, t1.eps[1])).toEqual([]);
  });

  it("orden manda sobre el orden de creación", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const x = b.evento({ episodio: t.eps[0], orden: 2 });
    const y = b.evento({ episodio: t.eps[0], orden: 1 });
    expect(c.eventosDeEpisodio(b.modelo(), t.eps[0]).map((e) => e.id)).toEqual([y, x]);
  });

  it("bandeja de una temporada: sus eventos sin episodio", () => {
    const { m, t1, t2, bandeja } = serieBasica();
    expect(c.bandeja(m, t1.id).map((e) => e.id)).toEqual([bandeja]);
    expect(c.bandeja(m, t2.id)).toEqual([]);
  });

  it("eventos de un arco, en orden de emisión", () => {
    const { m, ven, e1, e2, e4, bandeja } = serieBasica();
    expect(c.eventosDeArco(m, ven).map((e) => e.id)).toEqual([e1, e2, e4, bandeja]);
    expect(c.eventosColocadosDeArco(m, ven).map((e) => e.id)).toEqual([e1, e2, e4]);
  });

  it("tramos de un arco", () => {
    const { m, ven, tor, her } = serieBasica();
    expect(c.tramos(m, ven).map((a) => a.id)).toEqual([tor]);
    expect(c.tramos(m, her)).toEqual([]);
  });

  it("posición de emisión comparable: temporada, episodio y orden", () => {
    const { m, e1, e2, e3, e4, bandeja } = serieBasica();
    const p = (id: string) => c.posicionEvento(m, m.eventos.get(id)!)!;
    expect(c.compararPos(p(e1), p(e2))).toBeLessThan(0);
    expect(c.compararPos(p(e2), p(e3))).toBeLessThan(0);
    expect(c.compararPos(p(e4), p(e3))).toBeGreaterThan(0);
    expect(c.compararPos(p(e1), p(e1))).toBe(0);
    expect(c.posicionEvento(m, m.eventos.get(bandeja)!)).toBeNull();
  });

  it("una posición que apunta solo a un episodio cuenta como su comienzo", () => {
    const { m, t1, e1 } = serieBasica();
    const soloEp = c.posicionDe(m, { temporada: t1.id, episodio: t1.eps[0] })!;
    expect(c.compararPos(soloEp, c.posicionEvento(m, m.eventos.get(e1)!)!)).toBeLessThan(0);
    const soloTemp = c.posicionDe(m, { temporada: t1.id, episodio: "" })!;
    expect(c.compararPos(soloTemp, soloEp)).toBeLessThan(0);
    expect(c.posicionDe(m, { temporada: "", episodio: "" })).toBeNull();
  });

  it("inicio y fin calculados de un arco, y los manuales si no hay eventos", () => {
    const { b, t1, t2, ven, her } = serieBasica();
    const libre = b.arco({ inicio: { temporada: t1.id, episodio: "" }, fin: { temporada: t2.id, episodio: t2.eps[2] } });
    const m = b.modelo();
    const v = c.inicioFin(m, ven);
    expect(v.inicio).toEqual({ temporada: t1.id, episodio: t1.eps[0] });
    expect(v.fin).toEqual({ temporada: t2.id, episodio: t2.eps[1] });
    expect(v.inicioCalculado && v.finCalculado).toBe(true);
    const h = c.inicioFin(m, her);
    expect(h.fin).toBeNull();
    const l = c.inicioFin(m, libre);
    expect(l.inicio).toEqual({ temporada: t1.id, episodio: "" });
    expect(l.inicioCalculado).toBe(false);
  });

  it("arcos presentes en una temporada", () => {
    const { b, t1, t2, ven, tor, her } = serieBasica();
    const manual = b.arco({ inicio: { temporada: t2.id, episodio: "" } });
    const deT2 = b.arco({ nivel: "temporada", temporada: t2.id });
    const m = b.modelo();
    expect(c.arcosPresentes(m, t1.id).map((a) => a.id).sort()).toEqual([ven, tor, her].sort());
    // El eco cierra en T2; Amistad sigue abierta pero no tiene eventos en T2 ni fin: sigue hasta el final
    expect(c.arcosPresentes(m, t2.id).map((a) => a.id).sort()).toEqual([ven, her, manual, deT2].sort());
  });

  it("código visible de cada temporada y episodio", () => {
    const { m, t1, t2 } = serieBasica();
    expect(c.codigo(m, t2.id)).toBe("T02");
    expect(c.codigo(m, t1.eps[3])).toBe("T01E04");
    expect(c.codigo(m, t2.eps[0])).toBe("T02E01");
    expect(c.episodiosEnOrden(m).map((e) => c.codigo(m, e.id))).toEqual([
      "T01E01", "T01E02", "T01E03", "T01E04", "T02E01", "T02E02", "T02E03",
    ]);
  });

  it("arcos en orden: A, B, C; trama, personaje, relación; título", () => {
    const b = new Constructor();
    const x = [
      b.arco({ titulo: "Amistad", tipo_trama: "B", tipo_arco: "relacion" }),
      b.arco({ titulo: "Telmo", tipo_trama: "A", tipo_arco: "personaje" }),
      b.arco({ titulo: "La cinta", tipo_trama: "B" }),
      b.arco({ titulo: "El eco", tipo_trama: "A" }),
      b.arco({ titulo: "Amor", tipo_trama: "C", tipo_arco: "relacion" }),
    ];
    b.serie.arcos = []; // sin orden a mano
    expect(c.arcosEnOrden(b.modelo()).map((a) => a.id)).toEqual([x[3], x[1], x[2], x[0], x[4]]);
  });

  it("el modelo se actualiza al poner y quitar piezas", () => {
    const { m, t1, e1 } = serieBasica();
    const ev = structuredClone(m.eventos.get(e1)!);
    ev.episodio = t1.eps[1];
    const v = m.version;
    m.poner(ev);
    expect(m.version).toBeGreaterThan(v);
    expect(c.eventosDeEpisodio(m, t1.eps[1]).map((e) => e.id)).toEqual([e1]);
    m.quitar(e1);
    expect(c.eventosDeEpisodio(m, t1.eps[1])).toEqual([]);
  });
});

describe("insertar un episodio", () => {
  it("cambia los códigos de los siguientes y sus eventos siguen en su sitio", () => {
    const { m, t1, e3 } = serieBasica();
    const { episodio } = m.insertarEpisodio(t1.id, 1, { titulo: "Nuevo" });
    expect(c.codigo(m, episodio.id)).toBe("T01E02");
    expect(c.codigo(m, t1.eps[2])).toBe("T01E04");
    expect(m.eventos.get(e3)!.episodio).toBe(t1.eps[2]);
  });

  it("solo escribe el episodio nuevo y su temporada", async () => {
    const { m, t1 } = serieBasica();
    const fs = new FsMemoria();
    const almacen = new Almacen(fs, "/datos");
    let escritos = 0;
    fs.alOperar = (op, ruta) => {
      if (op === "renombrar" && ruta.endsWith(".tmp")) escritos++;
    };
    const { cambio } = m.insertarEpisodio(t1.id, 2);
    for (const p of cambio.guardar) await almacen.guardar("s", p);
    expect(escritos).toBe(2);
    expect(cambio.guardar.map((p) => p.tipo).sort()).toEqual(["episodio", "temporada"]);
  });
});
