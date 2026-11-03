import { describe, expect, it } from "vitest";
import { cambiarApartado, partirApartados, porQueNoSeGuarda } from "../src/lib/wiki/apartados";

// Spec 009, RF-36, RF-37, RF-37b, RF-44: los apartados de una ficha.

const BOM = String.fromCharCode(0xfeff);
const titulos = (texto: string) => partirApartados(texto).map((a) => a.titulo);
const textos = (texto: string) => partirApartados(texto).map((a) => a.texto);

describe("partir una ficha en apartados (spec 009, RF-36)", () => {
  it("sin apartados, solo Inicio; las propiedades no se enseñan", () => {
    expect(partirApartados("---\nalias: [Telmo]\n---\nTelmo es el técnico.\n")).toEqual([
      { titulo: "Inicio", desde: 23, hasta: 44, texto: "Telmo es el técnico." },
    ]);
    expect(textos("")).toEqual([""]);
  });

  it("Inicio y cada título de nivel 2, con su texto debajo", () => {
    const t = "Intro\n\n## Herida\nPerdió la emisora.\n\n## Mentira\nCree que avisar lo vuelve culpable.";
    expect(titulos(t)).toEqual(["Inicio", "Herida", "Mentira"]);
    expect(textos(t)).toEqual(["Intro", "Perdió la emisora.", "Cree que avisar lo vuelve culpable."]);
  });

  it("`##Título` sin espacio no es título; `###` tampoco", () => {
    expect(titulos("##Pegado\n### Tres\n## Bien\n")).toEqual(["Inicio", "Bien"]);
  });

  it("un `##` dentro de un bloque de código o de un comentario no parte el apartado", () => {
    const t = "## A\n```md\n## no\n```\n~~~\n## tampoco\n~~~\n<!--\n## nada\n-->\n## B\n";
    expect(titulos(t)).toEqual(["Inicio", "A", "B"]);
  });

  it("`## ` dentro de las propiedades no cuenta", () => {
    expect(titulos("---\nnota: |\n## dentro\n---\n## Fuera\n")).toEqual(["Inicio", "Fuera"]);
  });

  it("un título setext (`Título` y `---`) no se confunde con las propiedades", () => {
    const t = "Título\n---\nTexto\n## A\nx\n";
    expect(titulos(t)).toEqual(["Inicio", "A"]);
    expect(textos(t)[0]).toBe("Título\n---\nTexto");
  });
});

describe("cambiar un apartado (spec 009, RF-37, RF-44)", () => {
  it("cambiar un apartado deja el resto igual byte a byte, con `\\r\\n` y BOM", () => {
    const t = BOM + "---\r\nalias: x\r\n---\r\nIntro\r\n\r\n## A\r\nuno\r\n\r\n## A\r\ndos\r\n\r\n## B\r\ntres";
    const r = cambiarApartado(t, 2, "otro\nmás");
    expect(r).toBe(BOM + "---\r\nalias: x\r\n---\r\nIntro\r\n\r\n## A\r\nuno\r\n\r\n## A\r\notro\r\nmás\r\n\r\n## B\r\ntres");
  });

  it("sin salto final, el último apartado sigue sin él", () => {
    expect(cambiarApartado("## A\nuno", 1, "dos")).toBe("## A\ndos");
    expect(cambiarApartado("## A\nuno\n", 1, "dos\n\n")).toBe("## A\ndos\n");
  });

  it("los títulos repetidos y el código con `##` no se tocan", () => {
    const t = "## A\n```\n## A\n```\n## A\nfin\n";
    expect(cambiarApartado(t, 2, "nuevo")).toBe("## A\n```\n## A\n```\n## A\nnuevo\n");
    expect(cambiarApartado(t, 1, "x")).toBe("## A\nx\n## A\nfin\n");
  });

  it("un apartado vacío entre dos títulos no se pega al siguiente", () => {
    expect(cambiarApartado("## A\n## B\n", 1, "x")).toBe("## A\nx\n## B\n");
    expect(cambiarApartado("## A", 1, "x")).toBe("## A\nx");
    expect(cambiarApartado("---\na: 1\n---", 0, "x")).toBe("---\na: 1\n---\nx");
  });

  it("Inicio se escribe después de las propiedades", () => {
    expect(cambiarApartado("---\na: 1\n---\nviejo\n## A\n", 0, "nuevo")).toBe("---\na: 1\n---\nnuevo\n## A\n");
  });
});

describe("lo que no se guarda (spec 009, RF-37b)", () => {
  it("una línea ## no se guarda", () => {
    expect(porQueNoSeGuarda("## A\nx\n", 1, "uno\n## Nuevo")).toBe("Los apartados se crean en Obsidian.");
    expect(porQueNoSeGuarda("## A\nx\n", 1, "uno\n##pegado")).toBeNull();
  });

  it("Inicio con `---` al principio, en una nota sin propiedades, rompería las propiedades", () => {
    expect(porQueNoSeGuarda("Intro\n## A\n", 0, "---\nx")).toBe("Eso rompería las propiedades.");
    expect(porQueNoSeGuarda("---\na: 1\n---\nIntro\n", 0, "---\nx")).toBeNull();
    expect(porQueNoSeGuarda("## A\nx\n", 1, "---\nx")).toBeNull();
  });

  it("un comentario o un bloque de código sin cerrar se tragaría los apartados de debajo (revisión)", () => {
    const t = "Intro\n## A\nx\n## B\ny\n";
    const msg = "Eso escondería los apartados de debajo: cierra el comentario o el bloque de código.";
    expect(porQueNoSeGuarda(t, 0, "<!-- abierto")).toBe(msg);
    expect(porQueNoSeGuarda(t, 1, "```\ncódigo")).toBe(msg);
    expect(porQueNoSeGuarda(t, 0, "<!-- cerrado -->")).toBeNull();
    expect(porQueNoSeGuarda(t, 1, "```\ncódigo\n```")).toBeNull();
    // En el último apartado no esconde nada
    expect(porQueNoSeGuarda(t, 2, "<!-- abierto")).toBeNull();
  });
});
