import { describe, expect, it } from "vitest";
import { generarPruebaGrande } from "../../scripts/datos-grande";
import { copiaModelo } from "../../src/lib/consecuencias/copia";
import { crearPieza, escribirPieza } from "../../src/lib/modelo/ficheros";
import { Modelo } from "../../src/lib/modelo/modelo";
import type { Pieza } from "../../src/lib/modelo/tipos";
import type { TipoPieza } from "../../src/lib/modelo/vocabulario";
import { modeloQuedaria, sacarDeVariante, seguirSerie } from "../../src/lib/variantes/quedaria";
import { CAMPOS_REFERENCIA, referenciasDe, valoresEn } from "../../src/lib/variantes/referencias";
import { variante } from "../../src/lib/variantes/tipos";
import { serieBasica } from "../consecuencias/ayuda";

function modelo() {
  const x = serieBasica();
  const b = x.b;
  return { ...x, m: new Modelo({ serie: b.serie, puntos: b.puntos, temporadas: b.temporadas, episodios: b.episodios, arcos: b.arcos, eventos: b.eventos, secretos: b.secretos }) };
}

const media = (veces: number, fn: (i: number) => void) => {
  fn(-1);
  const t = performance.now();
  for (let i = 0; i < veces; i++) fn(i);
  return (performance.now() - t) / veces;
};

describe("«Cómo quedaría» (spec 006)", () => {
  it("es la serie con las piezas de la variante encima: cambiadas, nuevas y a la papelera", () => {
    const { m, s1, s2 } = modelo();
    const v = variante("va-aaaa", "x", "");
    const cambiada = { ...m.eventos.get(s1)!, titulo: "Cambiada" };
    const nueva = crearPieza("evento", { id: "ev-nuev", titulo: "Nueva" });
    v.piezas.set(s1, { tipo: "evento", base: escribirPieza(m.eventos.get(s1)!), pieza: cambiada });
    v.piezas.set("ev-nuev", { tipo: "evento", base: null, pieza: nueva });
    v.piezas.set(s2, { tipo: "evento", base: escribirPieza(m.eventos.get(s2)!), pieza: null });
    const q = modeloQuedaria(m, v);
    expect(q.eventos.get(s1)!.titulo).toBe("Cambiada");
    expect(q.eventos.get("ev-nuev")).toBe(nueva);
    expect(q.eventos.has(s2)).toBe(false);
    // La serie no se toca
    expect(m.eventos.get(s1)!.titulo).toBe("Uno");
    expect(m.eventos.has("ev-nuev")).toBe(false);
    expect(m.eventos.has(s2)).toBe(true);
  });

  it("lo que la variante no toca sigue a la serie; lo que toca, no", () => {
    const { m, s1, s3, s4 } = modelo();
    const v = variante("va-aaaa", "x", "");
    v.piezas.set(s1, { tipo: "evento", base: "", pieza: { ...m.eventos.get(s1)!, titulo: "De la variante" } });
    const q = modeloQuedaria(m, v);
    const antes = copiaModelo(m);
    m.poner({ ...m.eventos.get(s1)!, titulo: "Cambió en la serie" } as Pieza);
    m.poner({ ...m.eventos.get(s3)!, titulo: "Tres, cambiada fuera" } as Pieza);
    m.quitar(s4);
    m.poner(crearPieza("evento", { id: "ev-ctrl", titulo: "Idea con Ctrl I" }));
    const ids = seguirSerie(q, m, antes, v);
    expect(ids.sort()).toEqual([s3, s4, "ev-ctrl"].sort());
    expect(q.eventos.get(s1)!.titulo).toBe("De la variante");
    expect(q.eventos.get(s3)!.titulo).toBe("Tres, cambiada fuera");
    expect(q.eventos.has(s4)).toBe(false);
    expect(q.eventos.has("ev-ctrl")).toBe(true);
  });

  it("también sigue a la serie misma (su nota)", () => {
    const { m } = modelo();
    const q = modeloQuedaria(m, variante("va-aaaa", "x", ""));
    const antes = copiaModelo(m);
    m.poner({ ...m.serie, premisa: "Nueva premisa" });
    expect(seguirSerie(q, m, antes, variante("va-aaaa", "x", ""))).toEqual([m.serie.id]);
    expect(q.serie.premisa).toBe("Nueva premisa");
  });

  it("la pieza que sale de la variante queda con lo de la serie de ahora, no con lo de antes", () => {
    const { m, s1 } = modelo();
    const v = variante("va-aaaa", "x", "");
    v.piezas.set(s1, { tipo: "evento", base: "", pieza: { ...m.eventos.get(s1)!, titulo: "De la variante" } });
    v.piezas.set("ev-nuev", { tipo: "evento", base: null, pieza: crearPieza("evento", { id: "ev-nuev" }) });
    const q = modeloQuedaria(m, v);
    m.poner({ ...m.eventos.get(s1)!, titulo: "Lo de ahora" } as Pieza);
    sacarDeVariante(q, m, [s1, "ev-nuev"]);
    expect(q.eventos.get(s1)).toBe(m.eventos.get(s1));
    expect(q.eventos.has("ev-nuev")).toBe(false);
  });

  it("serie grande: abrir una variante de 50 piezas en menos de 300 ms y seguir a la serie en menos de 20 ms", () => {
    const m = new Modelo(generarPruebaGrande());
    const v = variante("va-aaaa", "x", "");
    for (const ev of [...m.eventos.values()].slice(0, 50)) v.piezas.set(ev.id, { tipo: "evento", base: "", pieza: { ...ev, titulo: `${ev.titulo}!` } });
    const abrir = media(5, () => void modeloQuedaria(m, v));
    const q = modeloQuedaria(m, v);
    const otros = [...m.eventos.values()].slice(100, 120);
    const seguir = media(5, (i) => {
      const antes = copiaModelo(m);
      const ev = otros[(i + 1) % otros.length];
      m.poner({ ...m.eventos.get(ev.id)!, titulo: `fuera ${i}` } as Pieza);
      seguirSerie(q, m, antes, v);
    });
    console.log(`Abrir variante: ${abrir.toFixed(1)} ms; seguir a la serie: ${seguir.toFixed(1)} ms`);
    expect(abrir).toBeLessThan(300);
    expect(seguir).toBeLessThan(20);
  });
});

describe("referencias entre piezas (spec 006, choques de referencia)", () => {
  it("cada campo de referencia existe en el esquema de su tipo (si se renombra uno, falla)", () => {
    for (const [tipo, rutas] of Object.entries(CAMPOS_REFERENCIA) as [TipoPieza, readonly string[]][]) {
      const p = tipo === "serie" ? crearPieza("serie", { id: "se-aaaa" }) : crearPieza(tipo, { id: "x-aaaa" } as never);
      for (const ruta of rutas) {
        const raiz = ruta.split(".")[0].replace("[]", "");
        expect(raiz in p, `${tipo}.${ruta}`).toBe(true);
      }
    }
  });

  it("recoge los ids de cada tipo, sin vacíos ni nombres de la wiki", () => {
    const ev = crearPieza("evento", { id: "ev-aaaa", temporada: "te-1", episodio: "ep-1", arcos: [{ arco: "ar-1", papel: "abre" }], personajes: ["Nando"] });
    expect(referenciasDe(ev).sort()).toEqual(["ar-1", "ep-1", "te-1"]);
    const sc = crearPieza("secreto", {
      id: "sc-aaaa",
      revelado_en: { episodio: "ep-9", evento: "" },
      pistas: [{ episodio: "ep-2", evento: "ev-2", texto: "", clase: "" as never }],
      conocen: ["Nando"],
    });
    expect(referenciasDe(sc).sort()).toEqual(["ep-2", "ep-9", "ev-2"]);
    const t = crearPieza("temporada", { id: "te-aaaa", episodios: ["ep-1", "ep-2"], principal: "ar-1" });
    expect(referenciasDe(t).sort()).toEqual(["ar-1", "ep-1", "ep-2"]);
  });

  it("valoresEn recorre listas y objetos anidados", () => {
    expect(valoresEn({ a: [{ b: 1 }, { b: 2 }] }, "a[].b")).toEqual([1, 2]);
    expect(valoresEn({ a: { b: "x" } }, "a.b")).toEqual(["x"]);
    expect(valoresEn({}, "a[].b")).toEqual([]);
  });
});
