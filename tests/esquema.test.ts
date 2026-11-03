import { describe, expect, it } from "vitest";
import { esquema, esquemaMarkdown, estaVacio } from "../src/lib/vistas/esquema";
import { presencia } from "../src/lib/vistas/presencia";
import { quienSabe } from "../src/lib/vistas/quien-sabe";
import { textoCarga } from "../src/lib/vistas/textos";
import { textoSeguro } from "../src/lib/wiki/md";
import { Constructor } from "./fixtures/constructor";

// Esquema, texto seguro y rendimiento del análisis (spec 010, RF-38 a RF-41, T10)

describe("esquema (spec 010, T10)", () => {
  it("actos en orden y Sin acto al final", () => {
    const b = new Constructor();
    const t = b.temporada({ titulo: "Origen" }, 1);
    const e = t.eps[0];
    b.evento({ episodio: e, titulo: "Suelta", acto: "" });
    b.evento({ episodio: e, titulo: "Final", acto: "3", valor: "Confianza", cambio: ["+", "-"] });
    b.evento({ episodio: e, titulo: "Abre", acto: "teaser" });
    const x = esquema(b.modelo(), t.id);
    const actos = x.episodios[0].actos;
    expect(actos.map((a) => a.nombre)).toEqual(["Teaser", "Desenlace", "Sin acto"]);
    expect(actos.map((a) => a.escenas.map((s) => s.numero))).toEqual([[3], [2], [1]]);
    expect(actos[1].escenas[0]).toMatchObject({ titulo: "Final", valor: "Confianza", carga: "+ → −" });
  });

  it("descartadas fuera, aparcadas marcadas, bandeja al final", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const e = t.eps[0];
    b.evento({ episodio: e, titulo: "Viva", acto: "1" });
    b.evento({ episodio: e, titulo: "Fuera", acto: "1", madurez: "descartado" });
    b.evento({ episodio: e, titulo: "Quieta", acto: "1", madurez_mesa: "aparcado" });
    b.evento({ temporada: t.id, titulo: "Suelta" });
    const x = esquema(b.modelo(), t.id);
    expect(x.episodios[0].actos[0].escenas.map((s) => [s.titulo, s.aparcada])).toEqual([
      ["Viva", false],
      ["Quieta", true],
    ]);
    const md = esquemaMarkdown(x);
    expect(md).not.toContain("Fuera");
    expect(md).toContain("- 3\\. Quieta (aparcada)");
    expect(md.trimEnd().split("\n").slice(-2)).toEqual(["## Bandeja", "- 1\\. Suelta"]);
    expect(md.indexOf("### Inicio")).toBeLessThan(md.indexOf("## Bandeja"));
  });

  it("temporada vacía", () => {
    const b = new Constructor();
    const t = b.temporada({}, 0);
    expect(estaVacio(esquema(b.modelo(), t.id))).toBe(true);
  });

  it("#, ![[, |, <b>, %%, &, - inicial, \\r, U+2028 y bidi quedan neutralizados en una línea", () => {
    const raro = "- # Hola ![[img]] | <b>x</b> %%c%% & a\rb\u2028c\u202ed";
    const s = textoSeguro(raro);
    expect(s).not.toMatch(/[\r\n\u2028\u2029\u202a-\u202e\u2066-\u2069]/);
    expect(s).toBe("\\- \\# Hola \\!\\[\\[img\\]\\] \\| \\<b\\>x\\</b\\> \\%\\%c\\%\\% \\& a b cd");
    expect(textoSeguro("3. Tres")).toBe("3\\. Tres");
    expect(textoSeguro("+ más")).toBe("\\+ más");
    // En el Markdown, cada escena sigue en su línea
    const b = new Constructor();
    const t = b.temporada({ titulo: "T\nuno" }, 1);
    b.evento({ episodio: t.eps[0], titulo: "Uno\nDos", valor: "a|b" });
    const md = esquemaMarkdown(esquema(b.modelo(), t.id));
    expect(md).toContain("- 1\\. Uno Dos — a\\|b\n");
  });

  it("nunca lleva La verdad", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const ev = b.evento({ episodio: t.eps[0], titulo: "Pista" });
    b.secreto({ titulo: "El acuerdo", verdad: "VERDAD-OCULTA", pistas: [{ episodio: "", evento: ev, texto: "x", clase: "sutil" }] });
    expect(esquemaMarkdown(esquema(b.modelo(), t.id))).not.toContain("VERDAD-OCULTA");
  });

  it("textoCarga: como la tarjeta; vacía si no hay nada", () => {
    expect(textoCarga(["-", "+"])).toBe("− → +");
    expect(textoCarga(["", "+"])).toBe("? → +");
    expect(textoCarga(["", ""])).toBe("");
  });

  it("presencia, quién sabe qué y esquema con 300 escenas, 50 personajes y 30 secretos < 200 ms", () => {
    const b = new Constructor();
    const t = b.temporada({}, 10);
    const pj = Array.from({ length: 50 }, (_, i) => `[[P${i}]]`);
    const evs: string[] = [];
    for (let i = 0; i < 300; i++) evs.push(b.evento({ episodio: t.eps[i % 10], titulo: `E${i}`, acto: "1", personajes: [pj[i % 50], pj[(i * 7) % 50]], cambio: ["+", "-"] }));
    for (let i = 0; i < 30; i++)
      b.secreto({
        titulo: `S${i}`,
        conocen: pj.slice(i, i + 5),
        extra: { conocen_desde: pj.slice(i, i + 5).map((p, j) => ({ personaje: p, episodio: t.eps[j] })) },
        pistas: [0, 1, 2].map((j) => ({ episodio: "", evento: evs[(i * 10 + j) % 300], texto: "", clase: "sutil" as const })),
        revelado_en: { episodio: t.eps[i % 10], evento: "" },
      });
    const m = b.modelo();
    const t0 = performance.now();
    presencia(m, null, t.id);
    quienSabe(m, null, t.id);
    esquemaMarkdown(esquema(m, t.id));
    expect(performance.now() - t0).toBeLessThan(200);
  });
});
