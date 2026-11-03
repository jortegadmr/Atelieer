import { describe, expect, it } from "vitest";
import { aplicar } from "../src/lib/texto/edicion";
import { bloques, conCelda, conFilaNueva, conTabla, inline, partirTrozos, sinComentarios, tablaATexto } from "../src/lib/texto/markdown";

describe("texto visual: inline", () => {
  it("negrita, cursiva, código, enlaces y pendiente", () => {
    expect(inline("a **b** *c* `d` [[Telmo]] [PENDIENTE]")).toEqual([
      { t: "txt", s: "a " },
      { t: "neg", c: [{ t: "txt", s: "b" }] },
      { t: "txt", s: " " },
      { t: "cur", c: [{ t: "txt", s: "c" }] },
      { t: "txt", s: " " },
      { t: "cod", s: "d" },
      { t: "txt", s: " " },
      { t: "enl", nombre: "Telmo", texto: "Telmo" },
      { t: "txt", s: " " },
      { t: "pend" },
    ]);
  });

  it("enlace con alias, ruta y ancla: el nombre es el de la nota", () => {
    expect(inline("[[Personajes/Telmo#Motor|el técnico]]")).toEqual([{ t: "enl", nombre: "Telmo", texto: "el técnico" }]);
  });

  it("el HTML y los asteriscos sueltos son texto, no se interpretan", () => {
    expect(inline("<script>x</script> 2 * 3 * 4")).toEqual([{ t: "txt", s: "<script>x</script> 2 * 3 * 4" }]);
  });
});

describe("texto visual: bloques", () => {
  it("títulos, listas, citas, párrafos y líneas; los comentarios no se ven", () => {
    const md = "<!-- PLANTILLA\nde personaje -->\n# Telmo\n\n> **Resumen:** el técnico\n\n- uno\n- dos\n\n1. a\n2. b\n\n---\n\nTexto\ncontinuo";
    const b = bloques(md);
    expect(b.map((x) => x.t)).toEqual(["h", "cita", "ul", "ol", "hr", "p"]);
    expect(b[2]).toMatchObject({ items: [[{ t: "txt", s: "uno" }], [{ t: "txt", s: "dos" }]] });
    expect(b[5]).toEqual({ t: "p", c: [{ t: "txt", s: "Texto continuo" }] });
    expect(sinComentarios("a<!-- x -->b")).toBe("ab");
  });

  it("más de tres almohadillas se muestran como título pequeño", () => {
    expect(bloques("###### Mini")[0]).toMatchObject({ t: "h", n: 4 });
  });
});

describe("texto visual: tablas como formulario", () => {
  const md = "### Motor\n\n| Campo | Respuesta |\n| --- | --- |\n| Quiere | Evitar \\| el desastre |\n| Necesita | [PENDIENTE] |\n\nFin";

  it("encuentra la tabla, sus celdas y lo de alrededor", () => {
    const t = partirTrozos(md);
    expect(t.map((x) => x.tipo)).toEqual(["texto", "tabla", "texto"]);
    const tabla = t[1] as Extract<(typeof t)[number], { tipo: "tabla" }>;
    expect(tabla.tabla.filas).toEqual([["Campo", "Respuesta"], ["Quiere", "Evitar | el desastre"], ["Necesita", "[PENDIENTE]"]]);
  });

  it("cambiar una celda reescribe solo la tabla y respeta el resto y los finales de línea", () => {
    for (const fin of ["\n", "\r\n"]) {
      const original = md.replace(/\n/g, fin);
      const t = partirTrozos(original).find((x) => x.tipo === "tabla")!;
      if (t.tipo !== "tabla") throw new Error("sin tabla");
      const filas = t.tabla.filas.map((f) => [...f]);
      filas[2]![1] = "Dejar de cargar | solo";
      const nuevo = conTabla(original, t, { filas });
      expect(nuevo.startsWith(`### Motor${fin}${fin}`)).toBe(true);
      expect(nuevo.endsWith(`${fin}${fin}Fin`)).toBe(true);
      expect(nuevo).toContain("| Necesita | Dejar de cargar \\| solo |");
      expect(nuevo.includes("\n") && fin === "\r\n" ? nuevo.replace(/\r\n/g, "").includes("\n") : false).toBe(false);
    }
  });

  it("tablaATexto y partirTrozos son inversas", () => {
    const t = partirTrozos("| a | b |\n| --- | --- |\n| 1 | 2 |")[0]!;
    if (t.tipo !== "tabla") throw new Error("sin tabla");
    expect(tablaATexto(t.tabla)).toBe("| a | b |\n| --- | --- |\n| 1 | 2 |");
  });

  it("una línea con barras sin separador no es tabla", () => {
    expect(partirTrozos("| a | b |\nhola").map((x) => x.tipo)).toEqual(["texto"]);
  });

  it("las filas cortas se rellenan para tener todas las mismas columnas", () => {
    const t = partirTrozos("| a | b | c |\n| --- | --- | --- |\n| 1 |")[0]!;
    if (t.tipo !== "tabla") throw new Error("sin tabla");
    expect(t.tabla.filas[1]).toEqual(["1", "", ""]);
  });
});

describe("texto visual: botones de la barra", () => {
  const s = (texto: string, ini: number, fin = ini) => ({ texto, ini, fin });

  it("negrita envuelve, y vuelve a quitarse", () => {
    const a = aplicar("negrita", s("hola mundo", 5, 10));
    expect(a).toEqual({ texto: "hola **mundo**", ini: 7, fin: 12 });
    expect(aplicar("negrita", a).texto).toBe("hola mundo");
  });

  it("sin selección deja un texto de ejemplo seleccionado", () => {
    const a = aplicar("cursiva", s("ab", 1));
    expect(a.texto).toBe("a*texto*b");
    expect(a.texto.slice(a.ini, a.fin)).toBe("texto");
  });

  it("título cicla: nada, ##, ###, nada", () => {
    let a = aplicar("titulo", s("Motor", 0));
    expect(a.texto).toBe("## Motor");
    a = aplicar("titulo", a);
    expect(a.texto).toBe("### Motor");
    a = aplicar("titulo", a);
    expect(a.texto).toBe("Motor");
  });

  it("lista y cita actúan en todas las líneas tocadas y se quitan", () => {
    const base = "uno\ndos\ntres";
    const l = aplicar("lista", s(base, 0, 7));
    expect(l.texto).toBe("- uno\n- dos\ntres");
    expect(aplicar("lista", l).texto).toBe("uno\ndos\ntres");
    expect(aplicar("cita", s("x", 0)).texto).toBe("> x");
  });

  it("enlace pone [[ ]] y los quita", () => {
    const a = aplicar("enlace", s("vi a Telmo hoy", 5, 10));
    expect(a.texto).toBe("vi a [[Telmo]] hoy");
    expect(aplicar("enlace", a).texto).toBe("vi a Telmo hoy");
  });
});

describe("texto visual: textos grandes y hostiles", () => {
  it("un texto enorme con asteriscos y barras se interpreta rápido y sin colgarse", () => {
    const hostil = "*a".repeat(50_000) + "**".repeat(20_000) + "[[".repeat(10_000) + "_x ".repeat(20_000);
    const t0 = Date.now();
    inline(hostil);
    bloques(hostil);
    partirTrozos(hostil);
    expect(Date.now() - t0).toBeLessThan(2000);
  });

  it("la tabla con celdas con saltos o barras se guarda en una línea por fila", () => {
    const t = partirTrozos("| a | b |\n| --- | --- |\n| 1 | 2 |")[0]!;
    if (t.tipo !== "tabla") throw new Error("sin tabla");
    expect(tablaATexto({ filas: [["a", "b"], ["x|y", "l1\nl2"]] })).toBe("| a | b |\n| --- | --- |\n| x\\|y | l1 l2 |");
  });
});

describe("texto visual: arreglos de la revisión", () => {
  it("un título con saltos raros en medio no cuelga el intérprete", () => {
    for (const raro of ["# Telmo"+"\r"+"notas", "# Telmo"+"\u2028"+"notas", "## a"+"\u2029"+"b"]) {
      const t0 = Date.now();
      expect(bloques(raro).length).toBeGreaterThan(0);
      expect(Date.now() - t0).toBeLessThan(500);
    }
  });

  it("la alineación de las columnas se conserva al editar una celda", () => {
    const md = "| a | b | c |"+"\n"+"| :--- | ---: | :---: |"+"\n"+"| 1 | 2 | 3 |";
    const nuevo = conCelda(md, 0, 1, 0, "x");
    expect(nuevo).toBe("| a | b | c |"+"\n"+"| :--- | ---: | :---: |"+"\n"+"| x | 2 | 3 |");
  });

  it("dos cambios seguidos de celdas se aplican uno sobre otro, sin perder el primero", () => {
    const md = "| a | b |"+"\n"+"| --- | --- |"+"\n"+"| 1 | 2 |";
    const uno = conCelda(md, 0, 1, 0, "X");
    const dos = conCelda(uno, 0, 1, 1, "Y");
    expect(dos).toContain("| X | Y |");
  });

  it("una fila nueva se añade al texto que hay ahora", () => {
    const md = "| a | b |"+"\n"+"| --- | --- |"+"\n"+"| 1 | 2 |";
    expect(conFilaNueva(md, 0)).toBe(md + "\n"+"|  |  |");
  });

  it("los finales de línea mezclados se conservan línea a línea", () => {
    const md = "antes"+"\r\n"+"| a | b |"+"\n"+"| --- | --- |"+"\r\n"+"| 1 | 2 |"+"\n"+"fin";
    const nuevo = conCelda(md, 0, 1, 0, "X");
    expect(nuevo).toBe("antes"+"\r\n"+"| a | b |"+"\n"+"| --- | --- |"+"\r\n"+"| X | 2 |"+"\n"+"fin");
  });

  it("una tabla dentro de un comentario no es tabla; un comentario sin cerrar es texto", () => {
    const md = "<!--"+"\n"+"| a | b |"+"\n"+"| --- | --- |"+"\n"+"-->"+"\n"+"hola";
    expect(partirTrozos(md).some((t) => t.tipo === "tabla")).toBe(false);
    expect(sinComentarios("a <!-- sin cerrar")).toBe("a <!-- sin cerrar");
  });

  it("muchos <!-- sin cerrar y muchas filas no cuelgan ni revientan", () => {
    const t0 = Date.now();
    sinComentarios("<!--".repeat(100_000));
    const filas = "| a | b |"+"\n"+"| --- | --- |"+"\n"+Array.from({ length: 150_000 }, () => "| 1 | 2 |").join("\n");
    expect(partirTrozos(filas)[0]).toMatchObject({ tipo: "tabla" });
    expect(Date.now() - t0).toBeLessThan(3000);
  });

  it("cursiva sobre texto en negrita y negrita sobre dos negritas no rompen las marcas", () => {
    const a = aplicar("cursiva", { texto: "**texto**", ini: 2, fin: 7 });
    expect(a.texto).toBe("***texto***");
    const dos = "**a** y **b**";
    const b = aplicar("negrita", { texto: dos, ini: 0, fin: dos.length });
    expect(b.texto).toBe("****a** y **b****");
  });
});
