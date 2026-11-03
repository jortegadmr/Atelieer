import { describe, expect, it } from "vitest";
import { escribirPieza } from "../src/lib/modelo/ficheros";
import type { Modelo } from "../src/lib/modelo/modelo";
import { crearEvento } from "../src/lib/modelo/operaciones";
import type { Evento, Pieza } from "../src/lib/modelo/tipos";
import { actosDe, anuncio, colocarEscena, crearEscena, curva, ORDEN_ACTOS, pasoTeclado, puestoAlSoltar } from "../src/lib/vistas/actos";
import { bandejaVisor, columnasActos } from "../src/lib/vistas/visor";
import { leidoPorV1 } from "./compat/uso-v1";
import { Constructor } from "./fixtures/constructor";

// Spec 003: el episodio por actos (RF-4 a RF-6, RF-17, RF-19, RF-31, RF-37, RF-38).

function aplicar(m: Modelo, cambio: { guardar: Pieza[]; borrar: { id: string }[] }) {
  for (const p of cambio.borrar) m.quitar(p.id);
  for (const p of cambio.guardar) m.poner(p);
}

/** Un episodio con escenas [id, acto] en ese orden (orden 1, 2, 3…) */
function conEscenas(escenas: [string, Evento["acto"]][], datos: Partial<Omit<Evento, "arcos">>[] = []) {
  const k = new Constructor();
  const { id: t, eps } = k.temporada({}, 2);
  escenas.forEach(([id, acto], i) => k.evento({ id, acto, episodio: eps[0], ...datos[i] }));
  return { m: k.modelo(), t, ep: eps[0], otro: eps[1], k };
}

const ids = (l: Evento[]) => l.map((e) => e.id);
const fila = (m: Modelo, ep: string) =>
  [...m.eventos.values()].filter((e) => e.episodio === ep).sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id));
const resumen = (m: Modelo, ep: string) => fila(m, ep).map((e) => `${e.id}:${e.acto || "-"}:${e.orden}`);

describe("cada escena en su acto (RF-4)", () => {
  it("el orden de los actos es Teaser, Inicio, Desarrollo, Desenlace y Sin acto", () => {
    expect(ORDEN_ACTOS).toEqual(["teaser", "1", "2", "3", ""]);
  });

  it("cada escena en su acto en el orden del episodio; acto desconocido en Sin acto", () => {
    const { m, ep } = conEscenas([
      ["a", "2"],
      ["b", "teaser"],
      ["c", ""],
      ["d", "2"],
    ]);
    m.eventos.get("c")!.crudos = { acto: "prólogo" };
    const g = actosDe(m, ep);
    expect(Object.keys(g).sort()).toEqual(["", "1", "2", "3", "teaser"]);
    expect(ids(g.teaser)).toEqual(["b"]);
    expect(ids(g["1"])).toEqual([]);
    expect(ids(g["2"])).toEqual(["a", "d"]);
    expect(ids(g[""])).toEqual(["c"]);
  });
});

describe("colocar una escena (RF-5, RF-17)", () => {
  it("mover en el mismo acto", () => {
    const { m, ep } = conEscenas([
      ["a", "1"],
      ["b", "1"],
      ["c", "1"],
    ]);
    aplicar(m, colocarEscena(m, "c", ep, "1", 0));
    expect(resumen(m, ep)).toEqual(["c:1:1", "a:1:2", "b:1:3"]);
  });

  it("mover a otro acto (al final por defecto, o en su puesto)", () => {
    const { m, ep } = conEscenas([
      ["a", "1"],
      ["b", "2"],
      ["c", "2"],
    ]);
    aplicar(m, colocarEscena(m, "a", ep, "2"));
    expect(resumen(m, ep)).toEqual(["b:2:1", "c:2:2", "a:2:3"]);
    aplicar(m, colocarEscena(m, "a", ep, "teaser", 5));
    expect(resumen(m, ep)).toEqual(["a:teaser:1", "b:2:2", "c:2:3"]);
    aplicar(m, colocarEscena(m, "a", ep, "2", 1));
    expect(resumen(m, ep)).toEqual(["b:2:1", "a:2:2", "c:2:3"]);
  });

  it("mover a Sin acto: va al final del episodio", () => {
    const { m, ep } = conEscenas([
      ["a", "1"],
      ["b", "3"],
    ]);
    aplicar(m, colocarEscena(m, "a", ep, ""));
    expect(resumen(m, ep)).toEqual(["b:3:1", "a:-:2"]);
  });

  it("orden cruzado: al mover queda por actos, cada acto con su orden", () => {
    // La 1.ª en Desenlace y la 2.ª en Inicio (editado en la v1 o en Obsidian)
    const { m, ep } = conEscenas([
      ["a", "3"],
      ["b", "1"],
      ["c", "3"],
      ["d", "1"],
    ]);
    aplicar(m, colocarEscena(m, "d", ep, "2"));
    expect(resumen(m, ep)).toEqual(["b:1:1", "d:2:2", "a:3:3", "c:3:4"]);
  });

  it("números repetidos o 0: 1, 2, 3…", () => {
    const { m, ep } = conEscenas(
      [
        ["a", "1"],
        ["b", "1"],
        ["c", "1"],
        ["d", "2"],
      ],
      [{ orden: 0 }, { orden: 2 }, { orden: 2 }, { orden: 0 }],
    );
    aplicar(m, colocarEscena(m, "c", ep, "2"));
    expect(fila(m, ep).map((e) => e.orden)).toEqual([1, 2, 3, 4]);
    expect(new Set(fila(m, ep).map((e) => e.orden)).size).toBe(4);
  });

  it("en su sitio: nada que guardar (también con el orden cruzado)", () => {
    const { m, ep } = conEscenas([
      ["a", "3"],
      ["b", "1"],
      ["c", "1"],
    ]);
    expect(colocarEscena(m, "b", ep, "1", 0).guardar).toEqual([]);
    expect(colocarEscena(m, "c", ep, "1").guardar).toEqual([]);
    expect(colocarEscena(m, "a", ep, "3", 0).guardar).toEqual([]);
    expect(colocarEscena(m, "no-existe", ep, "3").guardar).toEqual([]);
    expect(colocarEscena(m, "a", "ep-no-existe", "3").guardar).toEqual([]);
  });

  it("solo se guardan las que cambian, y es un movimiento", () => {
    const { m, ep } = conEscenas([
      ["a", "teaser"],
      ["b", "1"],
      ["c", "2"],
      ["d", "3"],
    ]);
    const cambio = colocarEscena(m, "d", ep, "2", 0);
    expect(cambio.guardar.map((p) => p.id).sort()).toEqual(["c", "d"]);
    expect(cambio.mueve).toBe("d");
    expect(cambio.borrar).toEqual([]);
  });

  it("no toca nada más de la escena (crudos, arcos, texto)", () => {
    const { m, ep } = conEscenas([
      ["a", "1"],
      ["b", ""],
    ]);
    m.eventos.get("b")!.crudos = { acto: "prólogo" };
    const antes = structuredClone(m.eventos.get("b")!);
    const cambio = colocarEscena(m, "a", ep, "");
    const b = cambio.guardar.find((p) => p.id === "b") as Evento;
    expect({ ...b, orden: 0 }).toEqual({ ...antes, orden: 0 });
    expect(escribirPieza(b)).toContain("acto: prólogo");
  });

  it("de otro episodio: entra con el episodio y la temporada; el de origen no se renumera", () => {
    const k = new Constructor();
    const { eps: e1 } = k.temporada({}, 1);
    const { id: t2, eps: e2 } = k.temporada({}, 1);
    k.evento({ id: "x", acto: "1", episodio: e1[0] });
    k.evento({ id: "y", acto: "1", episodio: e1[0] });
    k.evento({ id: "z", acto: "2", episodio: e2[0] });
    const m = k.modelo();
    aplicar(m, colocarEscena(m, "x", e2[0], "1"));
    expect(m.eventos.get("x")).toMatchObject({ episodio: e2[0], temporada: t2, acto: "1", orden: 1 });
    expect(m.eventos.get("z")!.orden).toBe(2);
    expect(m.eventos.get("y")!.orden).toBe(2);
  });

  it("de la bandeja a un episodio: al final de su acto, con la temporada del episodio", () => {
    const k = new Constructor();
    const { id: t1 } = k.temporada({}, 0);
    const { id: t2, eps } = k.temporada({}, 1);
    k.evento({ id: "a", acto: "2", episodio: eps[0] });
    k.evento({ id: "b", acto: "3", episodio: eps[0] });
    k.evento({ id: "idea", acto: "2", temporada: t1 });
    const m = k.modelo();
    aplicar(m, colocarEscena(m, "idea", eps[0], m.eventos.get("idea")!.acto));
    expect(resumen(m, eps[0])).toEqual(["a:2:1", "idea:2:2", "b:3:3"]);
    expect(m.eventos.get("idea")!.temporada).toBe(t2);
  });
});

describe("crear escenas (RF-37, RF-38)", () => {
  it("crear en un acto: al final de ese acto, en estado idea", () => {
    const { m, ep, t } = conEscenas([
      ["a", "1"],
      ["b", "2"],
      ["c", "3"],
    ]);
    const { pieza, cambio } = crearEscena(m, ep, "2", { titulo: "Nueva" });
    expect(pieza).toMatchObject({ titulo: "Nueva", episodio: ep, temporada: t, acto: "2", orden: 3, madurez: "idea" });
    expect(cambio.guardar.map((p) => p.id).sort()).toEqual([pieza.id, "c"].sort());
    expect(cambio.mueve).toBeUndefined();
    aplicar(m, cambio);
    expect(resumen(m, ep)).toEqual(["a:1:1", "b:2:2", `${pieza.id}:2:3`, "c:3:4"]);
  });

  it("crear sin acto: al final del episodio, sin renumerar nada", () => {
    const { m, ep } = conEscenas([
      ["a", "1"],
      ["b", "3"],
    ]);
    const { pieza, cambio } = crearEscena(m, ep, "", {});
    expect(pieza.orden).toBe(3);
    expect(cambio.guardar.map((p) => p.id)).toEqual([pieza.id]);
  });

  it("la idea de Ctrl I no reordena (crearEvento, como en la 002)", () => {
    const { m, ep } = conEscenas([
      ["a", "3"],
      ["b", "1"],
    ]);
    const { pieza, cambio } = crearEvento(m, { titulo: "Idea", episodio: ep });
    expect(cambio.guardar).toEqual([pieza]);
    aplicar(m, cambio);
    expect(resumen(m, ep)).toEqual(["a:3:1", "b:1:2", `${pieza.id}:-:3`]);
    expect(ids(actosDe(m, ep)[""])).toEqual([pieza.id]);
  });
});

describe("compatibilidad con la v1.0", () => {
  it("la v1.0 lee lo movido y lo creado: acto, orden, episodio y temporada", () => {
    const { m, ep, otro, t } = conEscenas([
      ["a", "1"],
      ["b", "2"],
    ]);
    for (const p of colocarEscena(m, "b", ep, "teaser").guardar as Evento[]) {
      const v1 = leidoPorV1(escribirPieza(p), "evento");
      expect([v1.acto, v1.orden, v1.episodio, v1.temporada]).toEqual([p.acto, p.orden, p.episodio, p.temporada]);
    }
    const { pieza } = crearEscena(m, otro, "3", { titulo: "Nueva" });
    const v1 = leidoPorV1(escribirPieza(pieza), "evento");
    expect([v1.acto, v1.orden, v1.episodio, v1.temporada, v1.titulo]).toEqual(["3", 1, otro, t, "Nueva"]);
  });
});

describe("teclado, anuncio, columnas y curva (T4)", () => {
  const ep4 = () =>
    conEscenas([
      ["t", "teaser"],
      ["a", "1"],
      ["b", "2"],
      ["c", "2"],
      ["d", "3"],
      ["s", ""],
    ]);

  it("bordes del teclado (Teaser, Desenlace, Sin acto, primero y último)", () => {
    const { m, ep } = ep4();
    expect(pasoTeclado(m, "t", "izquierda")).toBeNull();
    expect(pasoTeclado(m, "d", "derecha")).toBeNull();
    expect(pasoTeclado(m, "s", "derecha")).toBeNull();
    expect(pasoTeclado(m, "s", "izquierda")).toEqual({ episodio: ep, acto: "3" });
    expect(pasoTeclado(m, "b", "arriba")).toBeNull();
    expect(pasoTeclado(m, "c", "abajo")).toBeNull();
    expect(pasoTeclado(m, "b", "abajo")).toEqual({ episodio: ep, acto: "2", puesto: 1 });
    expect(pasoTeclado(m, "a", "derecha")).toEqual({ episodio: ep, acto: "2" });
  });

  it("Escena 4 · Desarrollo, 2.ª", () => {
    const { m } = ep4();
    expect(anuncio(m, "c")).toBe("Escena 4 · Desarrollo, 2.ª");
    expect(anuncio(m, "s")).toBe("Escena 6 · Sin acto, 1.ª");
  });

  it("cuatro actos siempre y Sin acto solo si hace falta; cabecera con nombre y resumen", () => {
    const { m, ep } = conEscenas([["a", "2"]]);
    m.episodios.get(ep)!.actos.desarrollo = "Todo se tuerce";
    const cols = columnasActos(m, ep, []);
    expect(cols.map((x) => x.nombre)).toEqual(["Teaser", "Inicio", "Desarrollo", "Desenlace"]);
    expect(cols[2]).toMatchObject({ resumen: "Todo se tuerce", escenas: [{ id: "a", codigo: "S01" }] });
    expect(columnasActos(m, ep, [], true).at(-1)?.nombre).toBe("Sin acto");
  });

  it("empieza y acaba igual; tramos de la curva con huecos", () => {
    const { m, ep } = conEscenas(
      [
        ["a", "1"],
        ["b", "1"],
      ],
      [{ cambio: ["+", "+"] }, { cambio: ["", "-"] }],
    );
    expect(columnasActos(m, ep, [])[1].escenas.map((x) => x.igual)).toEqual([true, false]);
    expect(curva(fila(m, ep))).toEqual([
      { id: "a", numero: 1, desde: "+", hasta: "+", igual: true },
      { id: "b", numero: 2, desde: null, hasta: "-", igual: false },
    ]);
  });

  it("bandeja de la temporada con las de episodios que ya no existen", () => {
    const k = new Constructor();
    const { id: t } = k.temporada({}, 1);
    k.evento({ id: "suelta", temporada: t });
    k.evento({ id: "huerfana", temporada: t, episodio: "ep-borrado" });
    expect(bandejaVisor(k.modelo(), t, []).map((x) => x.id).sort()).toEqual(["huerfana", "suelta"]);
  });

  it("actos y mover con 40 escenas en menos de 100 ms", () => {
    const actos: Evento["acto"][] = ["teaser", "1", "2", "3", ""];
    const { m, ep } = conEscenas(Array.from({ length: 40 }, (_, i) => [`e${i}`, actos[i % 5]] as [string, Evento["acto"]]));
    const t0 = performance.now();
    columnasActos(m, ep, []);
    aplicar(m, colocarEscena(m, "e0", ep, "3", 2));
    columnasActos(m, ep, []);
    expect(performance.now() - t0).toBeLessThan(100);
  });
});

describe("arrastrar (T9)", () => {
  it("puestoAlSoltar: arriba del todo, entre dos y al final", () => {
    const mitades = [20, 60, 100];
    expect([puestoAlSoltar(mitades, 5), puestoAlSoltar(mitades, 70), puestoAlSoltar(mitades, 300), puestoAlSoltar([], 10)]).toEqual([0, 2, 3, 0]);
  });
});
