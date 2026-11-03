import { describe, expect, it } from "vitest";
import { HistorialPizarra, MAXIMO_PASOS } from "../src/lib/pizarra/historial";
import { ENCUADRE_INICIAL, TAMANO_ELEMENTO, acercar, encajar, mover } from "../src/lib/pizarra/encuadre";
import { crearNota, editarNota, moverElemento } from "../src/lib/pizarra/operaciones";
import { LIENZO, ZOOM_MAX, ZOOM_MIN, vacia, type Elemento, type Nota, type Pizarra } from "../src/lib/pizarra/tipos";

function conNota(texto = "", id = "pz-a"): Pizarra {
  const r = crearNota(vacia(), { x: 0, y: 0 }, id);
  if ("error" in r) throw new Error(r.error);
  return editarNota(r.pizarra, id, texto).pizarra;
}

describe("Historial de la pizarra (spec 012, T3)", () => {
  it("deshacer y rehacer devuelven la pizarra exacta", () => {
    const h = new HistorialPizarra();
    const p0 = vacia();
    const p1 = conNota("a");
    const p2 = moverElemento(p1, "pz-a", 50, 60);
    h.hacer(p0, p1);
    h.hacer(p1, p2);
    expect(h.puedeDeshacer).toBe(true);
    expect(h.puedeRehacer).toBe(false);
    expect(h.deshacer()).toBe(p1);
    expect(h.deshacer()).toBe(p0);
    expect(h.deshacer()).toBeNull();
    expect(h.puedeRehacer).toBe(true);
    expect(h.rehacer()).toBe(p1);
    expect(h.rehacer()).toBe(p2);
    expect(h.rehacer()).toBeNull();
  });

  it("un paso por movimiento: cada «hacer» es un paso", () => {
    const h = new HistorialPizarra();
    const a = conNota("a");
    const b = moverElemento(a, "pz-a", 1, 1);
    const c = moverElemento(b, "pz-a", 2, 2);
    h.hacer(a, b);
    h.hacer(b, c);
    expect(h.deshacer()).toBe(b);
    expect(h.deshacer()).toBe(a);
  });

  it("editar texto seguido, con la misma clave y poco tiempo entre medias, se junta en un paso", () => {
    let ahora = 1000;
    const h = new HistorialPizarra(() => ahora);
    const p0 = conNota("");
    const p1 = editarNota(p0, "pz-a", "h").pizarra;
    const p2 = editarNota(p1, "pz-a", "ho").pizarra;
    const p3 = editarNota(p2, "pz-a", "hol").pizarra;
    h.hacer(p0, p1, "texto:pz-a");
    ahora += 300;
    h.hacer(p1, p2, "texto:pz-a");
    ahora += 300;
    h.hacer(p2, p3, "texto:pz-a");
    expect(h.deshacer()).toBe(p0);
    expect(h.deshacer()).toBeNull();
    expect(h.rehacer()).toBe(p3);
  });

  it("no se junta si pasa mucho tiempo, si cambia la clave o si hubo un deshacer entre medias", () => {
    let ahora = 0;
    const h = new HistorialPizarra(() => ahora);
    const p0 = conNota("");
    const p1 = editarNota(p0, "pz-a", "a").pizarra;
    const p2 = editarNota(p1, "pz-a", "ab").pizarra;
    h.hacer(p0, p1, "texto:pz-a");
    ahora += 5000;
    h.hacer(p1, p2, "texto:pz-a");
    expect(h.deshacer()).toBe(p1);
    // Tras deshacer, lo siguiente es un paso nuevo aunque sea rápido
    const p2b = editarNota(p1, "pz-a", "ac").pizarra;
    h.hacer(p1, p2b, "texto:pz-a");
    expect(h.deshacer()).toBe(p1);
    expect(h.deshacer()).toBe(p0);
    // Otra clave: otro paso
    const h2 = new HistorialPizarra(() => 0);
    h2.hacer(p0, p1, "texto:pz-a");
    h2.hacer(p1, p2, "texto:pz-b");
    expect(h2.deshacer()).toBe(p1);
  });

  it("hacer algo tras deshacer vacía lo que se podía rehacer", () => {
    const h = new HistorialPizarra();
    const a = conNota("a");
    const b = moverElemento(a, "pz-a", 1, 1);
    h.hacer(vacia(), a);
    h.hacer(a, b);
    h.deshacer();
    expect(h.puedeRehacer).toBe(true);
    h.hacer(a, moverElemento(a, "pz-a", 9, 9));
    expect(h.puedeRehacer).toBe(false);
  });

  it("un «hacer» sin cambio (la misma pizarra) no cuenta", () => {
    const h = new HistorialPizarra();
    const a = conNota("a");
    h.hacer(a, a);
    expect(h.puedeDeshacer).toBe(false);
  });

  it("guarda como mucho 200 pasos y se puede vaciar", () => {
    const h = new HistorialPizarra();
    let p = conNota("");
    for (let i = 0; i < MAXIMO_PASOS + 20; i++) {
      const q = moverElemento(p, "pz-a", i, i);
      h.hacer(p, q);
      p = q;
    }
    let n = 0;
    while (h.deshacer()) n++;
    expect(n).toBe(MAXIMO_PASOS);
    h.hacer(p, moverElemento(p, "pz-a", -1, -1));
    h.vaciar();
    expect(h.puedeDeshacer).toBe(false);
    expect(h.puedeRehacer).toBe(false);
  });
});

describe("Encuadre del lienzo (spec 012, T3)", () => {
  const pantalla = { ancho: 1000, alto: 600 };
  const el = (id: string, x: number, y: number): Nota => ({ tipo: "nota", id, texto: "", color: "ambar", x, y, extra: {} });
  const pizarra = (...e: Elemento[]): Pizarra => ({ ...vacia(), elementos: e });

  it("el zoom queda entre 25 % y 200 %", () => {
    let e = ENCUADRE_INICIAL;
    for (let i = 0; i < 50; i++) e = acercar(e, 1.5, { x: 500, y: 300 });
    expect(e.zoom).toBe(ZOOM_MAX);
    for (let i = 0; i < 50; i++) e = acercar(e, 0.5, { x: 500, y: 300 });
    expect(e.zoom).toBe(ZOOM_MIN);
  });

  it("acercar deja quieto el punto que hay bajo el foco", () => {
    const e0 = { x: 40, y: -30, zoom: 1 };
    const foco = { x: 300, y: 200 };
    const e1 = acercar(e0, 1.5, foco);
    // El punto del lienzo bajo el foco antes y después es el mismo
    const antes = { x: (foco.x - e0.x) / e0.zoom, y: (foco.y - e0.y) / e0.zoom };
    const despues = { x: (foco.x - e1.x) / e1.zoom, y: (foco.y - e1.y) / e1.zoom };
    expect(despues.x).toBeCloseTo(antes.x, 6);
    expect(despues.y).toBeCloseTo(antes.y, 6);
  });

  it("mover desplaza el encuadre", () => {
    expect(mover({ x: 10, y: 20, zoom: 1 }, 5, -5)).toEqual({ x: 15, y: 15, zoom: 1 });
  });

  it("encajar sin elementos no hace nada", () => {
    const e = { x: 7, y: 8, zoom: 1.5 };
    expect(encajar(vacia(), pantalla, e)).toBe(e);
  });

  it("encajar con un elemento lo centra a zoom 1", () => {
    const e = encajar(pizarra(el("pz-a", 500, 400)), pantalla, { x: 0, y: 0, zoom: 0.5 });
    expect(e.zoom).toBe(1);
    const centro = { x: 500 + TAMANO_ELEMENTO.ancho / 2, y: 400 + TAMANO_ELEMENTO.alto / 2 };
    expect(centro.x * e.zoom + e.x).toBeCloseTo(pantalla.ancho / 2, 6);
    expect(centro.y * e.zoom + e.y).toBeCloseTo(pantalla.alto / 2, 6);
  });

  it("encajar con varios cabe en pantalla y no pasa de zoom 1", () => {
    const p = pizarra(el("pz-a", 0, 0), el("pz-b", 1800, 900));
    const e = encajar(p, pantalla, ENCUADRE_INICIAL);
    expect(e.zoom).toBeLessThan(1);
    expect(e.zoom).toBeGreaterThanOrEqual(ZOOM_MIN);
    for (const x of p.elementos) {
      expect(x.x * e.zoom + e.x).toBeGreaterThanOrEqual(0);
      expect((x.x + TAMANO_ELEMENTO.ancho) * e.zoom + e.x).toBeLessThanOrEqual(pantalla.ancho);
    }
    // Dos elementos cercanos no se agrandan más de 1
    expect(encajar(pizarra(el("pz-a", 0, 0), el("pz-b", 50, 50)), pantalla, ENCUADRE_INICIAL).zoom).toBe(1);
  });

  it("encajar con elementos en los dos extremos del lienzo usa el zoom mínimo y los centra", () => {
    const p = pizarra(el("pz-a", -LIENZO, -LIENZO), el("pz-b", LIENZO, LIENZO));
    const e = encajar(p, pantalla, ENCUADRE_INICIAL);
    expect(e.zoom).toBe(ZOOM_MIN);
    expect(Number.isFinite(e.x) && Number.isFinite(e.y)).toBe(true);
    const centro = { x: (-LIENZO + LIENZO + TAMANO_ELEMENTO.ancho) / 2, y: (-LIENZO + LIENZO + TAMANO_ELEMENTO.alto) / 2 };
    expect(centro.x * e.zoom + e.x).toBeCloseTo(pantalla.ancho / 2, 6);
    expect(centro.y * e.zoom + e.y).toBeCloseTo(pantalla.alto / 2, 6);
  });
});
