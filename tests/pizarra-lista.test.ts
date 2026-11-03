import { describe, expect, it } from "vitest";
import { anuncios, filaElemento, filaFlecha, nombreElemento } from "../src/lib/pizarra/lista";
import { anadirTarjeta, crearNota, editarNota, unir } from "../src/lib/pizarra/operaciones";
import type { VistaTarjeta } from "../src/lib/pizarra/resolver";
import { vacia, type Flecha, type Nota, type Tarjeta } from "../src/lib/pizarra/tipos";

const nota = (texto: string): Nota => {
  const r = crearNota(vacia(), { x: 0, y: 0 }, "pz-n");
  if ("error" in r) throw new Error(r.error);
  return editarNota(r.pizarra, "pz-n", texto).pizarra.elementos[0] as Nota;
};
const tarjeta = (): Tarjeta => {
  const r = anadirTarjeta(vacia(), "ep-1", { x: 0, y: 0 });
  if ("error" in r) throw new Error(r.error);
  return r.pizarra.elementos[0] as Tarjeta;
};
const vista = (over: Partial<VistaTarjeta> = {}): VistaTarjeta => ({ pieza: "ep-1", tipo: "episodio", titulo: "La señal", detalle: "T01E01", estado: "ok", ...over });

describe("Textos de «Ver como lista» y anuncios (spec 012, T10e)", () => {
  it("una nota se nombra por su primera línea con texto, cortada", () => {
    expect(nombreElemento(nota("Telmo duda\nsegunda"))).toBe("la nota «Telmo duda»");
    expect(nombreElemento(nota("\n\n  Tercera  "))).toBe("la nota «Tercera»");
    expect(nombreElemento(nota("   "))).toBe("una nota vacía");
    expect(nombreElemento(nota("x".repeat(100)))).toBe(`la nota «${"x".repeat(30)}»`);
    expect(nombreElemento(undefined)).toBe("un elemento que ya no está");
  });

  it("una tarjeta se nombra por el título de su pieza", () => {
    expect(nombreElemento(tarjeta(), vista())).toBe("la tarjeta «La señal»");
  });

  it("la fila de una nota dice color y texto, o que está vacía", () => {
    expect(filaElemento(nota("Telmo duda"))).toBe("Nota ámbar: «Telmo duda»");
    expect(filaElemento(nota(""))).toBe("Nota ámbar vacía");
  });

  it("la fila de una tarjeta dice tipo, código y título, y marca descartada o ausente", () => {
    expect(filaElemento(tarjeta(), vista())).toBe("Tarjeta de episodio · T01E01: La señal");
    expect(filaElemento(tarjeta(), vista({ estado: "descartada" }))).toBe("Tarjeta de episodio · T01E01: La señal (descartada)");
    expect(filaElemento(tarjeta(), vista({ tipo: null, titulo: "(pieza no encontrada)", detalle: "", estado: "ausente" }))).toBe("Tarjeta: (pieza no encontrada)");
  });

  it("la fila de una flecha dice de dónde a dónde y su etiqueta", () => {
    const f = (etiqueta: string): Flecha => ({ id: "pz-f", de: "a", a: "b", etiqueta, extra: {} });
    expect(filaFlecha(f(""), "la nota «A»", "la nota «B»")).toBe("De la nota «A» a la nota «B»");
    expect(filaFlecha(f("provoca"), "la nota «A»", "la nota «B»")).toBe("De la nota «A» a la nota «B» · «provoca»");
  });

  it("los anuncios dicen lo que pasó", () => {
    expect(anuncios.movido(nota("x"))).toBe("Nota movida");
    expect(anuncios.movido(tarjeta())).toBe("Tarjeta movida");
    expect(anuncios.flechaCreada("la nota «A»", "la tarjeta «B»")).toBe("Flecha creada de la nota «A» a la tarjeta «B»");
    expect(anuncios.coloreada("rosa")).toBe("Color rosa");
    expect(anuncios.etiquetada("")).toBe("Etiqueta quitada");
    expect(anuncios.etiquetada("causa")).toBe("Etiqueta «causa»");
  });

  it("quitar cuenta las flechas, en singular y en plural", () => {
    expect(anuncios.quitado("nota", 0)).toBe("Nota quitada.");
    expect(anuncios.quitado("tarjeta", 1)).toBe("Tarjeta quitada. Se quitó 1 flecha.");
    expect(anuncios.quitado("nota", 3)).toBe("Nota quitada. Se quitaron 3 flechas.");
    expect(anuncios.quitado("flecha", 0)).toBe("Flecha quitada.");
  });

  it("sirve con lo que de verdad crean las operaciones", () => {
    const a = crearNota(vacia(), { x: 0, y: 0 }, "pz-a");
    if ("error" in a) throw new Error(a.error);
    const b = anadirTarjeta(a.pizarra, "ep-1", { x: 300, y: 0 });
    if ("error" in b) throw new Error(b.error);
    const u = unir(b.pizarra, "pz-a", b.id, "x");
    if ("error" in u) throw new Error(u.error);
    expect(filaFlecha(u.pizarra.flechas[0], nombreElemento(u.pizarra.elementos[0]), nombreElemento(u.pizarra.elementos[1], vista()))).toBe(
      "De una nota vacía a la tarjeta «La señal» · «x»",
    );
  });
});
