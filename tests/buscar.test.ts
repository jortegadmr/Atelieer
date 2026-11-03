import { describe, expect, it } from "vitest";
import { Modelo } from "../src/lib/modelo/modelo";
import type { DatosModelo } from "../src/lib/modelo/modelo";
import type { Pieza } from "../src/lib/modelo/tipos";
import { buscar } from "../src/lib/vistas/buscar";
import { piezasDePrueba } from "../scripts/datos-prueba";

function modelo() {
  const d: DatosModelo = { serie: null as never, puntos: [], temporadas: [], episodios: [], arcos: [], eventos: [], secretos: [] };
  const lista: Record<string, keyof DatosModelo> = { punto: "puntos", temporada: "temporadas", episodio: "episodios", arco: "arcos", evento: "eventos", secreto: "secretos" };
  for (const p of piezasDePrueba() as Pieza[]) {
    if (p.tipo === "serie") d.serie = p;
    else (d[lista[p.tipo]] as Pieza[]).push(p);
  }
  return new Modelo(d);
}

describe("buscar (Ctrl K, T7.4)", () => {
  it("«cinta» encuentra el arco, el evento y el secreto (y el episodio)", () => {
    const r = buscar(modelo(), "cinta");
    const titulos = r.map((x) => `${x.tipo}: ${x.titulo}`);
    expect(titulos).toContain("arco: La cinta oculta");
    expect(titulos).toContain("evento: Llega la cinta oculta");
    expect(titulos).toContain("secreto: Quién grabó la cinta");
    expect(titulos).toContain("episodio: La cinta");
    expect(titulos).not.toContain("arco: Nando se va en E05");
  });

  it("sin distinguir acentos ni mayúsculas", () => {
    expect(buscar(modelo(), "QUIEN GRABO").map((x) => x.titulo)).toEqual(["Quién grabó la cinta"]);
    expect(buscar(modelo(), "climax").some((x) => x.tipo === "punto")).toBe(true);
  });

  it("también por código; sin texto, nada", () => {
    expect(buscar(modelo(), "T01E06")[0].titulo).toBe("La cinta");
    expect(buscar(modelo(), "  ")).toEqual([]);
  });

  it("lo que empieza por el texto va antes", () => {
    const r = buscar(modelo(), "la");
    expect(r[0].titulo.toLowerCase().startsWith("la")).toBe(true);
  });
});
