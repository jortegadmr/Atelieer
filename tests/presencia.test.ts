import { describe, expect, it } from "vitest";
import type { Ficha } from "../src/lib/wiki/fichas";
import type { FuentePersonajes } from "../src/lib/vistas/lente";
import { enAusencia, presencia } from "../src/lib/vistas/presencia";
import { Constructor } from "./fixtures/constructor";

// Presencia (spec 010, RF-17 a RF-21, T8)

function wiki(...fichas: string[][]): FuentePersonajes {
  const l = fichas.map(([nombre, ...aliases]) => ({ nombre, aliases, tipo: "personaje", ruta: `P/${nombre}.md`, resumen: "", detalle: "" }) as unknown as Ficha);
  return { de: (t) => (t === "personaje" ? l : []) };
}

describe("presencia (spec 010, T8)", () => {
  it("cuenta escenas vivas, no bandeja ni aparcadas", () => {
    const b = new Constructor();
    const t = b.temporada({}, 2);
    const [e1, e2] = t.eps;
    b.evento({ episodio: e1, personajes: ["[[Telmo]]"] });
    b.evento({ episodio: e1, personajes: ["Telmo", "[[Telmo]]"] });
    b.evento({ episodio: e2, personajes: ["[[Telmo]]"], madurez_mesa: "aparcado" });
    b.evento({ episodio: e2, personajes: ["[[Telmo]]"], madurez: "descartado" });
    b.evento({ temporada: t.id, personajes: ["[[Telmo]]", "[[Ana]]"] });
    const p = presencia(b.modelo(), null, t.id);
    expect(p.filas.map((f) => f.nombre)).toEqual(["Telmo"]);
    expect(p.filas[0].casillas).toEqual([2, 0]);
    expect(p.filas[0].escenas).toBe(2);
    expect(p.filas[0].episodiosCon).toBe(1);
  });

  it("alias en la misma fila", () => {
    const b = new Constructor();
    const t = b.temporada({}, 2);
    b.evento({ episodio: t.eps[0], personajes: ["[[Telmo]]"] });
    b.evento({ episodio: t.eps[1], personajes: ["el Técnico"] });
    const p = presencia(b.modelo(), wiki(["Telmo", "el Técnico"]), t.id);
    expect(p.filas).toHaveLength(1);
    expect(p.filas[0]).toMatchObject({ nombre: "Telmo", casillas: [1, 1], escenas: 2, episodiosCon: 2 });
  });

  it("orden por total y nombre", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const e = t.eps[0];
    b.evento({ episodio: e, personajes: ["[[Zoe]]", "[[Nando]]", "[[Ana]]"] });
    b.evento({ episodio: e, personajes: ["[[Zoe]]"] });
    expect(presencia(b.modelo(), null, t.id).filas.map((f) => f.nombre)).toEqual(["Zoe", "Ana", "Nando"]);
  });

  it("primer y último de 6: ausencia de 4", () => {
    const b = new Constructor();
    const t = b.temporada({}, 6);
    b.evento({ episodio: t.eps[0], personajes: ["[[Telmo]]"] });
    b.evento({ episodio: t.eps[5], personajes: ["[[Telmo]]"] });
    for (const e of t.eps.slice(1, 5)) b.evento({ episodio: e, personajes: ["[[Ana]]"] });
    const p = presencia(b.modelo(), null, t.id);
    const telmo = p.filas.find((f) => f.nombre === "Telmo")!;
    expect(telmo.ausencias).toEqual([{ desde: 1, hasta: 4, n: 4 }]);
    expect(enAusencia(p, telmo, 2)?.n).toBe(4);
    expect(enAusencia(p, telmo, 0)).toBeUndefined();
    // Dos huecos no son ausencia larga; antes de la primera aparición tampoco
    expect(p.filas.find((f) => f.nombre === "Ana")!.ausencias).toEqual([]);
  });

  it("episodios sin escenas no cuentan ni cortan", () => {
    const b = new Constructor();
    const t = b.temporada({}, 7);
    const [e1, e2, , e4, e5, , e7] = t.eps;
    b.evento({ episodio: e1, personajes: ["[[Telmo]]"] });
    for (const e of [e2, e4, e5]) b.evento({ episodio: e, personajes: ["[[Ana]]"] });
    b.evento({ episodio: e7, personajes: ["[[Telmo]]"] });
    const p = presencia(b.modelo(), null, t.id);
    expect(p.activos).toEqual([true, true, false, true, true, false, true]);
    const telmo = p.filas.find((f) => f.nombre === "Telmo")!;
    expect(telmo.ausencias).toEqual([{ desde: 1, hasta: 4, n: 3 }]);
    expect(enAusencia(p, telmo, 2)).toBeUndefined();
    expect(enAusencia(p, telmo, 3)?.n).toBe(3);
  });

  it("un solo episodio, sin ausencias", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    b.evento({ episodio: t.eps[0], personajes: ["[[Telmo]]"] });
    const p = presencia(b.modelo(), null, t.id);
    expect(p.filas[0].ausencias).toEqual([]);
    // Sin personajes: ninguna fila (RF-25)
    const v = new Constructor();
    const tv = v.temporada({}, 1);
    v.evento({ episodio: tv.eps[0] });
    expect(presencia(v.modelo(), null, tv.id).filas).toEqual([]);
  });
});
