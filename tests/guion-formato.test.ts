import { describe, expect, it } from "vitest";
import { escribirGuion, leerGuion } from "../src/lib/guion/formato";
import { TOPE_BYTES, conGuion, esIdEscena, vacio, type Guion } from "../src/lib/guion/tipos";

function leido(texto: string) {
  const r = leerGuion(texto);
  if ("ilegible" in r) throw new Error(`ilegible: ${r.ilegible}`);
  return r;
}

const base = (texto: string, over: Partial<Guion> = {}): Guion => ({ ...vacio("ev-7f3a"), texto, ...over });

describe("Formato del guion (spec 013, T2)", () => {
  it("ida y vuelta idéntica y dos escrituras iguales dan el mismo texto", () => {
    const g = base("INT. TALLER – NOCHE\n\n[[Vera]] entra.\n\nVERA\n¿Hugo?\n");
    const t = escribirGuion(g);
    const r = leido(t);
    expect(r.avisos).toEqual([]);
    expect(r.soloLectura).toBe(false);
    expect(r.guion).toEqual(g);
    expect(escribirGuion(r.guion)).toBe(t);
  });

  it("la cabecera lleva la versión y la escena", () => {
    expect(escribirGuion(base("hola"))).toBe("---\natelier_guion: 1\nescena: ev-7f3a\n---\nhola");
  });

  it("los campos ajenos de la cabecera se conservan", () => {
    const t = "---\natelier_guion: 1\nescena: ev-7f3a\nrevision: azul\nnotas:\n  - uno\n---\ntexto\n";
    const r = leido(t);
    expect(r.guion.extra).toEqual({ revision: "azul", notas: ["uno"] });
    expect(leido(escribirGuion(r.guion)).guion.extra).toEqual({ revision: "azul", notas: ["uno"] });
  });

  it("__proto__ en la cabecera no cambia nada", () => {
    const r = leido("---\natelier_guion: 1\n__proto__: {x: 1}\n---\nhola");
    expect(Object.getPrototypeOf(r.guion.extra)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>)["x"]).toBeUndefined();
    expect(Object.keys(r.guion.extra)).toEqual([]);
  });

  it("LF y CRLF se leen igual y se conserva el estilo", () => {
    const lf = "---\natelier_guion: 1\nescena: ev-7f3a\n---\nuno\n\ndos\n";
    const crlf = lf.replace(/\n/g, "\r\n");
    const a = leido(lf).guion;
    const b = leido(crlf).guion;
    expect(b.texto).toBe(a.texto);
    expect(a.finDeLinea).toBe("\n");
    expect(b.finDeLinea).toBe("\r\n");
    expect(escribirGuion(a)).toBe(lf);
    expect(escribirGuion(b)).toBe(crlf);
  });

  it("finales de línea mezclados se unifican con aviso", () => {
    const r = leido("---\natelier_guion: 1\n---\nuno\r\ndos\ntres\n");
    expect(r.avisos.some((a) => a.includes("mezclados"))).toBe(true);
  });

  it("control, bidi y \\0 vuelven igual", () => {
    const raro = "a\0b\u202Ec\u2066d\u200Be\u0007f\r\rg";
    const g = base(`INT. ${raro}\n`);
    const r = leido(escribirGuion(g));
    expect(r.guion.texto).toBe(g.texto);
    const crlf = leido(escribirGuion({ ...g, finDeLinea: "\r\n" }));
    expect(crlf.guion.texto).toBe(g.texto);
  });

  it("la marca de orden de bytes se conserva", () => {
    const t = `\uFEFF${escribirGuion(base("x"))}`;
    const r = leido(t);
    expect(r.guion.bom).toBe(true);
    expect(escribirGuion(r.guion)).toBe(t);
  });

  it("versión 2 → solo lectura y no se pierde el texto", () => {
    const r = leido("---\natelier_guion: 2\nescena: ev-7f3a\n---\nfuturo");
    expect(r.soloLectura).toBe(true);
    expect(r.guion.texto).toBe("futuro");
    expect(escribirGuion(r.guion)).toContain("atelier_guion: 2");
  });

  it("cabecera rota → ilegible con motivo", () => {
    expect("ilegible" in leerGuion("---\natelier_guion: 1\nsin cierre")).toBe(true);
    expect("ilegible" in leerGuion("---\n: : :\n  - [\n---\nx")).toBe(true);
    expect("ilegible" in leerGuion("---\n- lista\n---\nx")).toBe(true);
  });

  it("sin cabecera se lee como guion y se avisa", () => {
    const r = leido("INT. TALLER – NOCHE\n");
    expect(r.guion.texto).toBe("INT. TALLER – NOCHE\n");
    expect(r.avisos.length).toBe(1);
    expect(escribirGuion(r.guion).startsWith("---\natelier_guion: 1\n")).toBe(true);
  });

  it("una línea --- dentro del texto del guion no cambia nada", () => {
    const g = base("uno\n---\ndos\n");
    expect(leido(escribirGuion(g)).guion.texto).toBe("uno\n---\ndos\n");
  });

  it("más de 1 MB → solo lectura", () => {
    const grande = "a".repeat(TOPE_BYTES + 1);
    const r = leido(escribirGuion(base(grande)));
    expect(r.soloLectura).toBe(true);
    expect(r.guion.texto.length).toBe(grande.length);
    expect(leido(escribirGuion(base("a".repeat(1000)))).soloLectura).toBe(false);
  });

  it("con guion = algún carácter no blanco", () => {
    expect(conGuion({ texto: "" })).toBe(false);
    expect(conGuion({ texto: " \n\t  \n" })).toBe(false);
    expect(conGuion({ texto: "\n.\n" })).toBe(true);
  });

  it("un id sin la forma de una escena no construye ruta", () => {
    expect(esIdEscena("ev-7f3a")).toBe(true);
    for (const malo of ["../x", "ev-../../x", "ev-7f", "EV-7F3A", "ev-7f3a.md", "", "ev-7f3a/..", 5, null]) expect(esIdEscena(malo)).toBe(false);
  });
});
