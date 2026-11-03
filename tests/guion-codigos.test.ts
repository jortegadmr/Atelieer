import { describe, expect, it } from "vitest";
import { codigosDeEscenas } from "../src/lib/guion/codigos";
import { crearPieza } from "../src/lib/modelo/ficheros";
import { Modelo } from "../src/lib/modelo/modelo";
import type { Episodio, Evento, Serie, Temporada } from "../src/lib/modelo/tipos";

const ev = (id: string, episodio: string, orden: number, over: Partial<Evento> = {}) =>
  crearPieza("evento", { id, titulo: id, temporada: "te-a", episodio, orden, ...over }) as Evento;

function modelo(eventos: Evento[], extra: { episodios?: Episodio[]; temporadas?: Temporada[]; serie?: Partial<Serie> } = {}) {
  const serie = crearPieza("serie", { id: "se-1", temporadas: ["te-a"], ...extra.serie }) as Serie;
  const ta = crearPieza("temporada", { id: "te-a", episodios: ["ep-1", "ep-2"] }) as Temporada;
  const e1 = crearPieza("episodio", { id: "ep-1", temporada: "te-a" }) as Episodio;
  const e2 = crearPieza("episodio", { id: "ep-2", temporada: "te-a" }) as Episodio;
  return new Modelo({ serie, puntos: [], temporadas: extra.temporadas ?? [ta], episodios: extra.episodios ?? [e1, e2], arcos: [], eventos, secretos: [] });
}

describe("Código de escena (spec 013, T6)", () => {
  it("T01E02-S03 y S03, por la posición en su episodio", () => {
    const m = modelo([ev("ev-aaaa", "ep-2", 1), ev("ev-bbbb", "ep-2", 2), ev("ev-cccc", "ep-2", 3), ev("ev-dddd", "ep-1", 1)]);
    const c = codigosDeEscenas(m);
    expect(c.get("ev-cccc")).toEqual({ completo: "T01E02-S03", corto: "S03" });
    expect(c.get("ev-dddd")).toEqual({ completo: "T01E01-S01", corto: "S01" });
  });

  it("sigue el orden de la spec 003 (el campo orden), no el de llegada", () => {
    const m = modelo([ev("ev-aaaa", "ep-1", 30), ev("ev-bbbb", "ep-1", 10), ev("ev-cccc", "ep-1", 20)]);
    const c = codigosDeEscenas(m);
    expect([c.get("ev-bbbb")!.corto, c.get("ev-cccc")!.corto, c.get("ev-aaaa")!.corto]).toEqual(["S01", "S02", "S03"]);
  });

  it("reordenar, mover de episodio y borrar renumeran", () => {
    const antes = codigosDeEscenas(modelo([ev("ev-aaaa", "ep-1", 1), ev("ev-bbbb", "ep-1", 2), ev("ev-cccc", "ep-1", 3)]));
    expect(antes.get("ev-cccc")!.corto).toBe("S03");
    const reordenado = codigosDeEscenas(modelo([ev("ev-aaaa", "ep-1", 3), ev("ev-bbbb", "ep-1", 1), ev("ev-cccc", "ep-1", 2)]));
    expect(reordenado.get("ev-aaaa")!.corto).toBe("S03");
    expect(reordenado.get("ev-bbbb")!.corto).toBe("S01");
    const movida = codigosDeEscenas(modelo([ev("ev-aaaa", "ep-1", 1), ev("ev-bbbb", "ep-2", 1), ev("ev-cccc", "ep-1", 3)]));
    expect(movida.get("ev-cccc")!.completo).toBe("T01E01-S02");
    expect(movida.get("ev-bbbb")!.completo).toBe("T01E02-S01");
    const borrada = codigosDeEscenas(modelo([ev("ev-bbbb", "ep-1", 2), ev("ev-cccc", "ep-1", 3)]));
    expect(borrada.get("ev-cccc")!.corto).toBe("S02");
  });

  it("descartar y recuperar una escena no renumera las demás", () => {
    const viva = codigosDeEscenas(modelo([ev("ev-aaaa", "ep-1", 1), ev("ev-bbbb", "ep-1", 2), ev("ev-cccc", "ep-1", 3)]));
    const descartada = codigosDeEscenas(modelo([ev("ev-aaaa", "ep-1", 1), ev("ev-bbbb", "ep-1", 2, { madurez: "descartado", motivo_descarte: "no encaja" } as Partial<Evento>), ev("ev-cccc", "ep-1", 3)]));
    expect(descartada.get("ev-cccc")).toEqual(viva.get("ev-cccc"));
    expect(descartada.get("ev-bbbb")!.corto).toBe("S02");
  });

  it("la bandeja, una escena sin episodio y un episodio sin temporada no tienen código", () => {
    const m = modelo([ev("ev-aaaa", "", 1), ev("ev-bbbb", "ep-inexistente", 1), ev("ev-cccc", "ep-9", 1)], {
      episodios: [crearPieza("episodio", { id: "ep-9", temporada: "te-fuera" }) as Episodio, crearPieza("episodio", { id: "ep-1", temporada: "te-a" }) as Episodio],
    });
    const c = codigosDeEscenas(m);
    expect(c.has("ev-aaaa")).toBe(false);
    expect(c.has("ev-bbbb")).toBe(false);
    expect(c.has("ev-cccc")).toBe(false);
  });

  it("más de 99 escenas en un episodio: tres cifras", () => {
    const eventos = Array.from({ length: 100 }, (_, i) => ev(`ev-${String(i).padStart(4, "0")}`, "ep-1", i + 1));
    const c = codigosDeEscenas(modelo(eventos));
    expect(c.get("ev-0000")!.corto).toBe("S001");
    expect(c.get("ev-0099")!.completo).toBe("T01E01-S100");
    const noventa = codigosDeEscenas(modelo(eventos.slice(0, 99)));
    expect(noventa.get("ev-0098")!.corto).toBe("S99");
  });

  it("con otra temporada, el código del episodio es el suyo", () => {
    const serie = { temporadas: ["te-a", "te-b"] };
    const ta = crearPieza("temporada", { id: "te-a", episodios: ["ep-1"] }) as Temporada;
    const tb = crearPieza("temporada", { id: "te-b", episodios: ["ep-5"] }) as Temporada;
    const m = modelo([ev("ev-aaaa", "ep-5", 1, { temporada: "te-b" })], {
      serie,
      temporadas: [ta, tb],
      episodios: [crearPieza("episodio", { id: "ep-1", temporada: "te-a" }) as Episodio, crearPieza("episodio", { id: "ep-5", temporada: "te-b" }) as Episodio],
    });
    expect(codigosDeEscenas(m).get("ev-aaaa")!.completo).toBe("T02E01-S01");
  });

  it("ningún código se escribe en la pieza", () => {
    const e = ev("ev-aaaa", "ep-1", 1);
    const antes = JSON.stringify(e);
    codigosDeEscenas(modelo([e]));
    expect(JSON.stringify(e)).toBe(antes);
    expect(Object.keys(e.extra)).toEqual([]);
  });
});
