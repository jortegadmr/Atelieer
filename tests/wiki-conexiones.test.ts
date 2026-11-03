import { describe, expect, it } from "vitest";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { claseDeTipo, colocarEnCirculo, construirGrafo, filtrarGrafo, leerGrafo, type ClaseConexion } from "../src/lib/wiki/conexiones";
import type { FichaMundo } from "../src/lib/wiki/mundo";

const ficha = (nombre: string, relaciones: Array<[string, string]>, extra: Partial<FichaMundo> = {}): FichaMundo => ({
  nombre,
  categoria: "personaje",
  ruta: `W/Personajes/${nombre}.md`,
  subcarpeta: "",
  aliases: [],
  resumen: "",
  estado: "",
  relaciones: relaciones.map(([con, tipo]) => ({ con, tipo })),
  ...extra,
});

describe("clase de una relación", () => {
  it("agrupa el texto libre del autor", () => {
    expect(claseDeTipo("Pareja")).toBe("romantica");
    expect(claseDeTipo("amor imposible")).toBe("romantica");
    expect(claseDeTipo("Mejor amigo")).toBe("amistad");
    expect(claseDeTipo("Aliados")).toBe("amistad");
    expect(claseDeTipo("rivalidad")).toBe("rivalidad");
    expect(claseDeTipo("Enemigo íntimo")).toBe("rivalidad");
    expect(claseDeTipo("hermano")).toBe("otra");
    expect(claseDeTipo("")).toBe("otra");
  });
});

describe("grafo de conexiones", () => {
  it("una arista por relación, y una relación escrita en las dos fichas cuenta una vez", () => {
    const g = construirGrafo([ficha("Telmo", [["Sabela", "amor"]]), ficha("Sabela", [["Telmo", "Amor"]]), ficha("Nando", [["Telmo", "hermano"]])]);
    expect(g.aristas).toHaveLength(2);
    expect(g.nodos.map((n) => n.nombre)).toEqual(["Nando", "Sabela", "Telmo"]);
  });

  it("une alias con su ficha y conserva a quien no tiene ficha", () => {
    const g = construirGrafo([ficha("Telmo", [["El Alcalde", "rivalidad"]]), ficha("Quiroga", [], { aliases: ["El Alcalde"] })]);
    expect(g.aristas).toEqual([{ de: "Telmo", a: "Quiroga", tipo: "rivalidad", clase: "rivalidad" }]);
    const fuera = construirGrafo([ficha("Telmo", [["Un forastero", "amistad"]])]);
    expect(fuera.nodos.find((n) => n.nombre === "Un forastero")).toMatchObject({ ruta: null, categoria: null });
  });

  it("no dibuja una relación de uno consigo mismo", () => {
    expect(construirGrafo([ficha("Telmo", [["telmo", "yo"]])]).aristas).toEqual([]);
  });

  it("filtra por clase y quita los nodos que se quedan solos", () => {
    const g = construirGrafo([ficha("Telmo", [["Sabela", "amor"], ["Nando", "rival"]]), ficha("Nando", []), ficha("Sabela", [])]);
    const f = filtrarGrafo(g, new Set<ClaseConexion>(["romantica"]));
    expect(f.aristas.map((a) => a.a)).toEqual(["Sabela"]);
    expect(f.nodos.map((n) => n.nombre)).toEqual(["Sabela", "Telmo"]);
  });

  it("lee las fichas de personajes y grupos de la vault", async () => {
    const fs = new FsMemoria();
    const rutas = { raiz: "S/Wiki", personajes: "S/Wiki/Personajes", lugares: "S/Wiki/Lugares", eras: "S/Wiki/Eras", timeline: "", narrativa: "", log: "" };
    await fs.escribir("V/S/Wiki/Personajes/Telmo.md", '---\nrelaciones:\n  - "[[Sabela]] — amor"\n---\n# Telmo\n');
    await fs.escribir("V/S/Wiki/Personajes/Sabela.md", "# Sabela\n");
    const g = await leerGrafo(fs, "V", rutas);
    expect(g.aristas).toEqual([{ de: "Telmo", a: "Sabela", tipo: "amor", clase: "romantica" }]);
  });
});

describe("colocar en círculo", () => {
  it("uno va al centro y varios caen dentro del cuadrado", () => {
    expect(colocarEnCirculo(1)).toEqual([{ x: 0.5, y: 0.5 }]);
    const p = colocarEnCirculo(5);
    expect(p).toHaveLength(5);
    for (const { x, y } of p) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });
});
