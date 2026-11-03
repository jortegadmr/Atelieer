import { describe, expect, it } from "vitest";
import { anadirAlternativa, filaAlternativa, quitarAlternativa } from "../src/lib/wiki/alternativas";

// Spec 009, RF-45 a RF-48: la tabla «Alternativas descartadas» de la ficha del arco.

const BOM = String.fromCharCode(0xfeff);
const CABECERA = "| Idea | Por qué se descartó |\n| --- | --- |\n";
const PLANTILLA = `---\ntipo: arco\n---\n# El eco\n\n## Profundizar\n\n### Alternativas descartadas\n\n${CABECERA}| | |\n\n## Fuentes\n\n- x\n`;

describe("la fila (spec 009, RF-45)", () => {
  it("con su título y su porqué; sin título, «Sin título»", () => {
    expect(filaAlternativa("La pelea", "No pegaba")).toBe("| La pelea | No pegaba |");
    expect(filaAlternativa("  ", "")).toBe("| Sin título | |");
  });

  it("| en el título se escapa y los saltos pasan a espacio", () => {
    expect(filaAlternativa("A | B", "uno\ndos")).toBe("| A \\| B | uno dos |");
  });
});

describe("la fila con texto raro (revisión de seguridad)", () => {
  const c = String.fromCharCode;
  it("un retorno suelto, separadores de línea, control y bidi no parten ni falsean la fila", () => {
    expect(filaAlternativa("Título\r## Falso", `a${c(0x2028)}b${c(0x85)}c`)).toBe("| Título ## Falso | a b c |");
    expect(filaAlternativa(`x${c(0x202e)}y${c(7)}z${c(0x2066)}`, "\tporque")).toBe("| xyz | porque |");
  });
});

describe("añadir una alternativa (spec 009, RF-46, RF-47)", () => {
  it("añade bajo ### Alternativas descartadas en el sitio de la fila vacía", () => {
    expect(anadirAlternativa(PLANTILLA, "La pelea", "No pegaba")).toBe(PLANTILLA.replace("| | |", "| La pelea | No pegaba |"));
  });

  it("con filas, añade debajo de la última", () => {
    const una = anadirAlternativa(PLANTILLA, "Uno", "a")!;
    expect(anadirAlternativa(una, "Dos", "")).toBe(PLANTILLA.replace("| | |", "| Uno | a |\n| Dos | |"));
  });

  it("fila igual, no añade", () => {
    const una = anadirAlternativa(PLANTILLA, "A | B", "x")!;
    expect(anadirAlternativa(una, "A | B", "x")).toBeNull();
    // Otro porqué es otra fila
    expect(anadirAlternativa(una, "A | B", "y")).not.toBeNull();
  });

  it("título sin tabla, crea la tabla debajo", () => {
    const t = "# El eco\n\n### Alternativas descartadas\nAlgo escrito.\n\n## Fuentes\n";
    expect(anadirAlternativa(t, "Uno", "a")).toBe(`# El eco\n\n### Alternativas descartadas\n\n${CABECERA}| Uno | a |\n\nAlgo escrito.\n\n## Fuentes\n`);
  });

  it("sin título, la primera tabla cuya primera columna es «Idea»", () => {
    const t = `# El eco\n\n## Otras\n\n${CABECERA}| Vieja | b |\n`;
    expect(anadirAlternativa(t, "Uno", "a")).toBe(`# El eco\n\n## Otras\n\n${CABECERA}| Vieja | b |\n| Uno | a |\n`);
  });

  it("lo de dentro de un comentario no cuenta: ni el título ni la tabla (revisión)", () => {
    const oculto = `<!--\n### Alternativas descartadas\n\n${CABECERA}| Vieja | b |\n-->\n`;
    const t = `# El eco\n\n${oculto}\n## Fuentes\n`;
    expect(anadirAlternativa(t, "Uno", "a")).toBe(`# El eco\n\n${oculto}\n## Alternativas descartadas\n\n${CABECERA}| Uno | a |\n\n## Fuentes\n`);
    expect(quitarAlternativa(t, "Vieja", "b", false)).toEqual({ texto: t, quitada: false });
  });

  it("sin título, crea el apartado antes de Fuentes", () => {
    const t = "# El eco\n\nTexto.\n\n## Fuentes\n\n- x\n";
    expect(anadirAlternativa(t, "Uno", "a")).toBe(`# El eco\n\nTexto.\n\n## Alternativas descartadas\n\n${CABECERA}| Uno | a |\n\n## Fuentes\n\n- x\n`);
  });

  it("sin título ni Fuentes, al final", () => {
    expect(anadirAlternativa("# El eco\nTexto.", "Uno", "a")).toBe(`# El eco\nTexto.\n\n## Alternativas descartadas\n\n${CABECERA}| Uno | a |\n`);
  });

  it("CRLF y BOM se quedan", () => {
    const t = BOM + PLANTILLA.replace(/\n/g, "\r\n");
    expect(anadirAlternativa(t, "Uno", "a")).toBe(t.replace("| | |", "| Uno | a |"));
    const sin = BOM + "# V\r\n\r\n## Fuentes\r\n";
    expect(anadirAlternativa(sin, "Uno", "a")).toBe(
      BOM + "# V\r\n\r\n## Alternativas descartadas\r\n\r\n| Idea | Por qué se descartó |\r\n| --- | --- |\r\n| Uno | a |\r\n\r\n## Fuentes\r\n",
    );
  });
});

describe("quitar una alternativa (spec 009, RF-48)", () => {
  it("quitar solo si sigue igual y nadie más la da", () => {
    const una = anadirAlternativa(PLANTILLA, "Uno", "a")!;
    const dos = anadirAlternativa(una, "Dos", "b")!;
    // Nadie más la da: se quita
    expect(quitarAlternativa(dos, "Uno", "a", false)).toEqual({ texto: PLANTILLA.replace("| | |", "| Dos | b |"), quitada: true });
    // Otra pieza da la misma fila: se queda
    expect(quitarAlternativa(dos, "Uno", "a", true)).toEqual({ texto: dos, quitada: false });
    // Se editó en Obsidian (otro porqué): se queda
    expect(quitarAlternativa(dos, "Uno", "otro", false)).toEqual({ texto: dos, quitada: false });
  });

  it("si era la única, vuelve la fila vacía de la plantilla", () => {
    const una = anadirAlternativa(PLANTILLA, "Uno", "a")!;
    expect(quitarAlternativa(una, "Uno", "a", false)).toEqual({ texto: PLANTILLA, quitada: true });
  });

  it("CRLF y BOM se quedan", () => {
    const t = BOM + PLANTILLA.replace(/\n/g, "\r\n");
    const una = anadirAlternativa(t, "A | B", "x")!;
    expect(quitarAlternativa(una, "A | B", "x", false)).toEqual({ texto: t, quitada: true });
  });
});
