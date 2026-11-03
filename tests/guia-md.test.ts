import { describe, expect, it } from "vitest";
import { GUIA_INICIAL } from "../src/lib/guia/guia-inicial";
import { leerGuia, PIEZAS_GUIA } from "../src/lib/guia/guia-md";

const BASE = `---
tipo: guia
magia: false
---
# Guía de Atelier

## Reglas

| id | pieza | texto | fuente | comprobación |
| --- | --- | --- | --- | --- |
| G01 | serie | Decide el final antes de escribir, aunque sea en una línea. | §18 · F1.6 | C18 |
| G02 | arco de trama | Deja muy claro qué quiere y por qué lo quiere. | §10 | C03 |
| G03 | evento | Una regla con barra \\| dentro. | §1 | |

## Magia

| id | pieza | texto | fuente | comprobación |
| --- | --- | --- | --- | --- |
| M01 | evento | No resuelvas un conflicto con magia que el público no entiende. | Magia §1 · Ley 1 | |
`;

describe("guia.md (spec 6.1, plan 3.5)", () => {
  it("lee la tabla de reglas", () => {
    const g = leerGuia(BASE);
    expect(g.avisos).toEqual([]);
    expect(g.magia).toBe(false);
    expect(g.reglas).toEqual([
      { id: "G01", pieza: "serie", texto: "Decide el final antes de escribir, aunque sea en una línea.", fuente: "§18 · F1.6", comprobacion: "C18", magia: false },
      { id: "G02", pieza: "arco de trama", texto: "Deja muy claro qué quiere y por qué lo quiere.", fuente: "§10", comprobacion: "C03", magia: false },
      { id: "G03", pieza: "evento", texto: "Una regla con barra | dentro.", fuente: "§1", comprobacion: "", magia: false },
    ]);
  });

  it("con la magia desactivada no carga su sección; activada, sí", () => {
    expect(leerGuia(BASE).reglas.some((r) => r.id === "M01")).toBe(false);
    const g = leerGuia(BASE.replace("magia: false", "magia: true"));
    expect(g.magia).toBe(true);
    expect(g.reglas.find((r) => r.id === "M01")).toMatchObject({ pieza: "evento", magia: true });
  });

  it("una fila mal escrita se salta con un aviso, y el resto se lee", () => {
    const roto = BASE.replace("| G02 | arco de trama |", "| G02 | arco de dragón |").replace(
      "| G03 | evento | Una regla con barra \\| dentro. | §1 | |",
      "| G03 | evento | le faltan columnas |",
    );
    const g = leerGuia(roto);
    expect(g.reglas.map((r) => r.id)).toEqual(["G01"]);
    expect(g.avisos).toHaveLength(2);
    expect(g.avisos[0]).toMatch(/G02/);
    expect(g.avisos[0]).toMatch(/arco de dragón/);
  });

  it("sin propiedades o sin tablas no revienta", () => {
    expect(leerGuia("").reglas).toEqual([]);
    expect(leerGuia("# Nada\n\nTexto suelto.").reglas).toEqual([]);
  });

  it("el juego inicial se lee entero, sin avisos, con ids únicos y piezas válidas", () => {
    const g = leerGuia(GUIA_INICIAL);
    expect(g.avisos).toEqual([]);
    expect(g.reglas.length).toBeGreaterThan(30);
    expect(new Set(g.reglas.map((r) => r.id)).size).toBe(g.reglas.length);
    for (const r of g.reglas) expect(PIEZAS_GUIA).toContain(r.pieza);
    expect(g.magia).toBe(false);
    const conMagia = leerGuia(GUIA_INICIAL.replace("magia: false", "magia: true"));
    expect(conMagia.reglas.filter((r) => r.magia).map((r) => r.fuente)).toEqual(["Magia §1 · Ley 1", "Magia §6"]);
  });

  it("el juego inicial vigila las 19 comprobaciones de la fase 1", () => {
    const ids = new Set(leerGuia(GUIA_INICIAL).reglas.map((r) => r.comprobacion).filter(Boolean));
    for (const c of ["C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08", "C09", "C10", "C11", "C12", "C13", "C14", "C15", "C16", "C17", "C18", "C19"]) {
      expect(ids, c).toContain(c);
    }
  });
});

describe("la guía del autor sigue diciendo evento (spec 003, RF-3)", () => {
  it("la categoría «evento» de la guía se lee igual; la app no la reescribe", () => {
    expect(PIEZAS_GUIA).toContain("evento");
    expect(GUIA_INICIAL).toContain("| G41 | evento |");
    expect(leerGuia(GUIA_INICIAL).reglas.some((r) => r.pieza === "evento")).toBe(true);
  });
});

describe("reglas repetidas (spec 004, RF-20)", () => {
  it("con dos filas con el mismo código se usa la primera y se avisa", () => {
    const g = leerGuia(BASE.replace("| G03 | evento |", "| G02 | evento |"));
    expect(g.reglas.filter((r) => r.id === "G02")).toHaveLength(1);
    expect(g.reglas.find((r) => r.id === "G02")!.pieza).toBe("arco de trama");
    expect(g.avisos).toEqual(["Regla G02 repetida: se usa la primera."]);
  });

  it("también entre Reglas y Magia, y sin distinguir mayúsculas", () => {
    const g = leerGuia(BASE.replace("magia: false", "magia: true").replace("| M01 | evento |", "| g01 | evento |"));
    expect(g.reglas.map((r) => r.id)).toEqual(["G01", "G02", "G03"]);
    expect(g.avisos).toEqual(["Regla G01 repetida: se usa la primera."]);
  });
});
