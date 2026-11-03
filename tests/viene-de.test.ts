import { describe, expect, it } from "vitest";
import { crearPieza, escribirPieza, leerPieza } from "../src/lib/modelo/ficheros";
import { Modelo } from "../src/lib/modelo/modelo";
import type { Evento } from "../src/lib/modelo/tipos";
import { anadirCausa, causasDe, leerVieneDe, ponerVieneDe, queEs, quitarCausa } from "../src/lib/modelo/viene-de";

function escena(id: string, viene?: unknown): Evento {
  return crearPieza("evento", { id, titulo: id, extra: viene === undefined ? {} : { viene_de: viene } });
}

function con(ev: Evento, v: unknown): Evento {
  const r = { ...ev, extra: { ...ev.extra } };
  ponerVieneDe(r, v);
  return r;
}

const BIDI = String.fromCharCode(0x202e);

describe("Viene de (spec 011, T1)", () => {
  it("añadir y quitar deja las demás entradas igual", () => {
    const rara = { a: 1 };
    const ev = escena("ev-aaaa", ["ev-bbbb", rara, 7]);
    const v = anadirCausa(ev, "ev-cccc");
    expect(v).toEqual(["ev-bbbb", rara, 7, "ev-cccc"]);
    expect(quitarCausa(con(ev, v), { id: "ev-bbbb", i: 0 })).toEqual([rara, 7, "ev-cccc"]);
    // Añadir una que ya está no cambia nada
    expect(anadirCausa(ev, "ev-bbbb")).toEqual(["ev-bbbb", rara, 7]);
  });

  it("sin causas se borra la propiedad", () => {
    const ev = escena("ev-aaaa", ["ev-bbbb"]);
    const v = quitarCausa(ev, { id: "ev-bbbb", i: 0 });
    expect(v).toBeUndefined();
    const sin = con(ev, v);
    expect(Object.hasOwn(sin.extra, "viene_de")).toBe(false);
    expect(escribirPieza(sin)).toBe(escribirPieza(escena("ev-aaaa")));
  });

  it("números, objetos y repetidas se conservan", () => {
    const ev = escena("ev-aaaa", ["ev-bbbb", "ev-bbbb", 3, { x: "y" }]);
    const l = leerVieneDe(ev);
    expect(l).toEqual({ editable: true, entradas: [{ id: "ev-bbbb", i: 0 }, { rara: 3, i: 2 }, { rara: { x: "y" }, i: 3 }] });
    // Quitar una rara quita solo su posición
    expect(quitarCausa(ev, { rara: 3, i: 2 })).toEqual(["ev-bbbb", "ev-bbbb", { x: "y" }]);
    // Y vuelve igual del disco
    const vuelta = leerPieza(escribirPieza(ev), "evento") as Evento;
    expect(vuelta.extra.viene_de).toEqual(["ev-bbbb", "ev-bbbb", 3, { x: "y" }]);
  });

  it("quitar una rara que cambió en disco desde que se pintó no quita otra", () => {
    // Obsidian reescribió la nota: en la posición 2 ya no está el 3
    const ev = escena("ev-aaaa", ["ev-bbbb", 3, "ev-cccc"]);
    expect(quitarCausa(ev, { rara: 3, i: 2 })).toEqual(["ev-bbbb", 3, "ev-cccc"]);
    expect(quitarCausa(escena("ev-aaaa", [{ x: "y" }, "ev-bbbb"]), { rara: { x: "y" }, i: 0 })).toEqual(["ev-bbbb"]);
  });

  it("quitar un id quita sus copias", () => {
    const ev = escena("ev-aaaa", ["ev-bbbb", "ev-cccc", "ev-bbbb"]);
    expect(quitarCausa(ev, { id: "ev-bbbb", i: 0 })).toEqual(["ev-cccc"]);
  });

  it("no lista: no editable, con el valor crudo en una línea, y no se toca", () => {
    const ev = escena("ev-aaaa", "ev-bbbb\ny la otra" + BIDI + "");
    expect(leerVieneDe(ev)).toEqual({ editable: false, crudo: "ev-bbbb y la otra" });
    expect(anadirCausa(ev, "ev-cccc")).toBe("ev-bbbb\ny la otra" + BIDI + "");
    expect(quitarCausa(ev, { id: "ev-bbbb", i: 0 })).toBe("ev-bbbb\ny la otra" + BIDI + "");
    expect(leerVieneDe(escena("ev-aaaa", { de: "ev-b" }))).toEqual({ editable: false, crudo: '{"de":"ev-b"}' });
  });

  it("escena, ya no está o no se entiende", () => {
    const ev = escena("ev-aaaa", ["ev-aaaa", "ev-bbbb", "ev-zzzz", "ep-cccc"]);
    const m = new Modelo({
      serie: crearPieza("serie", { id: "se-aaaa" }),
      puntos: [],
      temporadas: [],
      episodios: [crearPieza("episodio", { id: "ep-cccc" })],
      arcos: [],
      eventos: [ev, crearPieza("evento", { id: "ev-bbbb" })],
      secretos: [],
    });
    expect(queEs(m, "ev-bbbb", "ev-aaaa")).toBe("escena");
    expect(queEs(m, "ev-zzzz", "ev-aaaa")).toBe("ya-no-esta");
    expect(queEs(m, "ep-cccc", "ev-aaaa")).toBe("no-se-entiende");
    expect(queEs(m, "[[T01E03]]", "ev-aaaa")).toBe("no-se-entiende");
    expect(queEs(m, "T01E03", "ev-aaaa")).toBe("no-se-entiende");
    expect(queEs(m, "ev-aaaa", "ev-aaaa")).toBe("no-se-entiende");
    expect(causasDe(m, ev)).toEqual(["ev-bbbb"]);
  });

  it("un __proto__ de primer nivel no da un viene_de heredado", () => {
    const texto = "---\nid: ev-aaaa\ntipo: evento\n__proto__:\n  viene_de: [ev-bbbb]\n---\n";
    const ev = leerPieza(texto, "evento") as Evento;
    expect(leerVieneDe(ev)).toEqual({ editable: true, entradas: [] });
  });
});
