import { describe, expect, it } from "vitest";
import { analizarGuion, leerEncabezado, momentoDe, segundosDeLineas } from "../src/lib/desglose/analisis";

describe("encabezado del guion", () => {
  it("interior o exterior, lugar y momento", () => {
    expect(leerEncabezado("INT. CASA DE TELMO - NOCHE")).toMatchObject({ ie: "INT", lugar: "CASA DE TELMO", momento: "noche", lugarRef: null });
    expect(leerEncabezado("EXT. LONJA VIEJA – ATARDECER")).toMatchObject({ ie: "EXT", lugar: "LONJA VIEJA", momento: "atardecer" });
    expect(leerEncabezado("INT./EXT. CARRO — DÍA")).toMatchObject({ ie: "INT/EXT", lugar: "CARRO", momento: "día" });
    expect(leerEncabezado("I/E. PUERTA - CONTINUO")).toMatchObject({ ie: "INT/EXT", momento: "continuo" });
  });

  it("momento que no se reconoce: queda en null y el lugar se conserva entero", () => {
    expect(leerEncabezado("INT. TORRE - AL CAER LA TARDE")).toMatchObject({ momento: null, lugar: "TORRE - AL CAER LA TARDE" });
    expect(leerEncabezado("INT. TORRE")).toMatchObject({ momento: null, lugar: "TORRE" });
  });

  it("lugar con guion en el nombre y momento al final", () => {
    expect(leerEncabezado("INT. CASA - SÓTANO - NOCHE")).toMatchObject({ lugar: "CASA - SÓTANO", momento: "noche" });
  });

  it("una referencia como lugar da el nombre de su ficha", () => {
    expect(leerEncabezado("INT. [[Casa de Telmo|CASA DE TELMO]] - DÍA")).toMatchObject({ lugar: "CASA DE TELMO", lugarRef: "Casa de Telmo", momento: "día" });
  });

  it("momentos con tildes y extensión", () => {
    expect(momentoDe("DIA")).toBe("día");
    expect(momentoDe("Noche (FLASHBACK)")).toBe("noche");
    expect(momentoDe("mediodía")).toBeNull();
  });
});

describe("analizar un guion", () => {
  const guion = [
    "INT. CASA DE TELMO - NOCHE",
    "",
    "[[Telmo]] entra. Sabela lo espera junto al [[Baúl]].",
    "",
    "TELMO",
    "Ya está hecho.",
    "",
    "SABELA (V.O.)",
    "(bajito)",
    "No te creo, y lo sabes bien, Telmo, porque llevas toda la noche dándole vueltas.",
    "",
    "[[Telmo]]",
    "Entonces no preguntes.",
  ].join("\n");

  it("encabezado, quién habla (por orden, sin repetir) y lo citado", () => {
    const a = analizarGuion(guion);
    expect(a.encabezado).toMatchObject({ ie: "INT", momento: "noche" });
    expect(a.hablan.map((h) => h.nombre)).toEqual(["TELMO", "SABELA"]);
    expect(a.hablan[0]!.ref).toBe("Telmo");
    expect([...a.citados].sort()).toEqual(["Baúl", "Telmo"]);
    expect(a.segundos).toBeGreaterThan(0);
  });

  it("suma las líneas de diálogo de cada personaje, aunque hable varias veces", () => {
    const a = analizarGuion(guion);
    expect(a.hablan.find((h) => h.nombre === "TELMO")!.lineas).toBe(2);
    expect(a.hablan.find((h) => h.nombre === "SABELA")!.lineas).toBeGreaterThan(2);
  });

  it("un guion sin encabezado ni personajes no inventa nada", () => {
    const a = analizarGuion("Solo una acción suelta.");
    expect(a.encabezado).toBeNull();
    expect(a.hablan).toEqual([]);
  });

  it("un guion vacío da segundos 0", () => {
    expect(analizarGuion("").segundos).toBe(0);
  });

  it("segundos de habla: una página de líneas es un minuto", () => {
    expect(segundosDeLineas(55)).toBe(60);
  });
});
