import { describe, expect, it } from "vitest";
import { aLienzo, centro, elementoEn, salida, sitioLibre, trazoFlecha } from "../src/lib/pizarra/geometria";
import { crearNota } from "../src/lib/pizarra/operaciones";
import { LIENZO, vacia, type Pizarra } from "../src/lib/pizarra/tipos";

const con = (...sitios: { x: number; y: number }[]): Pizarra => {
  let p = vacia();
  for (const s of sitios) {
    const r = crearNota(p, s);
    if ("error" in r) throw new Error(r.error);
    p = r.pizarra;
  }
  return p;
};

describe("Geometría del lienzo (spec 012, T10)", () => {
  it("la flecha sale por el borde de cada elemento, no por su centro", () => {
    const t = trazoFlecha({ x: 0, y: 0 }, { x: 400, y: 0 });
    expect(t.desde).toEqual({ x: 220, y: 70 });
    expect(t.hasta).toEqual({ x: 400, y: 70 });
    expect(t.medio).toEqual({ x: 310, y: 70 });
  });

  it("en diagonal sale por el lado que toca antes", () => {
    const s = salida({ x: 0, y: 0 }, { x: 110 + 1000, y: 70 + 1000 });
    expect(s.y).toBeCloseTo(140, 5);
    expect(s.x).toBeLessThan(220);
  });

  it("dos elementos en el mismo sitio no rompen el trazo", () => {
    const t = trazoFlecha({ x: 5, y: 5 }, { x: 5, y: 5 });
    expect(Number.isFinite(t.desde.x + t.hasta.y)).toBe(true);
    expect(salida({ x: 5, y: 5 }, centro({ x: 5, y: 5 }))).toEqual(centro({ x: 5, y: 5 }));
  });

  it("un elemento nuevo no cae justo encima de otro", () => {
    const p = con({ x: 100, y: 100 });
    const s = sitioLibre(p, { x: 100, y: 100 });
    expect(s).not.toEqual({ x: 100, y: 100 });
    expect(sitioLibre(vacia(), { x: 7, y: 9 })).toEqual({ x: 7, y: 9 });
  });

  it("no se sale del lienzo", () => {
    expect(sitioLibre(vacia(), { x: 1e9, y: -1e9 })).toEqual({ x: LIENZO, y: -LIENZO });
  });

  it("el elemento bajo el puntero es el de más arriba", () => {
    const p = con({ x: 0, y: 0 }, { x: 50, y: 50 });
    expect(elementoEn(p, { x: 100, y: 100 })?.id).toBe(p.elementos[1].id);
    expect(elementoEn(p, { x: 10, y: 10 })?.id).toBe(p.elementos[0].id);
    expect(elementoEn(p, { x: 900, y: 900 })).toBeNull();
  });

  it("de la pantalla al lienzo con el encuadre", () => {
    expect(aLienzo({ x: 300, y: 100 }, { x: 100, y: 0, zoom: 2 })).toEqual({ x: 100, y: 50 });
  });
});
