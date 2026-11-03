import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { clasificarTexto } from "../src/lib/guion/lineas";
import { medir } from "../src/lib/guion/paginas";

// Spec 013, T22: texto de guion parecido al real. Los fragmentos del autor se
// añaden aquí como `guion-*.txt` y entran en estos mismos recorridos.

const ejemplo = readFileSync(new URL("./fixtures/guion-ejemplo.txt", import.meta.url), "utf8").replace(/\r\n/g, "\n");

describe("guion de ejemplo (spec 013, T22)", () => {
  const cl = clasificarTexto(ejemplo);
  const tipos = (texto: string) => cl.find((c) => c.texto === texto)?.tipo;

  it("reconoce encabezados, personajes, diálogos, paréntesis y transiciones", () => {
    expect(tipos("INT. CASA DEL MUELLE - NOCHE")).toBe("encabezado");
    expect(tipos("EXT. LONJA VIEJA - AMANECER")).toBe("encabezado");
    expect(cl.filter((c) => c.tipo === "personaje").map((c) => c.texto)).toEqual(["CARMELA", "TELMO", "CARMELA", "EL FARERO"]);
    expect(tipos("(sin mirarlo)")).toBe("parentesis");
    expect(tipos("Llegas tarde.")).toBe("dialogo");
    expect(tipos("CORTE A:")).toBe("transicion");
  });

  it("las líneas forzadas pierden su prefijo y quedan marcadas", () => {
    expect(cl.find((c) => c.texto === "AL FONDO DEL MUELLE")).toMatchObject({ tipo: "encabezado", forzado: true });
    expect(cl.find((c) => c.texto === "FUNDIDO A NEGRO.")).toMatchObject({ tipo: "transicion", forzado: true });
  });

  it("el párrafo con un personaje en mayúsculas dentro sigue siendo acción", () => {
    expect(cl.find((c) => c.texto.startsWith("La lluvia golpea"))?.tipo).toBe("accion");
  });

  it("mide menos de una página y lo marca como estimación", () => {
    const m = medir(ejemplo);
    expect(m.paginas).toBeGreaterThan(0);
    expect(m.paginas).toBeLessThan(1);
    expect(m.segundos).toBeCloseTo(m.paginas * 60, 5);
  });
});
