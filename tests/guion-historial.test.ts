import { describe, expect, it } from "vitest";
import { quienDeshace } from "../src/lib/app/deshacer";
import { aTexto, desdeTexto, insertarTexto, type Documento, type Pos } from "../src/lib/guion/documento";
import { HistorialGuion, MAXIMO_PASOS, type Estado } from "../src/lib/guion/historial";

const est = (t: string, u = t.length): Estado => ({ doc: desdeTexto(t), pos: { l: 0, u } });

describe("Historial del editor de guion (spec 013, T12c)", () => {
  it("deshacer y rehacer devuelven el documento y el cursor exactos", () => {
    const h = new HistorialGuion(() => 0);
    const a = est("hola");
    const b = est("hola mundo");
    h.hacer(a, b);
    expect(h.puedeDeshacer).toBe(true);
    const atras = h.deshacer()!;
    expect(atras.doc).toBe(a.doc);
    expect(atras.pos).toEqual({ l: 0, u: 4 });
    expect(h.puedeRehacer).toBe(true);
    const adelante = h.rehacer()!;
    expect(adelante.doc).toBe(b.doc);
    expect(aTexto(adelante.doc)).toBe("hola mundo");
    expect(h.deshacer()).not.toBeNull();
    expect(h.deshacer()).toBeNull();
  });

  it("escribir seguido se junta en un paso y una pausa de 1 s lo corta", () => {
    let ahora = 0;
    const h = new HistorialGuion(() => ahora);
    let doc: Documento = desdeTexto("");
    let pos: Pos = { l: 0, u: 0 };
    const escribir = (c: string) => {
      const antes = { doc, pos };
      const r = insertarTexto(doc, pos, c);
      doc = r.doc;
      pos = r.pos;
      h.hacer(antes, { doc, pos }, "escribir");
    };
    for (const c of "hola") {
      escribir(c);
      ahora += 200;
    }
    ahora += 1500;
    for (const c of "mundo") {
      escribir(c);
      ahora += 200;
    }
    expect(aTexto(h.deshacer()!.doc)).toBe("hola");
    expect(aTexto(h.deshacer()!.doc)).toBe("");
    expect(h.deshacer()).toBeNull();
  });

  it("después de deshacer, un cambio nuevo no se junta con el anterior y borra lo rehecho", () => {
    const h = new HistorialGuion(() => 0);
    h.hacer(est(""), est("a"), "escribir");
    h.deshacer();
    h.hacer(est(""), est("b"), "escribir");
    expect(h.puedeRehacer).toBe(false);
    expect(aTexto(h.deshacer()!.doc)).toBe("");
  });

  it("un cambio que no cambia el documento no es un paso", () => {
    const h = new HistorialGuion();
    const a = est("x");
    h.hacer(a, { doc: a.doc, pos: { l: 0, u: 0 } });
    expect(h.puedeDeshacer).toBe(false);
  });

  it("tope de 200 pasos: el más viejo se pierde", () => {
    const h = new HistorialGuion(() => 0);
    for (let i = 0; i < MAXIMO_PASOS + 20; i++) h.hacer(est(String(i)), est(String(i + 1)));
    let n = 0;
    while (h.deshacer()) n++;
    expect(n).toBe(MAXIMO_PASOS);
  });

  it("vaciar olvida todo (cambio por fuera)", () => {
    const h = new HistorialGuion();
    h.hacer(est("a"), est("b"));
    h.vaciar();
    expect(h.puedeDeshacer).toBe(false);
    expect(h.puedeRehacer).toBe(false);
  });

  it("cada escena tiene el suyo: no se mezclan", () => {
    const a = new HistorialGuion();
    const b = new HistorialGuion();
    a.hacer(est("1"), est("12"));
    expect(b.puedeDeshacer).toBe(false);
  });
});

describe("Reparto de Ctrl Z según el foco (spec 013, T12c)", () => {
  it("el editor de guion se atiende a sí mismo, también en la vista de piezas", () => {
    expect(quienDeshace({ foco: "editor-guion", vista: "guion", capas: false })).toBe("guion");
    expect(quienDeshace({ foco: "editor-guion", vista: "pizarra", capas: false })).toBe("guion");
  });

  it("un campo de texto normal usa el suyo", () => {
    expect(quienDeshace({ foco: "campo", vista: "serie", capas: false })).toBe("campo");
  });

  it("sin foco en un campo: la pizarra deshace la pizarra, el guion nada y el resto, las piezas", () => {
    expect(quienDeshace({ foco: "otro", vista: "pizarra", capas: false })).toBe("pizarra");
    // En la vista del guion, fuera del editor, deshacer no toca las piezas (revisión de código, hallazgo 15)
    expect(quienDeshace({ foco: "otro", vista: "guion", capas: false })).toBe("nada");
    expect(quienDeshace({ foco: "otro", vista: "serie", capas: false })).toBe("piezas");
  });

  it("con una ventana abierta, deshacer no actúa detrás", () => {
    expect(quienDeshace({ foco: "otro", vista: "serie", capas: true })).toBe("nada");
  });
});
