import { describe, expect, it } from "vitest";
import { crearPieza } from "../src/lib/modelo/ficheros";
import { Modelo } from "../src/lib/modelo/modelo";
import type { Evento } from "../src/lib/modelo/tipos";
import { cadenas, circulos, filasProvoca, filasVieneDe, indiceCausas, marca, posiciones } from "../src/lib/vistas/causas";

// Serie de dos temporadas: T01 con E01 y E02, T02 con E01
function modelo(eventos: Evento[]): Modelo {
  return new Modelo({
    serie: crearPieza("serie", { id: "se-1", temporadas: ["te-1", "te-2"] }),
    puntos: [],
    temporadas: [crearPieza("temporada", { id: "te-1", episodios: ["ep-1", "ep-2"] }), crearPieza("temporada", { id: "te-2", episodios: ["ep-3"] })],
    episodios: [
      crearPieza("episodio", { id: "ep-1", temporada: "te-1" }),
      crearPieza("episodio", { id: "ep-2", temporada: "te-1" }),
      crearPieza("episodio", { id: "ep-3", temporada: "te-2" }),
    ],
    arcos: [],
    eventos,
    secretos: [],
  });
}

type Datos = Partial<Evento> & { viene?: unknown };
function ev(id: string, d: Datos = {}): Evento {
  const { viene, ...resto } = d;
  return crearPieza("evento", { id, titulo: id, temporada: "te-1", ...resto, extra: viene === undefined ? {} : { viene_de: viene } });
}

const ids = (l: { id: string | null }[]) => l.map((f) => f.id);
const marcasDe = (l: { id: string | null; marcas: string[] }[], id: string) => l.find((f) => f.id === id)?.marcas;

describe("Causa y efecto (spec 011, T3)", () => {
  it("Provoca en orden de emisión", () => {
    const m = modelo([
      ev("ev-a", { episodio: "ep-1", orden: 1 }),
      ev("ev-c", { episodio: "ep-3", orden: 1, temporada: "te-2", viene: ["ev-a"] }),
      ev("ev-b", { episodio: "ep-2", orden: 1, viene: ["ev-a"] }),
      ev("ev-d", { episodio: "ep-1", orden: 2, viene: ["ev-a"] }),
    ]);
    expect(ids(filasProvoca(m, m.eventos.get("ev-a")!))).toEqual(["ev-d", "ev-b", "ev-c"]);
    expect(filasProvoca(m, m.eventos.get("ev-a")!)[0]).toMatchObject({ titulo: "ev-d", donde: "T01E01 · 2", marcas: [] });
  });

  it("tardía en el mismo episodio y entre temporadas", () => {
    const m = modelo([
      ev("ev-a", { episodio: "ep-1", orden: 1, viene: ["ev-b", "ev-c"] }),
      ev("ev-b", { episodio: "ep-1", orden: 2 }),
      ev("ev-c", { episodio: "ep-3", orden: 1, temporada: "te-2" }),
    ]);
    const a = m.eventos.get("ev-a")!;
    expect(filasVieneDe(m, a).map((f) => [f.id, f.marcas])).toEqual([
      ["ev-b", ["se ve después"]],
      ["ev-c", ["se ve después"]],
    ]);
    expect(marcasDe(filasProvoca(m, m.eventos.get("ev-c")!), "ev-a")).toEqual(["se ve antes"]);
  });

  it("orden repetido en disco: la marca sigue a dónde se emite", () => {
    // Las dos con orden 1: se emite primero ev-a (desempate por id)
    const m = modelo([ev("ev-a", { episodio: "ep-1", orden: 1 }), ev("ev-b", { episodio: "ep-1", orden: 1, viene: ["ev-a"] })]);
    const pos = posiciones(m);
    expect(marca(pos, "ev-a", "ev-b")).toBe(null);
    expect(marca(pos, "ev-b", "ev-a")).toBe("tardia");
    expect(filasVieneDe(m, m.eventos.get("ev-b")!)[0].donde).toBe("T01E01 · 1");
  });

  it("bandeja y Sin temporada: sin sitio", () => {
    const m = modelo([
      ev("ev-a", { episodio: "ep-2", orden: 1, viene: ["ev-b", "ev-c"] }),
      ev("ev-b", { orden: 1 }),
      ev("ev-c", { temporada: "" }),
    ]);
    const f = filasVieneDe(m, m.eventos.get("ev-a")!);
    expect(f.map((x) => [x.id, x.donde, x.marcas])).toEqual([
      ["ev-b", "Bandeja T01", ["sin sitio todavía"]],
      ["ev-c", "Sin temporada", ["sin sitio todavía"]],
    ]);
    // Si el efecto tampoco está colocado, no hay marca
    expect(marca(posiciones(m), "ev-c", "ev-b")).toBe(null);
  });

  it("aparcada anterior no es tardía", () => {
    const m = modelo([
      ev("ev-a", { episodio: "ep-1", orden: 1, madurez: "idea", madurez_mesa: "aparcado" }),
      ev("ev-b", { episodio: "ep-2", orden: 1, viene: ["ev-a"] }),
    ]);
    expect(filasVieneDe(m, m.eventos.get("ev-b")!)[0].marcas).toEqual(["(aparcada)"]);
    expect(filasProvoca(m, m.eventos.get("ev-a")!)[0].marcas).toEqual([]);
  });

  it("causa descartada o que ya no está en Viene de, con su estado", () => {
    const m = modelo([
      ev("ev-a", { episodio: "ep-1", orden: 1, madurez: "descartado" }),
      ev("ev-b", { episodio: "ep-2", orden: 1, viene: ["ev-zzzz", "ev-a", "[[T01E01]]", 5] }),
    ]);
    const f = filasVieneDe(m, m.eventos.get("ev-b")!);
    expect(f.map((x) => [x.id, x.titulo, x.marcas])).toEqual([
      ["ev-a", "ev-a", ["(descartada)"]],
      [null, "ev-zzzz", ["(ya no está)"]],
      [null, "[[T01E01]]", ["(no se entiende)"]],
      [null, "5", ["(no se entiende)"]],
    ]);
    // Cada una se puede quitar por su entrada
    expect(f.map((x) => x.entrada?.i)).toEqual([1, 0, 2, 3]);
  });

  it("efecto descartado en Provoca, marcado", () => {
    const m = modelo([ev("ev-a", { episodio: "ep-1", orden: 1 }), ev("ev-b", { episodio: "ep-2", orden: 1, madurez: "descartado", viene: ["ev-a"] })]);
    expect(filasProvoca(m, m.eventos.get("ev-a")!).map((x) => [x.id, x.marcas])).toEqual([["ev-b", ["(descartada)"]]]);
  });

  it("círculo de 3 y de 2", () => {
    const m = modelo([
      ev("ev-a", { episodio: "ep-1", orden: 1, viene: ["ev-c"] }),
      ev("ev-b", { episodio: "ep-1", orden: 2, viene: ["ev-a"] }),
      ev("ev-c", { episodio: "ep-1", orden: 3, viene: ["ev-b"] }),
      ev("ev-d", { episodio: "ep-2", orden: 1, viene: ["ev-e", "ev-c"] }),
      ev("ev-e", { episodio: "ep-2", orden: 2, viene: ["ev-d"] }),
    ]);
    const r = circulos(m);
    expect([...r.keys()].sort()).toEqual(["ev-a", "ev-b", "ev-c", "ev-d", "ev-e"]);
    expect(r.get("ev-a")).toBe(r.get("ev-c"));
    expect(r.get("ev-d")).toBe(r.get("ev-e"));
    expect(r.get("ev-a")).not.toBe(r.get("ev-d"));
    // ev-c → ev-d une dos círculos, pero no es parte de ninguno
    expect(marcasDe(filasVieneDe(m, m.eventos.get("ev-d")!), "ev-c")).toEqual([]);
    expect(marcasDe(filasVieneDe(m, m.eventos.get("ev-d")!), "ev-e")).toEqual(["se ve después", "círculo"]);
    expect(marcasDe(filasProvoca(m, m.eventos.get("ev-b")!), "ev-c")).toEqual(["círculo"]);
  });

  it("solo enlaces a descartadas no es círculo", () => {
    const m = modelo([
      ev("ev-a", { episodio: "ep-1", orden: 1, viene: ["ev-b"] }),
      ev("ev-b", { episodio: "ep-1", orden: 2, viene: ["ev-a"], madurez: "descartado" }),
    ]);
    expect(circulos(m).size).toBe(0);
  });

  it("la autorreferencia no cuenta", () => {
    const m = modelo([ev("ev-a", { episodio: "ep-1", orden: 1, viene: ["ev-a"] })]);
    expect(circulos(m).size).toBe(0);
    expect(filasProvoca(m, m.eventos.get("ev-a")!)).toEqual([]);
    expect(filasVieneDe(m, m.eventos.get("ev-a")!)[0].marcas).toEqual(["(no se entiende)"]);
  });

  it("tras editar, el índice cambia (misma instancia de Modelo)", () => {
    const m = modelo([ev("ev-a", { episodio: "ep-1", orden: 1 }), ev("ev-b", { episodio: "ep-1", orden: 2 })]);
    expect(indiceCausas(m).provoca.get("ev-a")).toBeUndefined();
    expect(indiceCausas(m)).toBe(indiceCausas(m));
    m.poner(ev("ev-b", { episodio: "ep-1", orden: 2, viene: ["ev-a"] }));
    expect(indiceCausas(m).provoca.get("ev-a")).toEqual(["ev-b"]);
  });
});

// Una cadena como texto: «  ev-b [ver arriba] (círculo) viene ev-x T02E01 · 1»
function texto(m: Modelo, t: string) {
  const r = cadenas(m, t);
  return {
    cadenas: r.cadenas.map((l) =>
      l.map((n) =>
        [
          "  ".repeat(n.nivel) + n.id,
          n.verArriba ? "[ver arriba]" : "",
          ...n.marcas.map((x) => `(${x})`),
          ...n.fuera.map((f) => `${f.sentido} ${f.id} ${f.donde}${f.marcas.map((x) => ` (${x})`).join("")}`),
        ]
          .filter(Boolean)
          .join(" "),
      ),
    ),
    sueltas: r.sueltas,
  };
}

describe("Cadenas de la temporada (spec 011, T4)", () => {
  it("inicio que solo viene de otra temporada", () => {
    const m = modelo([ev("ev-a", { episodio: "ep-1", orden: 1 }), ev("ev-b", { episodio: "ep-3", orden: 1, temporada: "te-2", viene: ["ev-a"] })]);
    expect(texto(m, "te-2")).toEqual({ cadenas: [["ev-b viene ev-a T01E01 · 1"]], sueltas: [] });
    expect(texto(m, "te-1")).toEqual({ cadenas: [["ev-a provoca ev-b T02E01 · 1"]], sueltas: [] });
  });

  it("escena que solo provoca hacia fuera tiene su cadena (RF-19b)", () => {
    const m = modelo([ev("ev-a", { episodio: "ep-1", orden: 1 }), ev("ev-b", { orden: 1, viene: ["ev-a"] })]);
    expect(texto(m, "te-1")).toEqual({ cadenas: [["ev-a provoca ev-b Bandeja T01"]], sueltas: [] });
  });

  it("A → B aparcada → C", () => {
    const m = modelo([
      ev("ev-a", { episodio: "ep-1", orden: 1 }),
      ev("ev-b", { episodio: "ep-1", orden: 2, viene: ["ev-a"], madurez: "idea", madurez_mesa: "aparcado" }),
      ev("ev-c", { episodio: "ep-2", orden: 1, viene: ["ev-b"] }),
    ]);
    expect(texto(m, "te-1")).toEqual({
      // ev-c es inicio (RF-16); ev-a solo provoca hacia fuera (RF-19b), detrás
      cadenas: [["ev-c viene ev-b T01E01 · 2 (aparcada)"], ["ev-a provoca ev-b T01E01 · 2 (aparcada)"]],
      sueltas: [],
    });
  });

  it("círculo sin inicio, tras los demás inicios", () => {
    const m = modelo([
      ev("ev-a", { episodio: "ep-1", orden: 1, viene: ["ev-c"] }),
      ev("ev-b", { episodio: "ep-1", orden: 2, viene: ["ev-a"] }),
      ev("ev-c", { episodio: "ep-1", orden: 3, viene: ["ev-b"] }),
      ev("ev-x", { episodio: "ep-2", orden: 1 }),
      ev("ev-y", { episodio: "ep-2", orden: 2, viene: ["ev-x"] }),
    ]);
    expect(texto(m, "te-1").cadenas).toEqual([
      ["ev-x", "  ev-y"],
      ["ev-a (círculo)", "  ev-b (círculo)", "    ev-c (círculo)", "      ev-a [ver arriba] (círculo) (se ve antes)"],
    ]);
  });

  it("círculo con una causa de fuera (RF-19b)", () => {
    const m = modelo([
      ev("ev-z", { episodio: "ep-3", orden: 1, temporada: "te-2" }),
      ev("ev-a", { episodio: "ep-1", orden: 1, viene: ["ev-b"] }),
      ev("ev-b", { episodio: "ep-1", orden: 2, viene: ["ev-a", "ev-z"] }),
    ]);
    expect(texto(m, "te-1").cadenas).toEqual([
      ["ev-a (círculo)", "  ev-b (círculo) viene ev-z T02E01 · 1 (se ve después)", "    ev-a [ver arriba] (círculo) (se ve antes)"],
    ]);
  });

  it("«ver arriba» la segunda vez", () => {
    const m = modelo([
      ev("ev-a", { episodio: "ep-1", orden: 1 }),
      ev("ev-b", { episodio: "ep-1", orden: 2, viene: ["ev-a"] }),
      ev("ev-c", { episodio: "ep-1", orden: 3, viene: ["ev-a", "ev-b"] }),
    ]);
    expect(texto(m, "te-1").cadenas).toEqual([["ev-a", "  ev-b", "    ev-c", "  ev-c [ver arriba]"]]);
  });

  it("enlaces de fuera con su marca", () => {
    const m = modelo([
      ev("ev-a", { episodio: "ep-1", orden: 1, viene: ["ev-t", "ev-s"] }),
      ev("ev-t", { episodio: "ep-3", orden: 1, temporada: "te-2" }),
      ev("ev-s", { orden: 1 }),
      ev("ev-p", { episodio: "ep-3", orden: 2, temporada: "te-2", viene: ["ev-a"] }),
    ]);
    expect(texto(m, "te-1").cadenas).toEqual([
      ["ev-a viene ev-s Bandeja T01 (sin sitio todavía) viene ev-t T02E01 · 1 (se ve después) provoca ev-p T02E01 · 2"],
    ]);
  });

  it("sueltas con solo enlaces descartados o que ya no están", () => {
    const m = modelo([
      ev("ev-a", { episodio: "ep-1", orden: 1, viene: ["ev-d", "ev-zzzz"] }),
      ev("ev-d", { episodio: "ep-1", orden: 2, madurez: "descartado" }),
      ev("ev-b", { episodio: "ep-2", orden: 1 }),
      ev("ev-q", { episodio: "ep-1", orden: 3, madurez: "descartado", viene: ["ev-b"] }),
    ]);
    expect(texto(m, "te-1")).toEqual({ cadenas: [], sueltas: ["ev-a", "ev-b"] });
  });

  it("orden de inicios y de hijos, y toda escena sale una vez entera", () => {
    const m = modelo([
      ev("ev-f", { episodio: "ep-2", orden: 1 }),
      ev("ev-g", { episodio: "ep-2", orden: 3, viene: ["ev-f"] }),
      ev("ev-h", { episodio: "ep-2", orden: 2, viene: ["ev-f"] }),
      ev("ev-a", { episodio: "ep-1", orden: 1 }),
      ev("ev-b", { episodio: "ep-1", orden: 2, viene: ["ev-a"] }),
      ev("ev-s", { episodio: "ep-1", orden: 3 }),
      ev("ev-n", { orden: 1, viene: ["ev-s"] }),
    ]);
    const r = cadenas(m, "te-1");
    expect(texto(m, "te-1").cadenas).toEqual([["ev-a", "  ev-b"], ["ev-f", "  ev-h", "  ev-g"], ["ev-s provoca ev-n Bandeja T01"]]);
    const enteras = r.cadenas.flat().filter((n) => !n.verArriba).map((n) => n.id);
    expect([...enteras, ...r.sueltas].sort()).toEqual(["ev-a", "ev-b", "ev-f", "ev-g", "ev-h", "ev-s"]);
  });

  it("300 escenas y 600 causas en menos de 200 ms", () => {
    const eventos: Evento[] = [];
    for (let i = 0; i < 300; i++) {
      const viene = i ? [`ev-${(i * 7) % i}`, `ev-${(i * 13 + 5) % 300}`] : [];
      eventos.push(ev(`ev-${i}`, { episodio: ["ep-1", "ep-2", "ep-3"][i % 3], temporada: i % 3 === 2 ? "te-2" : "te-1", orden: i, viene }));
    }
    const m = modelo(eventos);
    const t0 = performance.now();
    indiceCausas(m);
    cadenas(m, "te-1");
    cadenas(m, "te-2");
    expect(performance.now() - t0).toBeLessThan(200);
  });
});
