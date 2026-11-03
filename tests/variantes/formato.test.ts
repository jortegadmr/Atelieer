import { describe, expect, it } from "vitest";
import { crearPieza, escribirPieza, leerPieza } from "../../src/lib/modelo/ficheros";
import type { Pieza } from "../../src/lib/modelo/tipos";
import { escribirVariante, leerCabecera, leerVariante } from "../../src/lib/variantes/formato";
import { variante, type DatosVariante } from "../../src/lib/variantes/tipos";

/** Un episodio leído de una nota con un campo que la app no entiende y un estado escrito a mano */
const NOTA_EPISODIO = `---
id: ep-a1b2
tipo: episodio
titulo: La traición
temporada: te-0001
madurez: en pausa
campo_mio: algo mío
---
Texto libre con ~~~ y ~~~~~ dentro.
`;

function ejemplo(): DatosVariante {
  const v = variante("va-k2m9", "Nando se va en E05", "2026-10-21 18:20", "ep-a1b2");
  const base = leerPieza(NOTA_EPISODIO, "episodio");
  const cambiado = { ...structuredClone(base), titulo: "La marcha de Nando" } as Pieza;
  v.piezas.set("ep-a1b2", { tipo: "episodio", base: escribirPieza(base), pieza: cambiado });
  v.piezas.set("ev-zz99", { tipo: "evento", base: null, pieza: crearPieza("evento", { id: "ev-zz99", titulo: "Nando duda", episodio: "ep-a1b2" }) });
  const fiesta = crearPieza("episodio", { id: "ep-c3d4", titulo: "Fiesta" });
  v.piezas.set("ep-c3d4", { tipo: "episodio", base: escribirPieza(fiesta), pieza: null });
  v.sitios.set("ep-a1b2", ["ev-1111", "ev-2222"]);
  v.pisa.set("ep-a1b2", { sinopsis: "Nando se va" });
  v.fichas.set("ev-zz99", "La marcha de Nando");
  return v;
}

/** Igual a efectos de disco: el texto de cada nota y lo demás tal cual */
function comoTexto(v: DatosVariante) {
  return {
    ...v,
    piezas: [...v.piezas].map(([id, p]) => [id, p.tipo, p.base, p.pieza ? escribirPieza(p.pieza) : null]),
    sitios: [...v.sitios],
    pisa: [...v.pisa],
    fichas: [...v.fichas],
  };
}

describe("la nota de una variante (spec 006, RF-9)", () => {
  it("ida y vuelta exacta: campos desconocidos, estados a mano y texto con ~~~", () => {
    const v = ejemplo();
    const leida = leerVariante(escribirVariante(v), "va-k2m9.md");
    expect(comoTexto(leida)).toEqual(comoTexto(v));
    const ep = leida.piezas.get("ep-a1b2")!.pieza as Pieza & { extra: Record<string, unknown> };
    expect(ep.extra.campo_mio).toBe("algo mío");
    expect(escribirPieza(ep)).toContain("madurez: en pausa");
    expect(ep.texto).toBe("Texto libre con ~~~ y ~~~~~ dentro.\n");
  });

  it("la valla es más larga que cualquier racha de ~ del contenido", () => {
    const md = escribirVariante(ejemplo());
    expect(md).toContain("~~~~~~atelier pieza episodio ep-a1b2");
  });

  it("una pieza nueva va sin base y una a la papelera, con su bloque «papelera»", () => {
    const md = escribirVariante(ejemplo());
    expect(md).not.toContain("atelier base evento ev-zz99");
    expect(md).toContain("atelier papelera episodio ep-c3d4");
    const leida = leerVariante(md, "va-k2m9.md");
    expect(leida.piezas.get("ev-zz99")!.base).toBeNull();
    expect(leida.piezas.get("ep-c3d4")!.pieza).toBeNull();
  });

  it("se lee también con saltos de línea de Windows", () => {
    const md = escribirVariante(ejemplo()).replace(/\n/g, "\r\n");
    expect(comoTexto(leerVariante(md, "va-k2m9.md"))).toEqual(comoTexto(ejemplo()));
  });

  it("la cabecera se lee sin analizar los bloques, con el índice de piezas", () => {
    const md = escribirVariante(ejemplo()).replace("atelier pieza evento ev-zz99", "atelier pieza evento ev-zz99\n---\nroto: [");
    const c = leerCabecera(md, "va-k2m9.md");
    expect(c.nombre).toBe("Nando se va en E05");
    expect(c.piezas).toEqual(["ep-a1b2", "ev-zz99", "ep-c3d4"]);
    expect(c.origen).toBe("ep-a1b2");
    expect([...c.sitios]).toEqual([["ep-a1b2", ["ev-1111", "ev-2222"]]]);
  });

  it("los títulos para leerla a mano no cuentan al leer", () => {
    const md = escribirVariante(ejemplo(), { titulo: (id) => `T01E05 · ${id}` });
    expect(md).toContain("## T01E05 · ep-a1b2");
    expect(comoTexto(leerVariante(md, "va-k2m9.md"))).toEqual(comoTexto(ejemplo()));
  });
});
