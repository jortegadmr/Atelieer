import { describe, expect, it } from "vitest";
import { anadirTarjeta, crearNota } from "../src/lib/pizarra/operaciones";
import { estadoTarjeta, ordenLectura, piezasParaTarjeta } from "../src/lib/pizarra/resolver";
import { vacia, type Elemento, type Pizarra, type Tarjeta } from "../src/lib/pizarra/tipos";
import { Constructor } from "./fixtures/constructor";

/** Una serie con dos episodios, una escena, un arco y un secreto */
function serie(over: { tituloEscena?: string; episodioEscena?: number; arcoMadurez?: "idea" | "descartado" } = {}) {
  const b = new Constructor();
  const t = b.temporada({ titulo: "Primera" });
  const e1 = b.episodio(t.id, { id: "ep-1", titulo: "Piloto" });
  const e2 = b.episodio(t.id, { id: "ep-2", titulo: "La inundación" });
  const ev = b.evento({ id: "ev-1", titulo: over.tituloEscena ?? "Llega Telmo", episodio: over.episodioEscena === 2 ? e2 : e1 });
  const ar = b.arco({ id: "ar-1", titulo: "La señal", madurez: over.arcoMadurez ?? "idea" });
  const sc = b.secreto({ id: "sc-1", titulo: "El acuerdo" });
  return { m: b.modelo(), t: t.id, e1, e2, ev, ar, sc };
}

const tarjeta = (pieza: string, id = `pz-${pieza}`): Tarjeta => ({ tipo: "tarjeta", id, pieza, x: 0, y: 0, extra: {} });
const pizarraCon = (...e: Elemento[]): Pizarra => ({ ...vacia(), elementos: e });

describe("Tarjetas y piezas (spec 012, T7)", () => {
  it("cada tarjeta se resuelve con el título y el tipo de su pieza", () => {
    const { m } = serie();
    const v = (id: string) => estadoTarjeta(m, tarjeta(id));
    expect(v("ep-1")).toMatchObject({ tipo: "episodio", titulo: "Piloto", estado: "ok", detalle: "T01E01" });
    expect(v("ev-1")).toMatchObject({ tipo: "escena", titulo: "Llega Telmo", estado: "ok", detalle: "T01E01 · 1" });
    expect(v("ar-1")).toMatchObject({ tipo: "arco", titulo: "La señal", estado: "ok" });
    expect(v("sc-1")).toMatchObject({ tipo: "secreto", titulo: "El acuerdo", estado: "ok" });
  });

  it("la tarjeta sigue a la pieza por su id aunque cambie el título o la temporada", () => {
    const t = tarjeta("ev-1");
    expect(estadoTarjeta(serie().m, t)).toMatchObject({ titulo: "Llega Telmo", detalle: "T01E01 · 1" });
    const cambiada = serie({ tituloEscena: "Telmo se marcha", episodioEscena: 2 }).m;
    expect(estadoTarjeta(cambiada, t)).toMatchObject({ titulo: "Telmo se marcha", detalle: "T01E02 · 1", estado: "ok" });
  });

  it("una pieza descartada se marca", () => {
    const { m } = serie({ arcoMadurez: "descartado" });
    expect(estadoTarjeta(m, tarjeta("ar-1"))).toMatchObject({ estado: "descartada", titulo: "La señal" });
  });

  it("una pieza que no se encuentra se ve como ausente y, si vuelve, se resuelve sola", () => {
    const t = tarjeta("ev-9");
    const sin = estadoTarjeta(serie().m, t);
    expect(sin).toMatchObject({ estado: "ausente", tipo: null, titulo: "(pieza no encontrada)" });
    const b = new Constructor();
    const te = b.temporada({}, 1);
    b.evento({ id: "ev-9", titulo: "Ha vuelto", episodio: te.eps[0] });
    expect(estadoTarjeta(b.modelo(), t)).toMatchObject({ estado: "ok", titulo: "Ha vuelto" });
  });

  it("una temporada o un punto no son piezas de tarjeta: se ven como ausentes", () => {
    const { m, t } = serie();
    expect(estadoTarjeta(m, tarjeta(t)).estado).toBe("ausente");
  });

  it("el buscador encuentra por título y por código, sin tildes ni mayúsculas", () => {
    const { m } = serie();
    const p = vacia();
    expect(piezasParaTarjeta(m, p, "TELMO").map((x) => x.id)).toEqual(["ev-1"]);
    expect(piezasParaTarjeta(m, p, "la inundacion").map((x) => x.id)).toEqual(["ep-2"]);
    expect(piezasParaTarjeta(m, p, "t01e02").map((x) => x.id)).toEqual(["ep-2"]);
    expect(piezasParaTarjeta(m, p, "acuerdo").map((x) => [x.id, x.tipo])).toEqual([["sc-1", "secreto"]]);
    expect(piezasParaTarjeta(m, p, "zzz")).toEqual([]);
  });

  it("sin texto salen las cuatro clases, episodios primero y escenas en orden de emisión", () => {
    const { m } = serie();
    expect(piezasParaTarjeta(m, vacia(), "").map((x) => x.id)).toEqual(["ep-1", "ep-2", "ev-1", "ar-1", "sc-1"]);
  });

  it("no ofrece las piezas que ya tienen tarjeta y marca las descartadas", () => {
    const { m } = serie({ arcoMadurez: "descartado" });
    const p = pizarraCon(tarjeta("ev-1"));
    const ids = piezasParaTarjeta(m, p, "").map((x) => x.id);
    expect(ids).not.toContain("ev-1");
    const arco = piezasParaTarjeta(m, p, "señal")[0];
    expect(arco).toMatchObject({ id: "ar-1", descartada: true });
    expect(piezasParaTarjeta(m, p, "piloto")[0].descartada).toBe(false);
  });

  it("no ofrece nada que no sea episodio, escena, arco o secreto", () => {
    const { m, t } = serie();
    const ids = piezasParaTarjeta(m, vacia(), "").map((x) => x.id);
    expect(ids).not.toContain(t);
    expect(ids).not.toContain(m.serie.id);
  });

  it("limita los resultados", () => {
    const b = new Constructor();
    const te = b.temporada({}, 1);
    for (let i = 0; i < 50; i++) b.evento({ titulo: `Escena ${i}`, episodio: te.eps[0] });
    expect(piezasParaTarjeta(b.modelo(), vacia(), "escena")).toHaveLength(30);
    expect(piezasParaTarjeta(b.modelo(), vacia(), "escena", 5)).toHaveLength(5);
  });

  it("lo que ofrece sirve para añadir la tarjeta", () => {
    const { m } = serie();
    const [primera] = piezasParaTarjeta(m, vacia(), "telmo");
    const r = anadirTarjeta(vacia(), primera.id, { x: 0, y: 0 });
    expect("error" in r).toBe(false);
    // Y una vez puesta, ya no se ofrece
    if (!("error" in r)) expect(piezasParaTarjeta(m, r.pizarra, "telmo")).toEqual([]);
  });

  it("el orden de lectura es de arriba abajo y, a igual altura, de izquierda a derecha", () => {
    const n = (id: string, x: number, y: number): Elemento => {
      const r = crearNota(vacia(), { x, y }, id);
      if ("error" in r) throw new Error(r.error);
      return r.pizarra.elementos[0];
    };
    const p = pizarraCon(n("d", 300, 100), n("b", 200, 0), n("a", 0, 0), n("c", 0, 100));
    expect(ordenLectura(p).map((e) => e.id)).toEqual(["a", "b", "c", "d"]);
    // No cambia el apilado de la pizarra
    expect(p.elementos.map((e) => e.id)).toEqual(["d", "b", "a", "c"]);
  });
});
