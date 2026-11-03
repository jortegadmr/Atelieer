import { describe, expect, it } from "vitest";
import { generarPruebaGrande } from "../../scripts/datos-grande";
import { comprobar } from "../../src/lib/comprobaciones";
import { GUIA_INICIAL } from "../../src/lib/guia/guia-inicial";
import { leerGuia } from "../../src/lib/guia/guia-md";
import { Modelo } from "../../src/lib/modelo/modelo";
import { moverEvento } from "../../src/lib/modelo/operaciones";
import type { Pieza, PiezaDe } from "../../src/lib/modelo/tipos";
import { diferencias } from "../../src/lib/variantes/diferencias";
import { modeloQuedaria } from "../../src/lib/variantes/quedaria";
import { variante, type DatosVariante } from "../../src/lib/variantes/tipos";
import { serieBasica } from "../consecuencias/ayuda";

const guia = leerGuia(GUIA_INICIAL);

/** En la variante: copia la pieza de lo que se ve, le aplica `fn` y la apunta */
function cambiar<P extends Pieza>(q: Modelo, v: DatosVariante, id: string, fn: (p: P) => unknown) {
  const p = structuredClone(q.pieza(id)) as P;
  fn(p);
  q.poner(p);
  v.piezas.set(id, { tipo: p.tipo, base: "", pieza: p });
}

/** Serie básica con la trama A completa (sin C03) y la escena 3 con C02 */
function preparar() {
  const x = serieBasica();
  const m = x.b.modelo();
  const arco = structuredClone(m.arcos.get(x.a)!) as PiezaDe<"arco">;
  Object.assign(arco, { quiere: "Evitar la desgracia", gana: "Paz", pierde: "La familia", bomba: "La boda" });
  m.poner(arco);
  m.poner({ ...structuredClone(m.eventos.get(x.s3)!), cambio: ["+", "+"] } as Pieza);
  const v = variante("va-aaaa", "x", "");
  const q = modeloQuedaria(m, v);
  return { ...x, m, q, v };
}

const ids = (v: DatosVariante) => new Set(v.piezas.keys());

describe("diferencias entre «Ahora» y «Cómo quedaría» (spec 006, RF-17 a RF-21)", () => {
  it("los grupos: avisos que saltarían (con reglas), lo que cambia la variante (sus piezas primero) y lo que dejaría de avisar", () => {
    const { m, q, v, a, s2, s3 } = preparar();
    cambiar<PiezaDe<"evento">>(q, v, s2, (p) => (p.cambio = ["+", "+"]));
    cambiar<PiezaDe<"arco">>(q, v, a, (p) => (p.quiere = ""));
    cambiar<PiezaDe<"evento">>(q, v, s3, (p) => (p.cambio = ["+", "-"]));
    const d = diferencias(m, q, comprobar(m), comprobar(q), ids(v), guia);
    expect(d.avisos.map((x) => [x.aviso.id, x.aviso.pieza])).toEqual([
      ["C02", s2],
      ["C03", a],
    ]);
    expect(d.avisos.find((x) => x.aviso.id === "C03")!.reglas.length).toBeGreaterThan(0);
    expect(d.piezas.map((p) => [p.id, p.deLaVariante])).toEqual([
      [s2, true],
      [s3, true],
      [a, true],
    ]);
    expect(d.piezas.find((p) => p.id === a)!.campos).toEqual(["Qué quiere y por qué: Evitar la desgracia → vacío"]);
    expect(d.dejan.map((x) => [x.id, x.pieza])).toEqual([["C02", s3]]);
    expect(d.total).toBe(2 + 3);
    expect(d.conAviso).toBe(true);
    expect(d.enVariante).toBe(3);
  });

  it("las piezas afectadas que no son de la variante salen después, sin campos", () => {
    const { m, q, v, s1, e1, e2 } = preparar();
    const cambio = moverEvento(q, s1, e2, 0);
    for (const p of cambio.guardar) {
      q.poner(p);
      v.piezas.set(p.id, { tipo: p.tipo, base: "", pieza: p });
    }
    const d = diferencias(m, q, comprobar(m), comprobar(q), ids(v), guia);
    const afectadas = d.piezas.filter((p) => !p.deLaVariante).map((p) => p.id);
    expect(afectadas).toEqual(expect.arrayContaining([e1, e2]));
    expect(d.piezas.findIndex((p) => !p.deLaVariante)).toBeGreaterThanOrEqual(d.enVariante);
    for (const p of d.piezas.filter((x) => !x.deLaVariante)) expect(p.campos).toEqual([]);
    expect(d.piezas.find((p) => p.id === e2)!.frases.join(" ")).toMatch(/escenas/);
  });

  it("nueva y a la papelera dicen «Nueva en la variante» y «Sale en la variante»", () => {
    const { m, q, v, s4, b } = preparar();
    const nueva = b.evento({ titulo: "Nueva", episodio: m.eventos.get(s4)!.episodio });
    const nuevaPieza = b.modelo().eventos.get(nueva)!;
    q.poner(nuevaPieza);
    v.piezas.set(nueva, { tipo: "evento", base: null, pieza: nuevaPieza });
    q.quitar(s4);
    v.piezas.set(s4, { tipo: "evento", base: "", pieza: null });
    const d = diferencias(m, q, comprobar(m), comprobar(q), ids(v), guia);
    expect(d.piezas.find((p) => p.id === nueva)!.frases).toEqual(["Nueva en la variante"]);
    expect(d.piezas.find((p) => p.id === s4)!.frases).toEqual(["Sale en la variante"]);
  });

  it("sin cambios no hay nada (RF-21)", () => {
    const { m, q, v } = preparar();
    const d = diferencias(m, q, comprobar(m), comprobar(q), ids(v), guia);
    expect([d.avisos, d.piezas, d.dejan, d.total]).toEqual([[], [], [], 0]);
  });

  it("serie grande: diferencias tras editar un título en menos de 50 ms", () => {
    const m = new Modelo(generarPruebaGrande());
    const v = variante("va-aaaa", "x", "");
    const q = modeloQuedaria(m, v);
    const rs = comprobar(m);
    const ev = [...q.eventos.values()][20];
    let total = 0;
    const veces = 5;
    for (let i = 0; i <= veces; i++) {
      cambiar<PiezaDe<"evento">>(q, v, ev.id, (p) => (p.titulo = `Título ${i}`));
      const rq = comprobar(q);
      const t = performance.now();
      diferencias(m, q, rs, rq, ids(v), guia);
      if (i > 0) total += performance.now() - t;
    }
    const ms = total / veces;
    console.log(`Diferencias tras editar un título (serie grande): ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(50);
  });
});
