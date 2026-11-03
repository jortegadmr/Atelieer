import { describe, expect, it } from "vitest";
import { avisosDeFicha } from "../src/lib/wiki/guias-ficha";
import { Constructor } from "./fixtures/constructor";

describe("guías sobre la ficha de un personaje", () => {
  it("sin arcos suyos no hay avisos", () => {
    const b = new Constructor();
    b.arco({ tipo_arco: "personaje", personaje: "[[Sabela]]" });
    expect(avisosDeFicha(b.modelo(), "Telmo")).toEqual([]);
  });

  it("enseña los avisos de los arcos en los que es protagonista, por nombre o alias", () => {
    const b = new Constructor();
    const suyo = b.arco({ tipo_arco: "personaje", personaje: "[[Telmo]]", titulo: "Telmo: callar" });
    b.arco({ tipo_arco: "personaje", personaje: "[[Sabela]]" });
    const m = b.modelo();
    const porNombre = avisosDeFicha(m, "Telmo");
    const porAlias = avisosDeFicha(m, "El técnico", ["telmo"]);
    expect(porNombre.length).toBeGreaterThan(0);
    expect(porNombre.every((a) => a.arco === suyo && a.tituloArco === "Telmo: callar")).toBe(true);
    expect(porAlias).toEqual(porNombre);
  });
});
