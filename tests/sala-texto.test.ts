import { describe, expect, it } from "vitest";
import { componer, entrecomillar, limpiar, recortarPlanteamiento, unidades, type Seccion } from "../src/lib/sala/texto";

// Spec 012, T11: el texto del autor entra en el planteamiento como texto (RF-26)
// y, si pasa de 100 000 caracteres, se recorta por piezas enteras (RF-27).

const U = (...h: number[]) => String.fromCharCode(...h);
const CAB = "# Planteamiento: La cinta";
const CIERRE = "Quiero decidir:";

const seccion = (clave: Seccion["clave"], titulo: string, lineas: string[], literal = false): Seccion => ({ clave, titulo, lineas, literal });

describe("limpiar", () => {
  it("quita controles y marcas de dirección y conserva los saltos de línea y el tabulador", () => {
    expect(limpiar("a\u0000b\u0007c\nd\te")).toBe("abc\nd\te");
    expect(limpiar("x" + U(0x202e) + "oculto" + U(0x202c) + " y" + U(0x2066) + "z" + U(0x2069) + " " + U(0x200e) + "w" + U(0x200f) + "" + U(0x061c) + "")).toBe("xoculto yz w");
  });

  it("los saltos de Windows, de Mac antiguo y los separadores de Unicode son saltos de línea", () => {
    expect(limpiar("a\r\nb\rc" + U(0x2028) + "d" + U(0x2029) + "e")).toBe("a\nb\nc\nd\ne");
  });

  it("deja intactos el texto normal, los acentos y los emojis", () => {
    expect(limpiar("Telmo dudó 👩‍👩‍👧 — «sí»")).toBe("Telmo dudó 👩‍👩‍👧 — «sí»");
  });
});

describe("entrecomillar", () => {
  it("una valla dentro de la nota no cierra la cita", () => {
    const r = entrecomillar("antes\n```\n# Dentro\n```\ndespués");
    const lineas = r.split("\n");
    expect(lineas[0]).toBe("````");
    expect(lineas.at(-1)).toBe("````");
    // Ninguna línea de dentro cierra una valla de cuatro
    expect(lineas.slice(1, -1).some((l) => /^ {0,3}`{4,}\s*$/.test(l))).toBe(false);
  });

  it("se adapta a rachas más largas de acentos graves", () => {
    const r = entrecomillar("a `````` b");
    expect(r.split("\n")[0]).toBe("`".repeat(7));
  });

  it("`---`, `#` y ``` quedan como texto: todo va dentro de la valla, sin tocar", () => {
    const entrada = "---\n# Título\n> cita\n- lista\n| a | b |\n```";
    const r = entrecomillar(entrada);
    expect(r).toBe("````\n" + entrada + "\n````");
  });

  it("limpia lo que no es texto antes de meterlo", () => {
    expect(entrecomillar("a" + U(0x202e) + "b\u0000c")).toBe("```\nabc\n```");
  });

  it("vacío o solo espacios no deja una valla vacía", () => {
    expect(entrecomillar("")).toBe("");
    expect(entrecomillar("  \n\u0000 ")).toBe("");
  });
});

describe("unidades", () => {
  it("cuenta unidades de texto, no grafemas", () => {
    expect(unidades("abc")).toBe(3);
    // Un emoji de familia es un grafema pero muchas unidades
    expect(unidades("👩‍👩‍👧")).toBe(8);
    expect([...new Intl.Segmenter("es", { granularity: "grapheme" }).segment("👩‍👩‍👧")]).toHaveLength(1);
  });
});

describe("recortarPlanteamiento", () => {
  const base = (): Seccion[] => [
    seccion("estado", "Qué es", ["Arco · en borrador"]),
    seccion("ficha", "Ficha", ["| Campo | Valor |", "| --- | --- |", ...Array.from({ length: 50 }, (_, i) => `| fila ${i} | ${"v".repeat(100)} |`)], true),
    seccion("avisos", "Avisos", ["- Regla R1: falta el título"]),
    seccion("alternativas", "Alternativas descartadas", ["- Una idea descartada"]),
    seccion("notas", "Notas de la pizarra", Array.from({ length: 4 }, (_, i) => entrecomillar(`nota ${i} ` + "n".repeat(150)))),
  ];

  it("si cabe, no toca nada", () => {
    const r = recortarPlanteamiento(CAB, base(), CIERRE, 100_000);
    expect(r.recortado).toBe(false);
    expect(r.aviso).toBeNull();
    expect(r.secciones).toHaveLength(5);
  });

  it("recorta en el orden fijo: primero las notas, luego las alternativas y después la ficha por el final", () => {
    const completo = unidades(componer(CAB, base(), CIERRE));
    const sinNotas = unidades(componer(CAB, base().filter((s) => s.clave !== "notas"), CIERRE));
    const sinAmbas = unidades(componer(CAB, base().filter((s) => s.clave !== "notas" && s.clave !== "alternativas"), CIERRE));
    // Con holgura para el aviso y una alternativa: solo caen las notas
    let r = recortarPlanteamiento(CAB, base(), CIERRE, sinAmbas + 300);
    expect(r.recortado).toBe(true);
    expect(r.secciones.map((s) => s.clave)).toEqual(["estado", "ficha", "avisos", "alternativas"]);
    expect(r.aviso).toMatch(/notas de la pizarra\)/);
    // Más justo: también las alternativas, pero no la ficha
    r = recortarPlanteamiento(CAB, base(), CIERRE, sinAmbas + 150);
    expect(r.secciones.map((s) => s.clave)).toEqual(["estado", "ficha", "avisos"]);
    expect(r.aviso).toMatch(/notas de la pizarra, alternativas descartadas/);
    expect(r.aviso).not.toMatch(/ficha/);
    // Un poco más justo: también cae el final de la ficha, no el principio
    r = recortarPlanteamiento(CAB, base(), CIERRE, sinAmbas - 800);
    const ficha = r.secciones.find((s) => s.clave === "ficha")!;
    expect(ficha.lineas[0]).toBe("| Campo | Valor |");
    expect(ficha.lineas.length).toBeLessThan(52);
    expect(ficha.lineas.at(-1)).not.toBe("| fila 49 | " + "v".repeat(100) + " |");
    expect(completo).toBeGreaterThan(sinNotas);
    expect(sinNotas).toBeGreaterThan(sinAmbas);
  });

  it("siempre quedan el título, el estado, los avisos y la última línea, y cabe en el tope", () => {
    const grande = base();
    grande[1].lineas = Array.from({ length: 2000 }, (_, i) => `| fila ${i} | ${"v".repeat(100)} |`);
    const r = recortarPlanteamiento(CAB, grande, CIERRE, 100_000);
    const texto = componer(CAB, r.secciones, CIERRE, r.aviso);
    expect(unidades(texto)).toBeLessThanOrEqual(100_000);
    expect(texto.startsWith(CAB)).toBe(true);
    expect(texto.trimEnd().endsWith(CIERRE)).toBe(true);
    expect(texto).toContain("Arco · en borrador");
    expect(texto).toContain("Regla R1: falta el título");
    expect(texto).toMatch(/Aviso: el planteamiento pasaba de 100\D000 caracteres/);
  });

  it("no parte un grafema ni una fila de tabla: cada pieza que queda está entera", () => {
    const filas = Array.from({ length: 300 }, (_, i) => `| 👩‍👩‍👧 ${i} | ${"é".repeat(90)} |`);
    const r = recortarPlanteamiento(CAB, [seccion("estado", "Qué es", ["x"]), seccion("ficha", "Ficha", filas, true)], CIERRE, 8000);
    const ficha = r.secciones.find((s) => s.clave === "ficha")!;
    expect(ficha.lineas.length).toBeGreaterThan(0);
    expect(ficha.lineas.length).toBeLessThan(300);
    // Las que quedan son las primeras, completas
    ficha.lineas.forEach((l, i) => expect(l).toBe(filas[i]));
    expect(unidades(componer(CAB, r.secciones, CIERRE, r.aviso))).toBeLessThanOrEqual(8000);
  });

  it("una sección que se queda sin piezas desaparece entera, con su título", () => {
    const r = recortarPlanteamiento(CAB, base(), CIERRE, unidades(componer(CAB, base().filter((s) => s.clave !== "notas"), CIERRE)));
    expect(r.secciones.some((s) => s.clave === "notas")).toBe(false);
    expect(componer(CAB, r.secciones, CIERRE, r.aviso)).not.toContain("Notas de la pizarra");
  });

  it("no inventa recorte si lo que no se puede quitar ya pasa del tope: lo dice y deja lo fijo", () => {
    const r = recortarPlanteamiento(CAB, [seccion("estado", "Qué es", ["e".repeat(500)]), seccion("avisos", "Avisos", ["a".repeat(500)])], CIERRE, 100);
    expect(r.secciones.map((s) => s.clave)).toEqual(["estado", "avisos"]);
  });
});
