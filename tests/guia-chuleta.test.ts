import { describe, expect, it } from "vitest";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { agruparReglas, apartadoDe, leerChuleta, RUTA_CHULETA, trozosFuente } from "../src/lib/guia/chuleta";
import { GUIA_INICIAL } from "../src/lib/guia/guia-inicial";
import { leerGuia } from "../src/lib/guia/guia-md";

const guia = leerGuia(GUIA_INICIAL);

const CHULETA = [
  "# Chuleta",
  "Intro.",
  "## §4 La premisa",
  "Una o dos frases.",
  "### Ejemplo",
  "Un técnico vuelve a su pueblo.",
  "## 18. El final",
  "Decide el final.",
  "```",
  "## 19. no es título",
  "```",
  "Sigue el 18.",
  "## **19)** Escenas",
  "Cada escena cambia algo.",
].join("\n");

describe("guía de escritura (spec 019)", () => {
  it("agrupa todas las reglas por pieza en el orden de la guía, sin grupos vacíos", () => {
    const g = agruparReglas(guia.reglas);
    expect(g[0]!.pieza).toBe("serie");
    expect(g.reduce((n, x) => n + x.reglas.length, 0)).toBe(guia.reglas.length);
    expect(g.every((x) => x.reglas.length > 0)).toBe(true);
  });

  it("filtra por texto sin tildes ni caja, por id y por fuente", () => {
    expect(agruparReglas(guia.reglas, "PREGUNTA DE ORO").flatMap((x) => x.reglas.map((r) => r.id))).toContain("G03");
    expect(agruparReglas(guia.reglas, "g02").flatMap((x) => x.reglas.map((r) => r.id))).toEqual(["G02"]);
    expect(agruparReglas(guia.reglas, "§18").length).toBeGreaterThan(0);
    expect(agruparReglas(guia.reglas, "zzzz")).toEqual([]);
  });

  it("parte la fuente en enlaces a apartados y texto", () => {
    expect(trozosFuente("§18 · F1.6")).toEqual([
      { tipo: "apartado", texto: "§18", numero: "18" },
      { tipo: "texto", texto: " · F1.6" },
    ]);
    expect(trozosFuente("Guía propia")).toEqual([{ tipo: "texto", texto: "Guía propia" }]);
  });

  it("encuentra el apartado por §N, N. o N), con sus subtítulos, hasta el siguiente de su nivel", () => {
    expect(apartadoDe(CHULETA, "4")).toEqual({ titulo: "§4 La premisa", cuerpo: "Una o dos frases.\n### Ejemplo\nUn técnico vuelve a su pueblo." });
    expect(apartadoDe(CHULETA, "18")!.cuerpo).toContain("Sigue el 18.");
    expect(apartadoDe(CHULETA, "19")!.cuerpo).toBe("Cada escena cambia algo.");
    expect(apartadoDe(CHULETA, "1")).toBeNull();
  });

  it("no cuenta títulos dentro de bloques ``` o ~~~ ni del frontmatter, y quita los # del final", () => {
    const t = ["---", "# 18. falso", "---", "## 18. El final ##", "Antes.", "~~~", "# Ejemplo", "~~~", "````", "```", "# Otro", "````", "Después.", "## 19. Fin"].join("\n");
    const a = apartadoDe(t, "18")!;
    expect(a.titulo).toBe("18. El final");
    expect(a.cuerpo.startsWith("Antes.")).toBe(true);
    expect(a.cuerpo.endsWith("Después.")).toBe(true);
  });

  it("reconoce subapartados «18.1 Título» sin confundirlos con el 18", () => {
    const t = "## 18 El final\nTexto.\n### 18.1 La pregunta\nSub.";
    expect(apartadoDe(t, "18.1")).toEqual({ titulo: "18.1 La pregunta", cuerpo: "Sub." });
    expect(apartadoDe(t, "18")).toBeNull();
  });

  it("lee la chuleta del vault sin escribir nada; si no está, null", async () => {
    const fs = new FsMemoria();
    expect(await leerChuleta(fs, "V")).toBeNull();
    await fs.escribir(`V/${RUTA_CHULETA}`, CHULETA);
    expect(await leerChuleta(fs, "V")).toBe(CHULETA);
  });
});
