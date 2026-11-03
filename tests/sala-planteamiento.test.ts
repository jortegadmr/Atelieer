import { describe, expect, it } from "vitest";
import { planteamiento, ULTIMA_LINEA, type EntradaSala, type NotaSala } from "../src/lib/sala/planteamiento";
import { unidades } from "../src/lib/sala/texto";

// Spec 012, T12: el orden fijo, lo vacío fuera y lo que no se lee dicho (RF-19, RF-23, RF-25).

const entrada = (over: Partial<EntradaSala> = {}): EntradaSala => ({ tipo: "Escena", titulo: "Llega Telmo", estado: "en borrador", secciones: [], notas: null, ...over });
const nota = (texto: string, over: Partial<NotaSala> = {}): NotaSala => ({ texto, etiqueta: "", direccion: "llega", x: 0, y: 0, ...over });

const titulos = (texto: string) => [...texto.matchAll(/^## (.+)$/gm)].map((m) => m[1]);

describe("planteamiento (spec 012, T12)", () => {
  it("solo título, estado y última línea si no hay nada más", () => {
    const r = planteamiento(entrada());
    expect(r.texto).toBe("# Planteamiento para la sala: Llega Telmo\n\n## Qué es\n\n- Tipo: Escena\n- Estado: en borrador\n\nQuiero decidir:\n");
    expect(r.recortado).toBe(false);
    expect(r.caracteres).toBe(unidades(r.texto));
  });

  it("sin estado no pone la línea de estado", () => {
    expect(planteamiento(entrada({ estado: "  " })).texto).not.toContain("Estado:");
  });

  it("orden fijo, pasen como pasen las secciones, y siempre acaba en «Quiero decidir:»", () => {
    const r = planteamiento(
      entrada({
        secciones: [
          { clave: "alternativas", titulo: "Alternativas descartadas", lineas: ["- a"] },
          { clave: "cambios", titulo: "Lo que cambia", lineas: ["- c"] },
          { clave: "quien-sabe", titulo: "Quién sabe qué", lineas: ["- q"] },
          { clave: "causas", titulo: "De qué viene y qué provoca", lineas: ["- v"] },
          { clave: "avisos", titulo: "Avisos", lineas: ["- w"] },
          { clave: "ficha", titulo: "Ficha", lineas: ["campo: valor"], literal: true },
        ],
        notas: [nota("una nota")],
      }),
    );
    expect(titulos(r.texto)).toEqual(["Qué es", "Ficha", "Avisos", "De qué viene y qué provoca", "Quién sabe qué", "Lo que cambia", "Alternativas descartadas", "Notas de la pizarra"]);
    expect(r.texto.trimEnd().endsWith(ULTIMA_LINEA)).toBe(true);
    expect(r.texto.split("\n").filter((l) => l.startsWith("Quiero decidir")).length).toBe(1);
  });

  it("omite lo vacío: secciones sin líneas, notas vacías", () => {
    const r = planteamiento(
      entrada({ secciones: [{ clave: "avisos", titulo: "Avisos", lineas: [] }, { clave: "causas", titulo: "Causas", lineas: ["  ", ""] }], notas: [nota("   "), nota("")] }),
    );
    expect(titulos(r.texto)).toEqual(["Qué es"]);
  });

  it("una sección que no se pudo leer deja una línea «(no se pudo leer: motivo)» y sigue con el resto", () => {
    const r = planteamiento(
      entrada({
        secciones: [
          { clave: "ficha", titulo: "Ficha", nolee: "la wiki no está" },
          { clave: "avisos", titulo: "Avisos", lineas: ["- hay un aviso"] },
        ],
      }),
    );
    expect(r.texto).toContain("## Ficha\n\n(no se pudo leer: la wiki no está)");
    expect(r.texto).toContain("- hay un aviso");
  });

  it("el motivo de lo que no se leyó no puede colar Markdown ni saltos", () => {
    const r = planteamiento(entrada({ secciones: [{ clave: "ficha", titulo: "Ficha", nolee: "# roto\n---\n[x](y)" }] }));
    expect(r.texto).toContain("(no se pudo leer: \\# roto ---");
    expect(r.texto).not.toMatch(/^# roto/m);
  });

  it("si la pizarra no carga, se omiten las notas con una línea que lo dice", () => {
    const r = planteamiento(entrada({ notas: { nolee: "fichero roto" } }));
    expect(r.texto).toContain("(la pizarra no se pudo leer: fichero roto; se omiten sus notas)");
    expect(r.texto.trimEnd().endsWith(ULTIMA_LINEA)).toBe(true);
  });

  it("las notas van por posición, con su etiqueta y el sentido de la flecha, y dentro de una valla", () => {
    const r = planteamiento(
      entrada({
        notas: [
          nota("tercera", { x: 300, y: 100, etiqueta: "provoca", direccion: "sale" }),
          nota("segunda", { x: 200, y: 0 }),
          nota("primera # no soy título", { x: 0, y: 0, etiqueta: "porque" }),
          nota("cuarta\n```\n# valla\n```", { x: 0, y: 500 }),
        ],
      }),
    );
    const cuerpo = r.texto.slice(r.texto.indexOf("## Notas de la pizarra"));
    expect(cuerpo.indexOf("primera")).toBeLessThan(cuerpo.indexOf("segunda"));
    expect(cuerpo.indexOf("segunda")).toBeLessThan(cuerpo.indexOf("tercera"));
    expect(cuerpo.indexOf("tercera")).toBeLessThan(cuerpo.indexOf("cuarta"));
    expect(cuerpo).toContain("- Flecha de la nota a esta pieza · «porque»\n```\nprimera # no soy título\n```");
    expect(cuerpo).toContain("- Flecha de esta pieza a la nota · «provoca»");
    // La valla de la cuarta es más larga que la que lleva dentro
    expect(cuerpo).toContain("````\ncuarta\n```\n# valla\n```\n````");
  });

  it("el título y la etiqueta son texto: lo que Markdown interpretaría va escapado", () => {
    const r = planteamiento(entrada({ titulo: "# Hack [x](y) `c`", notas: [nota("a", { etiqueta: "**fuerte** | tabla" })] }));
    expect(r.texto.split("\n")[0]).toBe("# Planteamiento para la sala: \\# Hack \\[x\\](y) \\`c\\`");
    expect(r.texto).toContain("«\\*\\*fuerte\\*\\* \\| tabla»");
  });

  it("con una variante abierta dice que lleva la serie", () => {
    expect(planteamiento(entrada({ conVariante: true })).texto).toContain("Hay una variante abierta: este planteamiento lleva la serie principal, no la variante.");
    expect(planteamiento(entrada()).texto).not.toContain("variante");
  });

  it("limpia los controles y la dirección de las líneas que le llegan", () => {
    const rlo = String.fromCharCode(0x202e);
    const r = planteamiento(entrada({ secciones: [{ clave: "avisos", titulo: "Avisos", lineas: [`- a${rlo}b\u0000c`] }] }));
    expect(r.texto).toContain("- abc");
    expect(r.texto).not.toContain(rlo);
  });

  it("un título vacío no deja la cabecera rota", () => {
    expect(planteamiento(entrada({ titulo: "  " })).texto.split("\n")[0]).toBe("# Planteamiento para la sala: sin título");
  });

  it("pasado el tope se recorta, lo dice y conserva el estado, los avisos y la última línea", () => {
    const filas = Array.from({ length: 3000 }, (_, i) => `| fila ${i} | ${"v".repeat(60)} |`);
    const r = planteamiento(
      entrada({
        secciones: [
          { clave: "ficha", titulo: "Ficha", lineas: filas, literal: true },
          { clave: "avisos", titulo: "Avisos", lineas: ["- regla importante"] },
        ],
        notas: [nota("n".repeat(500))],
      }),
    );
    expect(r.recortado).toBe(true);
    expect(r.caracteres).toBeLessThanOrEqual(100_000);
    expect(r.texto).toContain("Aviso: el planteamiento pasaba de");
    expect(r.texto).toContain("- regla importante");
    expect(r.texto).toContain("- Estado: en borrador");
    expect(r.texto.trimEnd().endsWith(ULTIMA_LINEA)).toBe(true);
  });

  it("los caracteres son unidades de texto, no grafemas", () => {
    const r = planteamiento(entrada({ notas: [nota("👩‍👩‍👧")] }));
    expect(r.caracteres).toBe(r.texto.length);
  });
});
