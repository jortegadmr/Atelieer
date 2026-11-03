import { describe, expect, it } from "vitest";
import { comprobar } from "../../src/lib/comprobaciones";
import { copiaModelo } from "../../src/lib/consecuencias/copia";
import { afectadas } from "../../src/lib/consecuencias/huellas";
import type { Modelo } from "../../src/lib/modelo/modelo";
import * as op from "../../src/lib/modelo/operaciones";
import type { Cambio } from "../../src/lib/modelo/modelo";
import type { Pieza } from "../../src/lib/modelo/tipos";
import { serieBasica } from "./ayuda";

const aplicar = (m: Modelo, cambio: Cambio) => {
  for (const p of cambio.borrar) m.quitar(p.id);
  for (const p of cambio.guardar) m.poner(p);
};
const cambiar = (m: Modelo, id: string, fn: (p: never) => unknown) => {
  const p = structuredClone(m.pieza(id)) as Pieza;
  fn(p as never);
  m.poner(p);
};
/** Afectadas entre la base y el modelo, con un mapa id → frases */
function comparar(base: Modelo, m: Modelo, abierta = "") {
  const l = afectadas(base, m, comprobar(base).avisos, comprobar(m).avisos, abierta);
  return { l, f: new Map(l.map((a) => [a.id, a.frases])) };
}

describe("otras piezas afectadas (spec 005, RF-7)", () => {
  it("mover una escena: renumera las vecinas y cambia de episodio, sin la abierta", () => {
    const { b, e1, e2, s1, s2, s3, s4 } = serieBasica();
    const m = b.modelo();
    const base = copiaModelo(m);
    aplicar(m, op.moverEvento(m, s1, e2, 0));
    const { f, l } = comparar(base, m, s1);
    expect(f.has(s1)).toBe(false);
    expect(f.get(s2)).toEqual(["Escena 2 → 1"]);
    expect(f.get(s3)).toEqual(["Escena 3 → 2"]);
    expect(f.get(s4)).toEqual(["Escena 1 → 2"]);
    expect(f.get(e1)).toEqual(["3 → 2 escenas", "Trama dominante: El eco → ninguna"]);
    expect(f.get(e2)).toEqual(["1 → 2 escenas"]);
    // En el orden de la serie: episodios antes que escenas
    expect(l.map((a) => a.id).slice(0, 2)).toEqual([e1, e2]);
    // Sin la abierta, ella sale con su paso de episodio
    expect(comparar(base, m).f.get(s1)).toEqual(["De T01E01 a T01E02"]);
  });

  it("acto, bandeja, carga y trama dominante", () => {
    const { b, e1, e2, s2, s3 } = serieBasica();
    const carta = b.arco({ titulo: "La cinta", tipo_trama: "B", tipo_arco: "trama" });
    const m = b.modelo();
    const base = copiaModelo(m);
    cambiar(m, s2, (p: { acto: string }) => (p.acto = "2"));
    aplicar(m, op.moverEvento(m, s3, ""));
    cambiar(m, e2, (p: { carga: [string, string] }) => (p.carga = ["+", "-"]));
    cambiar(m, e1, (p: { dominante_manual: string }) => (p.dominante_manual = carta));
    const { f } = comparar(base, m);
    expect(f.get(s2)).toContain("Pasa al acto Desarrollo");
    expect(f.get(s3)).toEqual(["De T01E01 a la bandeja de T01"]);
    expect(f.get(e2)).toContain("Carga · · → + -");
    expect(f.get(e1)).toContain("Trama dominante: El eco → La cinta");
  });

  it("insertar un episodio cambia los códigos de los de detrás, no los arcos", () => {
    const { b, t, e1, e2, a } = serieBasica();
    const m = b.modelo();
    const base = copiaModelo(m);
    const { pieza, cambio } = op.insertarEpisodio(m, t, 0);
    aplicar(m, cambio);
    const { f } = comparar(base, m);
    expect(f.get(e1)).toEqual(["T01E01 → T01E02"]);
    expect(f.get(e2)).toEqual(["T01E02 → T01E03"]);
    expect(f.get(pieza.id)).toEqual(["Nueva"]);
    expect(f.get(t)).toEqual(["2 → 3 episodios"]);
    expect(f.has(a)).toBe(false);
  });

  it("cambiar el orden de las temporadas cambia los códigos de sus episodios; editar un episodio, no el de sus vecinos", () => {
    const { b, t, e1, e2 } = serieBasica();
    const t2 = b.temporada({ titulo: "Segunda" }, 1);
    const m = b.modelo();
    const base = copiaModelo(m);
    cambiar(m, e1, (p: { titulo: string }) => (p.titulo = "Otro"));
    expect(comparar(base, m).f.has(e2)).toBe(false);
    cambiar(m, m.serie.id, (p: { temporadas: string[] }) => (p.temporadas = [t2.id, t]));
    const { f } = comparar(base, m);
    expect(f.get(e2)).toEqual(["T01E02 → T02E02"]);
    expect(f.get(t2.eps[0])).toEqual(["T02E01 → T01E01"]);
  });

  it("nueva, a la papelera y solo cambió en disco", () => {
    const { b, s2, s4 } = serieBasica();
    const m = b.modelo();
    const base = copiaModelo(m);
    aplicar(m, op.borrarPieza(m, s4));
    cambiar(m, s2, (p: { descripcion: string }) => (p.descripcion = "Otra cosa"));
    const { f, l } = comparar(base, m);
    expect(f.get(s4)).toEqual(["A la papelera"]);
    expect(l.find((x) => x.id === s4)!.borrada).toBe(true);
    expect(f.get(s2)).toEqual(["Cambió su nota"]);
  });

  it("arco: pasa también por, deja de pasar por, empieza y acaba", () => {
    const { b, e1, e2, s1, s4, a } = serieBasica();
    const m = b.modelo();
    const base = copiaModelo(m);
    aplicar(m, op.moverEvento(m, s4, e1));
    expect(comparar(base, m).f.get(a)).toEqual(expect.arrayContaining(["Acaba en T01E02 → T01E01", "Deja de pasar por T01E02"]));
    const m2 = copiaModelo(base);
    aplicar(m2, op.moverEvento(m2, s1, e2, 0));
    expect(comparar(base, m2).f.get(a)).toEqual(expect.arrayContaining(["Empieza en T01E01 → T01E02", "Deja de pasar por T01E01"]));
    // Una escena de E01 que se suma al arco: pasa también por… (aquí ya pasaba por E01) y por E02 al mover otra
    const m3 = copiaModelo(base);
    cambiar(m3, s1, (p: { arcos: { arco: string; papel: string }[] }) => (p.arcos = []));
    const m4 = copiaModelo(m3);
    cambiar(m4, s1, (p: { arcos: { arco: string; papel: string }[] }) => (p.arcos = [{ arco: a, papel: "abre" }]));
    expect(comparar(m3, m4).f.get(a)).toEqual(expect.arrayContaining(["Pasa también por T01E01"]));
  });

  it("secreto: la revelación y una pista cambian de episodio", () => {
    const { b, e1, e2, s1, s4 } = serieBasica();
    const sc = b.secreto({ titulo: "La señal", revelado_en: { episodio: "", evento: s4 }, pistas: [{ episodio: "", evento: s1, texto: "", clase: "pista" }] as never });
    const m = b.modelo();
    const base = copiaModelo(m);
    aplicar(m, op.moverEvento(m, s4, e1));
    aplicar(m, op.moverEvento(m, s1, e2));
    expect(comparar(base, m).f.get(sc)).toEqual(expect.arrayContaining(["La revelación pasa de T01E02 a T01E01", "Una pista pasa de T01E01 a T01E02"]));
  });
});
