import { describe, expect, it } from "vitest";
import { generarPruebaGrande } from "../scripts/datos-grande";
import { Modelo } from "../src/lib/modelo/modelo";
import type { Ficha } from "../src/lib/wiki/fichas";
import { alias, casilla, clavePersonaje, existeLente, fueraDeLente, objetivosLente, personajesDeSerie, relacion, sinNadaQueVer, type FuentePersonajes } from "../src/lib/vistas/lente";
import { Constructor } from "./fixtures/constructor";

// La lente (spec 010, RF-1, RF-4, RF-10, RF-11, T7)

/** Una wiki con estas fichas de personaje: [nombre, ...aliases] */
function wiki(...fichas: string[][]): FuentePersonajes {
  const l = fichas.map(([nombre, ...aliases]) => ({ nombre, aliases, tipo: "personaje", ruta: `P/${nombre}.md`, resumen: "", detalle: "" }) as unknown as Ficha);
  return { de: (t) => (t === "personaje" ? l : []) };
}

function serie() {
  const b = new Constructor();
  const t = b.temporada({}, 3);
  const [e1, e2, e3] = t.eps;
  const a = b.arco({ titulo: "El eco" });
  const tramo = b.arco({ titulo: "La tormenta", tramo_de: a });
  const otro = b.arco({ titulo: "Amor" });
  const s1 = b.evento({ titulo: "Uno", episodio: e1, personajes: ["[[Telmo]]"], arcos: [[a, "abre"]] });
  const s2 = b.evento({ titulo: "Dos", episodio: e2, personajes: ["el Técnico"], arcos: [[tramo, "avanza"]] });
  const s3 = b.evento({ titulo: "Tres", episodio: e3, personajes: ["[[Ana]]"], arcos: [[otro, "abre"]] });
  const s4 = b.evento({ titulo: "Descartada", episodio: e3, personajes: ["[[Nadie]]"], madurez: "descartado" });
  const s5 = b.evento({ titulo: "Bandeja", temporada: t.id, personajes: ["telmo"] });
  const sc = b.secreto({
    titulo: "El acuerdo",
    conocen: ["[[Lia]]"],
    pistas: [
      { episodio: "", evento: s1, texto: "a", clase: "sutil" },
      { episodio: e2, evento: "", texto: "b", clase: "sutil" },
    ],
    revelado_en: { episodio: e3, evento: s3 },
  });
  const scDesc = b.secreto({ titulo: "Viejo", madurez: "descartado", conocen: ["[[Otro]]"] });
  const arDesc = b.arco({ titulo: "Abandonado", madurez: "descartado" });
  return { b, m: b.modelo(), t: t.id, e1, e2, e3, a, tramo, otro, s1, s2, s3, s4, s5, sc, scDesc, arDesc };
}

describe("lente (spec 010, T7)", () => {
  it("Telmo, [[Telmo]] y telmo son uno", () => {
    const x = serie();
    const p = personajesDeSerie(x.m, null);
    expect(p.get("telmo")).toEqual({ nombre: "Telmo", formas: ["Telmo", "telmo"] });
    const al = alias(null);
    expect(clavePersonaje(al, "[[Telmo]]")).toBe(clavePersonaje(al, "telmo"));
    const r = relacion(x.m, al, { tipo: "personaje", clave: "telmo", nombre: "Telmo" });
    expect([...r.escenas].sort()).toEqual([x.s1, x.s5].sort());
    expect([...r.episodios]).toEqual([x.e1]);
  });

  it("una escena escrita con el alias entra en la lente del personaje", () => {
    const x = serie();
    const w = wiki(["Telmo", "el Técnico"]);
    const p = personajesDeSerie(x.m, w);
    expect(p.has("el técnico")).toBe(false);
    expect(p.get("telmo")?.formas).toContain("el Técnico");
    const r = relacion(x.m, alias(w), { tipo: "personaje", clave: "telmo", nombre: "Telmo" });
    expect(r.escenas.has(x.s2)).toBe(true);
    // Sin la ficha, el Técnico es otro personaje
    expect(relacion(x.m, alias(null), { tipo: "personaje", clave: "telmo", nombre: "Telmo" }).escenas.has(x.s2)).toBe(false);
  });

  it("solo en Lo conocen cuenta", () => {
    const x = serie();
    expect(personajesDeSerie(x.m, null).has("lia")).toBe(true);
    const r = relacion(x.m, alias(null), { tipo: "personaje", clave: "lia", nombre: "Lia" });
    expect(r.escenas.size).toBe(0);
    expect([...r.secretos]).toEqual([x.sc]);
    expect(existeLente(x.m, null, null, { tipo: "personaje", clave: "lia", nombre: "Lia" })).toBe(true);
  });

  it("descartados no salen", () => {
    const x = serie();
    const nombres = objetivosLente(x.m, null).map((o) => `${o.tipo}:${o.nombre}`);
    expect(nombres).toContain("arco:El eco");
    expect(nombres).toContain("secreto:El acuerdo");
    expect(nombres).not.toContain("arco:Abandonado");
    expect(nombres).not.toContain("secreto:Viejo");
    expect(nombres).not.toContain("personaje:Nadie");
    expect(nombres).not.toContain("personaje:Otro");
    expect(existeLente(x.m, null, null, { tipo: "arco", id: x.arDesc })).toBe(false);
    // Con ficha sí es personaje de la serie, aunque no salga en nada
    expect(objetivosLente(x.m, wiki(["Nadie"])).map((o) => o.nombre)).toContain("Nadie");
  });

  it("arco: sus escenas, las de sus tramos y la fila entera", () => {
    const x = serie();
    const r = relacion(x.m, alias(null), { tipo: "arco", id: x.a });
    expect([...r.arcos].sort()).toEqual([x.a, x.tramo].sort());
    expect([...r.escenas].sort()).toEqual([x.s1, x.s2].sort());
    expect(r.casillas.has(casilla(x.a, x.e1))).toBe(true);
    expect(r.casillas.has(casilla(x.otro, x.e3))).toBe(false);
  });

  it("secreto: escenas de pistas y episodios marcados sin escena", () => {
    const x = serie();
    const r = relacion(x.m, alias(null), { tipo: "secreto", id: x.sc });
    expect([...r.escenas].sort()).toEqual([x.s1, x.s3].sort());
    expect([...r.episodios].sort()).toEqual([x.e1, x.e2, x.e3].sort());
    expect(r.casillas.has(casilla(x.otro, x.e3))).toBe(true);
  });

  it("secreto: pista de una escena borrada cuenta por su episodio marcado, como en Quién sabe qué", () => {
    const b = new Constructor();
    const t = b.temporada({}, 2);
    const sc = b.secreto({ titulo: "S", pistas: [{ episodio: t.eps[1], evento: "ev-borrada", texto: "", clase: "sutil" }] });
    const r = relacion(b.modelo(), alias(null), { tipo: "secreto", id: sc });
    expect([...r.episodios]).toEqual([t.eps[1]]);
  });

  it("con variante existe si existe en uno de los dos", () => {
    const x = serie();
    const otro = new Constructor();
    const m2 = otro.modelo();
    const l = { tipo: "arco", id: x.a } as const;
    expect(existeLente(m2, null, null, l)).toBe(false);
    expect(existeLente(m2, x.m, null, l)).toBe(true);
    expect(existeLente(x.m, m2, null, { tipo: "personaje", clave: "ana", nombre: "Ana" })).toBe(true);
  });

  it("sin nada que ver: lo dice si nada visible está relacionado", () => {
    const x = serie();
    const r = relacion(x.m, alias(null), { tipo: "personaje", clave: "ana", nombre: "Ana" });
    expect(sinNadaQueVer(r, [x.e1, x.e2])).toBe(true);
    expect(sinNadaQueVer(r, [x.e1, x.e3])).toBe(false);
  });

  it("poner la lente con 300 escenas < 100 ms", () => {
    const m = new Modelo(generarPruebaGrande());
    expect(m.eventos.size).toBeGreaterThanOrEqual(300);
    const t0 = performance.now();
    const p = personajesDeSerie(m, null);
    const [k, pj] = [...p][0];
    relacion(m, alias(null), { tipo: "personaje", clave: k, nombre: pj.nombre });
    relacion(m, alias(null), { tipo: "arco", id: [...m.arcos.keys()][0] });
    expect(performance.now() - t0).toBeLessThan(100);
  });

  it("fueraDeLente: escenas, episodios y temporadas sin nada relacionado (T13)", () => {
    const b = new Constructor();
    const t1 = b.temporada({}, 2);
    const t2 = b.temporada({}, 1);
    const t3 = b.temporada({}, 1);
    const a = b.evento({ titulo: "A", episodio: t1.eps[0], personajes: ["[[Telmo]]"] });
    const z = b.evento({ titulo: "Z", episodio: t1.eps[1] });
    b.evento({ titulo: "Suelta", temporada: t3.id, personajes: ["[[Telmo]]"] });
    const m = b.modelo();
    const rel = relacion(m, alias(null), { tipo: "personaje", clave: clavePersonaje(alias(null), "Telmo"), nombre: "Telmo" });
    expect(fueraDeLente(m, rel, "evento", a)).toBe(false);
    expect(fueraDeLente(m, rel, "evento", z)).toBe(true);
    expect(fueraDeLente(m, rel, "episodio", t1.eps[0])).toBe(false);
    expect(fueraDeLente(m, rel, "episodio", t1.eps[1])).toBe(true);
    expect(fueraDeLente(m, rel, "temporada", t1.id)).toBe(false);
    expect(fueraDeLente(m, rel, "temporada", t2.id)).toBe(true);
    // Solo una escena de la bandeja: la temporada no se atenúa
    expect(fueraDeLente(m, rel, "temporada", t3.id)).toBe(false);
  });
});
