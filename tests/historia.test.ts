import { describe, expect, it } from "vitest";
import {
  cambioDeEpoca,
  columnaDeEscena,
  columnasHistoria,
  dondeSeEmite,
  pasoHistoria,
  porQueNoSeCambia,
  type FuenteEpocas,
} from "../src/lib/vistas/historia";
import type { Epoca } from "../src/lib/wiki/fichas";
import { claveLimpia as clave } from "../src/lib/wiki/md";
import type { Evento } from "../src/lib/modelo/tipos";
import { Constructor } from "./fixtures/constructor";
import { copiaModelo } from "../src/lib/consecuencias/copia";
import { marcasHistoria } from "../src/lib/consecuencias/vistas";

const epoca = (nombre: string, alias: string[] = [], presente = false): Epoca => ({
  nombre,
  claves: new Set([nombre, ...alias].map(clave)),
  ruta: `W/${nombre}.md`,
  presente,
});

const fuente = (epocas: Epoca[]): FuenteEpocas => ({
  epocas: () => epocas,
  esPresente: (s) => !clave(s) || clave(s) === "presente",
});

function serie() {
  const b = new Constructor();
  const t1 = b.temporada({}, 2);
  const t2 = b.temporada({}, 1);
  const a = b.evento({ titulo: "A", episodio: t1.eps[1], mundo: "[[C1]]" });
  const bb = b.evento({ titulo: "B", episodio: t1.eps[0], mundo: "[[La Inundación|inundación]]" });
  const cc = b.evento({ titulo: "C", episodio: t2.eps[0], mundo: "" });
  const d = b.evento({ titulo: "D", temporada: t1.id, mundo: "Edad perdida" });
  const e = b.evento({ titulo: "E", mundo: "c1" });
  return { m: b.modelo(), t1, t2, a, bb, cc, d, e };
}

const EPOCAS = [epoca("C1"), epoca("La Inundación"), epoca("Presente", [], true), epoca("Después")];

describe("columnas de la línea de la historia (spec 009, RF-4 a RF-9, RF-14)", () => {
  it("épocas en orden, Presente en su fila y No está en la wiki detrás", () => {
    const { m } = serie();
    const cols = columnasHistoria(m, fuente(EPOCAS), "");
    expect(cols.map((x) => [x.nombre, x.escenas.map((e) => e.titulo)])).toEqual([
      ["C1", ["A", "E"]],
      ["La Inundación", ["B"]],
      ["Presente", ["C"]],
      ["Después", []],
      ["No está en la wiki", ["D"]],
    ]);
  });

  it("sin fila Presente, va al final; el filtro deja solo su temporada con la bandeja", () => {
    const { m, t1 } = serie();
    const cols = columnasHistoria(m, fuente([epoca("C1"), epoca("La Inundación")]), t1.id);
    expect(cols.map((x) => [x.nombre, x.escenas.map((e) => e.titulo)])).toEqual([
      ["C1", ["A"]],
      ["La Inundación", ["B"]],
      ["No está en la wiki", ["D"]],
      ["Presente", []],
    ]);
  });

  it("dónde se emite: código y número, bandeja o sin temporada", () => {
    const { m, a, d, e } = serie();
    expect(dondeSeEmite(m, m.eventos.get(a)!)).toMatch(/^T01E02 · 1$/);
    expect(dondeSeEmite(m, m.eventos.get(d)!)).toBe("Bandeja T01");
    expect(dondeSeEmite(m, m.eventos.get(e)!)).toBe("Sin temporada");
  });
});

describe("cambiar de época (spec 009, RF-18 a RF-26)", () => {
  it("el cambio solo toca mundo", () => {
    const { m, a } = serie();
    const cols = columnasHistoria(m, fuente(EPOCAS), "");
    const cambio = cambioDeEpoca(m, cols, a, cols[1])!;
    expect(cambio.borrar).toEqual([]);
    expect(cambio.guardar).toHaveLength(1);
    const antes = m.eventos.get(a)!;
    const despues = cambio.guardar[0] as Evento;
    expect(despues.mundo).toBe("[[La Inundación]]");
    expect({ ...despues, mundo: antes.mundo }).toEqual(antes);
  });

  it("a Presente deja vacío", () => {
    const { m, a } = serie();
    const cols = columnasHistoria(m, fuente(EPOCAS), "");
    expect((cambioDeEpoca(m, cols, a, cols[2])!.guardar[0] as Evento).mundo).toBe("");
  });

  it("en su misma columna, nada; en No está en la wiki, no se suelta", () => {
    const { m, a, d } = serie();
    const cols = columnasHistoria(m, fuente(EPOCAS), "");
    expect(cambioDeEpoca(m, cols, a, cols[0])).toBeNull();
    const fuera = cols.find((x) => x.id === "fuera")!;
    expect(cambioDeEpoca(m, cols, a, fuera)).toBeNull();
    expect(porQueNoSeCambia(m, a, fuera, false)).toBeTruthy();
    expect(cambioDeEpoca(m, cols, d, cols[0])!.guardar[0]).toMatchObject({ mundo: "[[C1]]" });
  });

  it("nombre con | no se suelta, y canon bloqueado tampoco", () => {
    const { m, a } = serie();
    const cols = columnasHistoria(m, fuente([...EPOCAS, epoca("Era #2")]), "");
    const mala = cols.find((x) => x.nombre === "Era #2")!;
    expect(mala.soltable).toBe(false);
    expect(cambioDeEpoca(m, cols, a, mala)).toBeNull();
    expect(porQueNoSeCambia(m, a, mala, false)).toMatch(/no se puede escribir como enlace/);
    expect(porQueNoSeCambia(m, a, cols[1], true)).toBe("La escena es canon: desbloquéala para moverla");
    expect(porQueNoSeCambia(m, a, cols[1], false)).toBeNull();
  });

  it("Alt + flechas salta No está en la wiki y avisa en los bordes", () => {
    const { m, a, cc, d } = serie();
    const cols = columnasHistoria(m, fuente(EPOCAS), "");
    expect(pasoHistoria(cols, a, "izq")).toEqual({ borde: "Ya está en la primera época" });
    expect(pasoHistoria(cols, a, "der")).toMatchObject({ columna: { nombre: "La Inundación" } });
    expect(pasoHistoria(cols, cc, "der")).toMatchObject({ columna: { nombre: "Después" } });
    expect(pasoHistoria(cols, d, "izq")).toMatchObject({ columna: { nombre: "Después" } });
    expect(pasoHistoria(cols, d, "der")).toEqual({ borde: "Ya está en la última época" });
    expect(columnaDeEscena(cols, d)!.id).toBe("fuera");
  });
});

describe("marcas en la línea (spec 009, RF-30)", () => {
  it("Estaba aquí en la columna de donde salió y Nueva en la nueva; lo no cambiado, nada", () => {
    const { m, a, bb } = serie();
    const base = copiaModelo(m);
    const cols = columnasHistoria(m, fuente(EPOCAS), "");
    m.poner(cambioDeEpoca(m, cols, a, cols[2])!.guardar[0]);
    m.poner({ ...m.eventos.get(bb)!, id: "ev-nueva", titulo: "Nueva escena" });
    const r = marcasHistoria(base, m, [a, "ev-nueva", bb], fuente(EPOCAS), "");
    expect([...r.estabanAqui.entries()]).toEqual([[cols[0].id, [{ id: a, titulo: "A" }]]]);
    expect([...r.nuevas]).toEqual(["ev-nueva"]);
  });
});
