import { describe, expect, it } from "vitest";
import { datosLugares, datosPersonajes, datosSerie, ordenar } from "../src/lib/desglose/datos";
import type { FilaDesglose, PersonajeFila } from "../src/lib/desglose/desglose";

// Spec 014, T3: datos por personaje, por lugar y de la serie.

const p = (nombre: string, habla = 0, ficha = true): PersonajeFila => ({ clave: nombre.toLowerCase(), nombre, ficha, habla });

let n = 0;
function fila(o: Partial<FilaDesglose> & { personajes?: PersonajeFila[]; lugares?: string[] }): FilaDesglose {
  n++;
  const { lugares, ...resto } = o;
  return {
    id: `ev-${n}`,
    codigo: `T01E01-S${String(n).padStart(2, "0")}`,
    titulo: `Escena ${n}`,
    temporada: "t1",
    episodio: "e1",
    codigoEpisodio: "T01E01",
    estado: "borrador",
    conGuion: true,
    segundos: 60,
    locaciones: (lugares ?? []).map((l) => ({ clave: l.toLowerCase(), nombre: l, ficha: true })),
    origenLocaciones: "guion",
    ie: null,
    momento: null,
    personajes: [],
    origenPersonajes: "guion",
    ...resto,
  };
}

describe("datos por personaje (RF-9)", () => {
  const filas = [
    fila({ codigo: "T01E01-S01", episodio: "e1", segundos: 120, personajes: [p("Telmo", 30), p("Sabela", 20)] }),
    fila({ codigo: "T01E01-S02", episodio: "e1", segundos: 60, personajes: [p("Telmo", 10)] }),
    fila({ codigo: "T01E02-S01", episodio: "e2", segundos: null, conGuion: false, personajes: [p("Telmo"), p("Sabela"), p("Vera")] }),
    fila({ codigo: "T01E02-S02", episodio: "e2", segundos: 180, personajes: [p("Sabela", 50), p("Vera", 5, false)] }),
  ];
  const d = datosPersonajes(filas);
  const telmo = d.find((x) => x.nombre === "Telmo")!;
  const sabela = d.find((x) => x.nombre === "Sabela")!;

  it("escenas con o sin guion, episodios, minutos solo de escenas con guion y su porcentaje", () => {
    expect(telmo).toMatchObject({ escenas: 3, episodios: 2, presencia: 180, habla: 40 });
    // total con guion: 120 + 60 + 180 = 360 s
    expect(telmo.pctPresencia).toBeCloseTo(50, 5);
    expect(telmo.pctHabla).toBeCloseTo((40 / 360) * 100, 5);
    expect(sabela).toMatchObject({ escenas: 3, presencia: 300, habla: 70 });
  });

  it("primera y última aparición, y escenas en las que está solo", () => {
    expect(telmo).toMatchObject({ primera: "T01E01-S01", ultima: "T01E02-S01", solo: 1 });
    expect(sabela).toMatchObject({ primera: "T01E01-S01", ultima: "T01E02-S02", solo: 0 });
  });

  it("con quién más coincide: por escenas en común y, a igualdad, alfabético", () => {
    expect(telmo.coincide).toEqual([
      { nombre: "Sabela", escenas: 2 },
      { nombre: "Vera", escenas: 1 },
    ]);
    expect(sabela.coincide[0]).toEqual({ nombre: "Telmo", escenas: 2 });
    expect(sabela.coincide[1]).toEqual({ nombre: "Vera", escenas: 2 });
  });

  it("como mucho cinco coincidencias", () => {
    const todos = ["A", "B", "C", "D", "E", "F", "G"].map((x) => p(x));
    const r = datosPersonajes([fila({ personajes: [p("Telmo"), ...todos] })]);
    expect(r.find((x) => x.nombre === "Telmo")!.coincide.map((c) => c.nombre)).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("sin minutos en las filas, los porcentajes son 0 y no hay división por cero", () => {
    const r = datosPersonajes([fila({ segundos: null, conGuion: false, personajes: [p("Telmo")] })]);
    expect(r[0]).toMatchObject({ presencia: 0, pctPresencia: 0, pctHabla: 0 });
  });

  it("sin filas no hay datos", () => {
    expect(datosPersonajes([])).toEqual([]);
  });
});

describe("datos por lugar (RF-10)", () => {
  it("escenas, minutos, porcentaje, interior/exterior y momento más habituales y personajes", () => {
    const filas = [
      fila({ lugares: ["Casa"], ie: "INT", momento: "noche", segundos: 120, personajes: [p("Telmo")] }),
      fila({ lugares: ["Casa"], ie: "INT", momento: "día", segundos: 60, personajes: [p("Sabela")] }),
      fila({ lugares: ["Casa", "Lonja"], ie: "EXT", momento: "noche", segundos: 60, personajes: [p("Telmo")] }),
      fila({ lugares: [], segundos: 60 }),
    ];
    const d = datosLugares(filas);
    const casa = d.find((x) => x.nombre === "Casa")!;
    expect(casa).toMatchObject({ escenas: 3, segundos: 240, ie: "INT", momento: "noche", personajes: ["Sabela", "Telmo"] });
    expect(casa.pct).toBeCloseTo((240 / 300) * 100, 5);
    expect(d.find((x) => x.nombre === "Lonja")).toMatchObject({ escenas: 1, ie: "EXT" });
    expect(d[0]!.nombre).toBe("Casa");
  });

  it("un lugar sin interior/exterior ni momento los deja en null", () => {
    const d = datosLugares([fila({ lugares: ["Plaza"] })]);
    expect(d[0]).toMatchObject({ ie: null, momento: null });
  });
});

describe("datos de la serie o del filtro (RF-11, RF-13)", () => {
  it("minutos, escenas con y sin guion, lugares y personajes de una sola escena, hablan sin ficha", () => {
    const filas = [
      fila({ lugares: ["Casa"], segundos: 120, personajes: [p("Telmo", 10), p("Don Ramón", 5, false)] }),
      fila({ lugares: ["Casa", "Plaza"], segundos: 60, personajes: [p("Telmo", 10)] }),
      fila({ lugares: ["Puerto"], segundos: null, conGuion: false, personajes: [p("Figurante", 0, false)] }),
    ];
    const d = datosSerie(filas);
    expect(d).toMatchObject({ segundos: 180, escenas: 3, conGuion: 2, sinGuion: 1 });
    expect(d.lugaresUnaEscena).toEqual(["Plaza", "Puerto"]);
    expect(d.personajesUnaEscena).toEqual(["Don Ramón", "Figurante"]);
    // Figurante no habla (viene de la ficha de la escena): no cuenta
    expect(d.hablanSinFicha).toEqual(["Don Ramón"]);
  });
});

describe("orden por columna (RF-14)", () => {
  const filas = [
    { nombre: "Vera", n: 2 },
    { nombre: "Sabela", n: 5 },
    { nombre: "Telmo", n: 5 },
  ];
  it("descendente (true) y ascendente (false), con el nombre como desempate", () => {
    expect(ordenar(filas, (x) => x.n, true).map((x) => x.nombre)).toEqual(["Sabela", "Telmo", "Vera"]);
    expect(ordenar(filas, (x) => x.n, false).map((x) => x.nombre)).toEqual(["Vera", "Sabela", "Telmo"]);
    expect(ordenar(filas, (x) => x.nombre, true).map((x) => x.nombre)).toEqual(["Vera", "Telmo", "Sabela"]);
  });
  it("no cambia la lista original", () => {
    const antes = filas.map((x) => x.nombre);
    ordenar(filas, (x) => x.n, true);
    expect(filas.map((x) => x.nombre)).toEqual(antes);
  });
});
