import { describe, expect, it } from "vitest";
import { formatoMedida, lineasDe, medir, textoMostrado } from "../src/lib/guion/paginas";
import { MEDIDAS } from "../src/lib/guion/tipos";

const palabras = (n: number, largo = 4) => Array.from({ length: n }, () => "a".repeat(largo)).join(" ");

describe("Páginas del guion (spec 013, T5)", () => {
  it("las medidas son las del plan: 60 / 35 / 25 y 55 líneas", () => {
    expect(MEDIDAS.ancho.accion).toBe(60);
    expect(MEDIDAS.ancho.encabezado).toBe(60);
    expect(MEDIDAS.ancho.dialogo).toBe(35);
    expect(MEDIDAS.ancho.parentesis).toBe(25);
    expect(MEDIDAS.lineasPagina).toBe(55);
  });

  it("una línea de acción de 60 caracteres es una; de 61, dos", () => {
    expect(lineasDe("a".repeat(60), 60)).toBe(1);
    expect(lineasDe(`${"a".repeat(30)} ${"b".repeat(29)}`, 60)).toBe(1);
    expect(lineasDe(`${"a".repeat(30)} ${"b".repeat(30)}`, 60)).toBe(2);
  });

  it("el diálogo parte a 35 y el paréntesis a 25", () => {
    const frase = palabras(10, 5); // 59 caracteres
    expect(medir(`VERA\n${frase}`).lineas).toBe(1 + 2);
    expect(medir(`VERA\n(${palabras(6, 5)})\nx`).lineas).toBe(1 + 2 + 1);
  });

  it("una palabra más larga que el ancho se parte por caracteres", () => {
    expect(lineasDe("a".repeat(130), 60)).toBe(3);
    expect(lineasDe(`hola ${"a".repeat(130)}`, 60)).toBe(4);
  });

  it("cuenta la línea en blanco entre elementos, no las de los extremos", () => {
    expect(medir("INT. TALLER\n\nLa luz.").lineas).toBe(3);
    expect(medir("\n\nINT. TALLER\n\nLa luz.\n\n\n").lineas).toBe(3);
  });

  it("55 líneas = 1 página = 60 s", () => {
    const m = medir(Array.from({ length: 55 }, () => "x").join("\n"));
    expect(m.lineas).toBe(55);
    expect(m.paginas).toBe(1);
    expect(m.segundos).toBe(60);
    expect(medir(Array.from({ length: 110 }, () => "x").join("\n")).paginas).toBe(2);
  });

  it("una referencia mide su nombre, no su enlace", () => {
    expect(textoMostrado("Entra [[Vera]] y [[Vera|la Gaviota]].")).toBe("Entra Vera y la Gaviota.");
    const largoEnlace = `[[01_Wiki/Personajes/Vera|Vera]]`;
    expect(medir(`${largoEnlace} ${"a".repeat(54)}`).lineas).toBe(1);
    expect(medir(`${"[[01_Wiki/Personajes/Vera|Vera]] ".repeat(2)}${"a".repeat(50)}`).lineas).toBe(1);
  });

  it("los encabezados se miden en mayúsculas", () => {
    expect(medir("INT. ß").lineas).toBe(1);
  });

  it("solo el encabezado ≈ 0,0 págs; sin texto, 0", () => {
    const m = medir("INT. TALLER – NOCHE");
    expect(m.lineas).toBe(1);
    expect(m.paginas.toFixed(1)).toBe("0.0");
    expect(medir("").lineas).toBe(0);
    expect(medir("  \n\n").lineas).toBe(0);
  });

  it("más de 500 págs supera el tope", () => {
    const largo = Array.from({ length: 55 * 500 + 1 }, () => "x").join("\n");
    expect(medir(largo).superaTope).toBe(true);
    expect(medir(Array.from({ length: 55 * 500 }, () => "x").join("\n")).superaTope).toBe(false);
  });

  it("formato: una decimal y siempre ≈", () => {
    expect(formatoMedida({ paginas: 2.4, segundos: 144 })).toBe("2,4 págs ≈ 2 min 24 s");
    expect(formatoMedida({ paginas: 3, segundos: 180 })).toBe("3,0 págs ≈ 3 min");
    expect(formatoMedida({ paginas: 0.0182, segundos: 1.09 })).toBe("0,0 págs ≈ 1 s");
  });

  it("medir una escena de 3 págs lleva menos de 50 ms", () => {
    const escena = Array.from({ length: 40 }, (_, i) => `INT. SITIO ${i}\n\nLa luz parpadea y alguien entra sin hacer ruido.\n\nVERA\n(en voz baja)\n¿Hugo? ${palabras(12)}\n`).join("\n");
    const t0 = performance.now();
    medir(escena);
    expect(performance.now() - t0).toBeLessThan(50);
  });
});
