import { describe, expect, it } from "vitest";
import { desdeTexto, limitePalabra, tiposDelDocumento } from "../src/lib/guion/documento";
import { consultaLimpia, MAX_CONSULTA, puedeAbrirConArroba, selectorAbierto } from "../src/lib/guion/selector";

const abre = (t: string, l: number, u: number, arroba: { l: number; u: number } | null, cerrado: number | null = null) => {
  const doc = desdeTexto(t);
  return selectorAbierto(doc, { l, u }, tiposDelDocumento(doc), arroba, cerrado);
};

describe("Selector de referencias (spec 013, T14a)", () => {
  it("la @ abre al principio de línea, tras un espacio o tras una referencia, y no en medio de una palabra", () => {
    const d = desdeTexto("hola mundo\n\nabc[[Vera]]");
    expect(puedeAbrirConArroba(d, { l: 0, u: 0 })).toBe(true);
    expect(puedeAbrirConArroba(d, { l: 0, u: 5 })).toBe(true);
    expect(puedeAbrirConArroba(d, { l: 0, u: 3 })).toBe(false);
    expect(puedeAbrirConArroba(d, { l: 2, u: 4 })).toBe(true);
    expect(puedeAbrirConArroba(d, { l: 2, u: 2 })).toBe(false);
  });

  it("con la @ escrita, la consulta es lo que sigue en esa línea", () => {
    expect(abre("Entra @ma", 0, 9, { l: 0, u: 6 })).toEqual({ modo: "arroba", desde: { l: 0, u: 6 }, consulta: "ma" });
    expect(abre("Entra @", 0, 7, { l: 0, u: 6 })?.consulta).toBe("");
  });

  it("se cierra si el cursor se va de la línea, antes de la @ o si la @ ya no está", () => {
    expect(abre("Entra @ma\notra", 1, 2, { l: 0, u: 6 })).toBeNull();
    expect(abre("Entra @ma", 0, 3, { l: 0, u: 6 })).toBeNull();
    expect(abre("Entra xma", 0, 9, { l: 0, u: 6 })).toBeNull();
  });

  it("una consulta demasiado larga ya no es una búsqueda", () => {
    const largo = "a".repeat(MAX_CONSULTA + 1);
    expect(abre(`@${largo}`, 0, largo.length + 1, { l: 0, u: 0 })).toBeNull();
  });

  it("en una línea de personaje se ofrece sin @, hasta que se cierra con Esc", () => {
    const t = "\nVERA\nHola";
    expect(abre(t, 1, 4, null)).toEqual({ modo: "personaje", desde: { l: 1, u: 0 }, consulta: "VERA" });
    expect(abre(t, 1, 4, null, 1)).toBeNull();
    // En una acción normal no
    expect(abre("Una acción", 0, 10, null)).toBeNull();
  });

  it("la extensión del personaje no entra en la consulta", () => {
    expect(consultaLimpia("VERA (V.O.)")).toBe("VERA");
    expect(consultaLimpia("VERA")).toBe("VERA");
  });

  it("limitePalabra salta palabras y trata una referencia como una", () => {
    const d = desdeTexto("uno dos [[Vera]] tres");
    expect(limitePalabra(d, { l: 0, u: 7 }, -1)).toEqual({ l: 0, u: 4 });
    expect(limitePalabra(d, { l: 0, u: 9 }, -1)).toEqual({ l: 0, u: 8 });
    expect(limitePalabra(d, { l: 0, u: 8 }, 1)).toEqual({ l: 0, u: 9 });
    expect(limitePalabra(d, { l: 0, u: 0 }, 1)).toEqual({ l: 0, u: 3 });
  });
});
