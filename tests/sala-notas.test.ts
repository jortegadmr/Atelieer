import { describe, expect, it } from "vitest";
import type { Pizarra } from "../src/lib/pizarra/tipos";
import { notasUnidas } from "../src/lib/sala/notas";
import { anadirAlternativa, leerAlternativas } from "../src/lib/wiki/alternativas";

// Spec 012, T13a/b: las notas unidas a una pieza y las alternativas de la ficha.

const pizarra = (elementos: unknown[], flechas: unknown[]): Pizarra => ({ formato: 1, elementos, flechas }) as unknown as Pizarra;
const nota = (id: string, texto: string, x = 0, y = 0) => ({ tipo: "nota", id, texto, color: "ambar", x, y });
const tarjeta = (id: string, pieza: string) => ({ tipo: "tarjeta", id, pieza, x: 0, y: 0 });

describe("notasUnidas", () => {
  it("las que llegan y las que salen, por posición", () => {
    const p = pizarra(
      [tarjeta("t", "ev-1"), nota("n1", "abajo", 0, 200), nota("n2", "arriba", 0, 10), nota("n3", "lejos")],
      [
        { id: "f1", de: "n1", a: "t", etiqueta: "" },
        { id: "f2", de: "t", a: "n2", etiqueta: "provoca" },
      ],
    );
    expect(notasUnidas(p, "ev-1").map((n) => [n.texto, n.direccion])).toEqual([
      ["arriba", "sale"],
      ["abajo", "llega"],
    ]);
  });

  it("sin tarjeta de la pieza, o sin flechas directas, no hay notas", () => {
    expect(notasUnidas(pizarra([nota("n", "x")], []), "ev-1")).toEqual([]);
    expect(notasUnidas(pizarra([tarjeta("t", "ev-1"), nota("n", "x")], []), "ev-1")).toEqual([]);
  });

  it("una flecha entre dos tarjetas o por una nota intermedia no cuenta", () => {
    const p = pizarra(
      [tarjeta("t", "ev-1"), tarjeta("u", "ev-2"), nota("n", "x")],
      [
        { id: "f1", de: "t", a: "u", etiqueta: "" },
        { id: "f2", de: "u", a: "n", etiqueta: "" },
      ],
    );
    expect(notasUnidas(p, "ev-1")).toEqual([]);
  });
});

describe("leerAlternativas", () => {
  it("lee las filas que escribe anadirAlternativa", () => {
    const base = "# Arco\n\n## Alternativas descartadas\n\n| Idea | Por qué se descartó |\n| --- | --- |\n";
    const t = anadirAlternativa(base, "Que muera", "demasiado oscuro");
    expect(t).not.toBeNull();
    expect(leerAlternativas(t!)).toEqual([{ titulo: "Que muera", porque: "demasiado oscuro" }]);
  });

  it("sin tabla devuelve una lista vacía", () => {
    expect(leerAlternativas("# Arco\n\nnada")).toEqual([]);
  });
});
