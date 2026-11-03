import { describe, expect, it } from "vitest";
import { crearPieza } from "../src/lib/modelo/ficheros";
import { Modelo } from "../src/lib/modelo/modelo";
import { plantilla, ponerMomento, type Sitio } from "../src/lib/modelo/plantillas";
import type { Episodio, Evento, Temporada } from "../src/lib/modelo/tipos";
import { atados, columnasPlantilla, enEpisodios } from "../src/lib/vistas/plantillas";

// Plantillas en la rejilla (spec 011, RF-27, RF-33, RF-34, RF-37 a RF-40, T10)

const punto = (p: number): Sitio => ({ punto: p });
const tramo = (a: number, b: number): Sitio => ({ tramo: [a, b] });

function mundo(creados: number, previstos = 0, eventos: (Partial<Omit<Evento, "arcos">> & { id: string })[] = []) {
  const eps = Array.from({ length: creados }, (_, i) => `ep-${i + 1}`);
  const t = crearPieza("temporada", { id: "t-1", episodios: eps, episodios_previstos: previstos }) as Temporada;
  const episodios = eps.map((id) => crearPieza("episodio", { id, temporada: "t-1" }) as Episodio);
  const evs = eventos.map((e) => crearPieza("evento", e) as Evento);
  const m = new Modelo({ serie: crearPieza("serie", { id: "se-1", temporadas: ["t-1"] }), puntos: [], temporadas: [t], episodios, arcos: [], eventos: evs, secretos: [] });
  return { m, t: m.temporadas.get("t-1")! };
}

describe("Sitio en episodios (RF-27)", () => {
  it("con un episodio, todo en E01", () => {
    for (const s of [punto(1), punto(50), punto(100), tramo(0, 12.5), tramo(87.5, 100), tramo(80, 99)]) expect(enEpisodios(s, 1)).toEqual([1, 1]);
  });

  it("los ejemplos con seis episodios", () => {
    expect(enEpisodios(punto(50), 6)).toEqual([3, 3]);
    expect(enEpisodios(punto(75), 6)).toEqual([5, 5]);
    expect(enEpisodios(tramo(85, 95), 6)).toEqual([6, 6]);
    expect(enEpisodios(tramo(0, 12.5), 6)).toEqual([1, 1]);
  });

  it("los ejemplos con diez episodios", () => {
    expect(enEpisodios(punto(50), 10)).toEqual([5, 5]);
    expect(enEpisodios(tramo(50, 60), 10)).toEqual([6, 6]);
    expect(enEpisodios(tramo(0, 10), 10)).toEqual([1, 1]);
    expect(enEpisodios(punto(100), 10)).toEqual([10, 10]);
  });

  it("los 8 pasos del Story Circle con ocho episodios, uno en cada uno", () => {
    expect(plantilla("story_circle").momentos.map((x) => enEpisodios(x.sitio, 8))).toEqual([1, 2, 3, 4, 5, 6, 7, 8].map((k) => [k, k]));
  });
});

describe("Columnas de la plantilla (RF-37 a RF-40)", () => {
  it("«Previstos» con 3 creados y 10 previstos", () => {
    const { m, t } = mundo(3, 10);
    const cols = columnasPlantilla(m, t, "tres_actos");
    expect(cols.map((x) => (x.tipo === "episodio" ? x.numero : x.texto))).toEqual([1, 2, 3, "Previstos: E04-E10"]);
    // Detonante 10-15 % → E02; punto medio E05, crisis E08, clímax 85-95 % → E09-E10
    expect(cols[1].franjas.map((f) => [f.clave, f.texto])).toEqual([["detonante", "E02"]]);
    expect(cols[3].franjas.map((f) => [f.clave, f.texto])).toEqual([
      ["punto_medio", "E05"],
      ["crisis", "E08"],
      ["climax", "E09-E10"],
    ]);
  });

  it("con 0 creados solo sale «Previstos», y sin nada, ninguna columna", () => {
    const { m, t } = mundo(0, 6);
    const cols = columnasPlantilla(m, t, "tres_actos");
    expect(cols.map((x) => x.tipo)).toEqual(["previstos"]);
    expect(cols[0].tipo === "previstos" && cols[0].texto).toBe("Previstos: E01-E06");
    expect(cols[0].franjas).toHaveLength(4);
    expect(columnasPlantilla(mundo(0, 0).m, mundo(0, 0).t, "tres_actos")).toEqual([]);
  });

  it("un tramo que toca varias columnas dice desde, sigue y hasta", () => {
    const { m, t } = mundo(10);
    // Diversión y juegos 20-50 % → E03-E05
    const cols = columnasPlantilla(m, t, "save_the_cat");
    const div = (i: number) => cols[i].franjas.find((f) => f.clave === "diversion")?.texto;
    expect([div(1), div(2), div(3), div(4), div(5)]).toEqual([undefined, "desde E03", "sigue", "hasta E05", undefined]);
  });

  it("un tramo que cruza a «Previstos» sale en sus columnas y allí", () => {
    const { m, t } = mundo(3, 10);
    // Pruebas, aliados y enemigos 25-50 % → E03-E05
    const cols = columnasPlantilla(m, t, "viaje_heroe");
    expect(cols[2].franjas.find((f) => f.clave === "pruebas")?.texto).toBe("desde E03");
    expect(cols[3].franjas.find((f) => f.clave === "pruebas")?.texto).toBe("hasta E05");
  });

  it("con un episodio y Save the Cat, 4 visibles y 11 más", () => {
    const { m, t } = mundo(1);
    const [col] = columnasPlantilla(m, t, "save_the_cat");
    expect(col.franjas).toHaveLength(15);
    expect(col.visibles.map((f) => f.clave)).toEqual(["imagen_apertura", "tema", "planteamiento", "catalizador"]);
    expect(col.resto).toBe(11);
  });

  it("los momentos atados van en su episodio con el estado de su escena", () => {
    const { m, t } = mundo(3, 0, [
      { id: "ev-aaaa", episodio: "ep-1" },
      { id: "ev-bbbb", episodio: "ep-2", madurez: "descartado" },
      { id: "ev-cccc", episodio: "ep-3" },
    ]);
    ponerMomento(m, t, "save_the_cat", "catalizador", { escena: "ev-aaaa" });
    ponerMomento(m, t, "save_the_cat", "debate", { escena: "ev-bbbb" });
    ponerMomento(m, t, "save_the_cat", "final", { texto: "Vence", escena: "ev-cccc" });
    ponerMomento(m, t, "save_the_cat", "tema", { escena: "ev-zzzz", episodio: "ep-2" });
    ponerMomento(m, t, "save_the_cat", "trama_b", { texto: "Sin sitio" });
    ponerMomento(m, t, "save_the_cat", "imagen_final", { episodio: "ep-9" });
    // La escena del catalizador se va a otro episodio: manda el del momento
    m.eventos.get("ev-aaaa")!.episodio = "ep-3";
    expect(atados(m, t, "save_the_cat").map((a) => [a.clave, a.episodio, a.estadoEscena])).toEqual([
      ["tema", "ep-2", "ya no está"],
      ["catalizador", "ep-1", "en otro episodio"],
      ["debate", "ep-2", "descartada"],
      ["final", "ep-3", ""],
    ]);
    const cols = columnasPlantilla(m, t, "save_the_cat");
    expect(cols.map((x) => x.atados.map((a) => a.clave))).toEqual([["catalizador"], ["tema", "debate"], ["final"]]);
    expect(cols[2].atados[0].texto).toBe("Vence");
  });

  it("cambiar de plantilla con 300 escenas tarda menos de 100 ms", () => {
    const eventos = Array.from({ length: 300 }, (_, i) => ({ id: `ev-${String(i).padStart(4, "0")}`, episodio: `ep-${(i % 10) + 1}` }));
    const { m, t } = mundo(10, 0, eventos);
    const inicio = performance.now();
    for (const id of ["tres_actos", "story_circle", "save_the_cat", "viaje_heroe"] as const) columnasPlantilla(m, t, id);
    expect(performance.now() - inicio).toBeLessThan(100);
  });
});
