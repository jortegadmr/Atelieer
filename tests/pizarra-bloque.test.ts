import { describe, expect, it } from "vitest";
import { escribirPizarra, leerPizarra, MAX_FICHERO } from "../src/lib/pizarra/formato";
import { planteamiento } from "../src/lib/sala/planteamiento";
import { limpiar } from "../src/lib/sala/texto";
import { vacia } from "../src/lib/pizarra/tipos";

// Revisión de seguridad de la spec 012 (T17): el bloque json se busca en una pasada
// y los caracteres invisibles no llegan al planteamiento.

const U = (...h: number[]) => String.fromCharCode(...h);

describe("bloque json de la pizarra", () => {
  it("muchas aperturas sin cierre no cuelgan la lectura", () => {
    const texto = "```json\n".repeat(30_000);
    const inicio = performance.now();
    const r = leerPizarra(texto);
    expect("ilegible" in r).toBe(true);
    expect(performance.now() - inicio).toBeLessThan(200);
    const inicio2 = performance.now();
    escribirPizarra(vacia(), texto);
    expect(performance.now() - inicio2).toBeLessThan(200);
  });

  it("un fichero de más del tope es ilegible sin intentar leerlo", () => {
    const r = leerPizarra("x".repeat(MAX_FICHERO + 1));
    expect("ilegible" in r && r.ilegible).toMatch(/demasiado grande/);
  });

  it("lee un bloque con saltos de Windows, vacío o seguido de más texto, y lo reescribe en su sitio", () => {
    const base = escribirPizarra(vacia());
    const win = base.replace(/\n/g, "\r\n") + "\r\nnota del autor\r\n";
    const r = leerPizarra(win);
    expect("pizarra" in r).toBe(true);
    expect(escribirPizarra(vacia(), win)).toContain("nota del autor");
    expect("ilegible" in leerPizarra("# x\n```json\n```\n")).toBe(true);
  });

  it("sin cierre no hay bloque", () => {
    expect("ilegible" in leerPizarra("# x\n```json\n{}\n")).toBe(true);
  });
});

describe("caracteres invisibles en el planteamiento", () => {
  it("la marca de letra árabe y los de ancho cero no llegan al título, el tipo ni la etiqueta", () => {
    const sucio = `A${U(0x061c)}B${U(0x200b)}C${U(0x2060)}D${U(0xfeff)}E`;
    const t = planteamiento({ tipo: sucio, titulo: sucio, estado: sucio, secciones: [], notas: [{ texto: sucio, etiqueta: sucio, direccion: "llega", x: 0, y: 0 }] }).texto;
    expect(t).toContain("ABCDE");
    for (const c of [0x061c, 0x200b, 0x2060, 0xfeff]) expect(t.includes(U(c))).toBe(false);
  });

  it("limpiar quita los de ancho cero pero deja el unidor de los emojis compuestos", () => {
    expect(limpiar(`a${U(0x200b)}${U(0x2060)}b`)).toBe("ab");
    expect(limpiar("👩‍👩‍👧")).toContain(U(0x200d));
  });
});
