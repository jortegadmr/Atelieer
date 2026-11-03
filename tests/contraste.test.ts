import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COLORES } from "../src/lib/pizarra/tipos";

// Spec 012, T10g (RNF-7): el texto de una nota se lee sobre cada uno de sus seis
// fondos, en claro y en oscuro, y el borde de foco se ve contra el lienzo.

const CSS = readFileSync(new URL("../src/estilo/tokens.css", import.meta.url), "utf8");

/** Las variables de color de un bloque, desde su cabecera hasta la llave que lo cierra */
function variables(cabecera: string): Map<string, string> {
  const i = CSS.indexOf(cabecera);
  if (i < 0) throw new Error(`No está el bloque ${cabecera}`);
  const fin = CSS.indexOf("}", i);
  const cuerpo = CSS.slice(i + cabecera.length, fin);
  return new Map([...cuerpo.matchAll(/(--[\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})\b/g)].map((m) => [m[1], m[2]]));
}

function luminancia(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const TEMAS = [
  { nombre: "claro", vars: variables(":root{") },
  { nombre: "oscuro", vars: variables(':root[data-theme="dark"]{') },
];

describe("Contraste de la pizarra (spec 012, T10g)", () => {
  for (const tema of TEMAS) {
    describe(`tema ${tema.nombre}`, () => {
      for (const c of COLORES) {
        it(`el texto sobre la nota ${c.nombre.toLowerCase()} llega a 4,5:1`, () => {
          const fondo = tema.vars.get(`--nota-${c.id}`);
          expect(fondo, `falta --nota-${c.id}`).toBeDefined();
          expect(contraste(tema.vars.get("--ink")!, fondo!)).toBeGreaterThanOrEqual(4.5);
        });
      }

      it("el borde de foco se distingue del lienzo y de las notas (3:1)", () => {
        const acento = tema.vars.get("--accent")!;
        expect(contraste(acento, tema.vars.get("--surface-2")!)).toBeGreaterThanOrEqual(3);
        for (const c of COLORES) expect(contraste(acento, tema.vars.get(`--nota-${c.id}`)!), c.nombre).toBeGreaterThanOrEqual(3);
      });

      it("la flecha y su etiqueta se leen sobre el lienzo", () => {
        expect(contraste(tema.vars.get("--ink-2")!, tema.vars.get("--surface-2")!)).toBeGreaterThanOrEqual(4.5);
        expect(contraste(tema.vars.get("--ink")!, tema.vars.get("--surface-2")!)).toBeGreaterThanOrEqual(4.5);
      });
    });
  }

  it("los seis colores tienen nombre en texto para quien no los distingue", () => {
    expect(COLORES.map((c) => c.nombre)).toEqual(["Ámbar", "Rosa", "Verde", "Azul", "Lila", "Gris"]);
  });

  it("el tema oscuro automático y el forzado llevan los mismos fondos", () => {
    const auto = new Map([...CSS.slice(CSS.indexOf("@media (prefers-color-scheme:dark)")).matchAll(/(--nota-[\w]+):(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
    const forzado = TEMAS[1].vars;
    for (const c of COLORES) expect(auto.get(`--nota-${c.id}`)).toBe(forzado.get(`--nota-${c.id}`));
  });
});

// Spec 013, T20 (RNF-7): el texto del guion y las referencias se leen sobre la hoja
// (--surface), en claro y en oscuro.
describe("Contraste del guion (spec 013, T20)", () => {
  for (const tema of TEMAS) {
    describe(`tema ${tema.nombre}`, () => {
      const hoja = () => tema.vars.get("--surface")!;
      it("el texto del guion llega a 4,5:1", () => {
        expect(contraste(tema.vars.get("--ink")!, hoja())).toBeGreaterThanOrEqual(4.5);
      });
      it("las referencias a una ficha llegan a 4,5:1", () => {
        expect(contraste(tema.vars.get("--accent")!, hoja())).toBeGreaterThanOrEqual(4.5);
      });
      it("las referencias sin ficha y las notas de margen llegan a 4,5:1", () => {
        expect(contraste(tema.vars.get("--ink-3")!, hoja())).toBeGreaterThanOrEqual(4.5);
        expect(contraste(tema.vars.get("--ink-2")!, hoja())).toBeGreaterThanOrEqual(4.5);
      });
    });
  }
});
