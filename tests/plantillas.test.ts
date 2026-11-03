import { describe, expect, it } from "vitest";
import { crearPieza, escribirPieza, leerPieza } from "../src/lib/modelo/ficheros";
import { Modelo } from "../src/lib/modelo/modelo";
import { momento, PLANTILLAS, ponerMomento, soloLectura } from "../src/lib/modelo/plantillas";
import type { Episodio, Evento, Serie, Temporada } from "../src/lib/modelo/tipos";

function mundo(extra: Record<string, unknown> = {}) {
  const serie = crearPieza("serie", { id: "se-1", temporadas: ["t-1"] }) as Serie;
  const t = crearPieza("temporada", { id: "t-1", episodios: ["ep-1", "ep-2"], extra }) as Temporada;
  const episodios = ["ep-1", "ep-2"].map((id) => crearPieza("episodio", { id, temporada: "t-1" }) as Episodio);
  const eventos = [
    crearPieza("evento", { id: "ev-uno1", titulo: "Uno", episodio: "ep-1" }) as Evento,
    crearPieza("evento", { id: "ev-dos2", titulo: "Dos", episodio: "ep-2" }) as Evento,
  ];
  const m = new Modelo({ serie, puntos: [], temporadas: [t], episodios, arcos: [], eventos, secretos: [] });
  return { m, t: m.temporadas.get("t-1")! };
}

describe("Plantillas (spec 011, T8)", () => {
  it("hay cuatro plantillas con sus momentos", () => {
    expect(PLANTILLAS.map((p) => [p.id, p.momentos.length])).toEqual([
      ["tres_actos", 4],
      ["story_circle", 8],
      ["save_the_cat", 15],
      ["viaje_heroe", 12],
    ]);
    expect(PLANTILLAS[0].momentos.map((x) => x.clave)).toEqual(["detonante", "punto_medio", "crisis", "climax"]);
  });

  it("Tres actos escribe texto y episodio en estructura y la escena aparte", () => {
    const { m, t } = mundo();
    ponerMomento(m, t, "tres_actos", "detonante", { texto: "Llega la cinta" });
    ponerMomento(m, t, "tres_actos", "detonante", { escena: "ev-uno1" });
    expect(t.estructura.detonante).toEqual({ texto: "Llega la cinta", episodio: "ep-1" });
    expect(t.extra).toEqual({ estructura_escenas: { detonante: "ev-uno1" } });
    expect(momento(t, "tres_actos", "detonante")).toEqual({ texto: "Llega la cinta", episodio: "ep-1", escena: "ev-uno1" });
  });

  it("Story Circle: texto en story_circle, sitio aparte", () => {
    const { m, t } = mundo();
    ponerMomento(m, t, "story_circle", "necesidad", { texto: "Quiere salir", episodio: "ep-2" });
    expect(t.story_circle[1]).toBe("Quiere salir");
    expect(t.extra).toEqual({ story_circle_sitios: { necesidad: { episodio: "ep-2" } } });
    expect(momento(t, "story_circle", "necesidad")).toEqual({ texto: "Quiere salir", episodio: "ep-2", escena: "" });
  });

  it("escribir y vaciar el último paso de un Story Circle corto lo deja como estaba", () => {
    const { m, t } = mundo();
    t.story_circle = ["Tú", "Necesidad"];
    const ultimo = PLANTILLAS[1].momentos.at(-1)!.clave;
    ponerMomento(m, t, "story_circle", ultimo, { texto: "Vuelve" });
    expect(t.story_circle).toHaveLength(8);
    ponerMomento(m, t, "story_circle", ultimo, { texto: "" });
    expect(t.story_circle).toEqual(["Tú", "Necesidad"]);
  });

  it("poner escena pone su episodio", () => {
    const { m, t } = mundo();
    ponerMomento(m, t, "save_the_cat", "catalizador", { texto: "La señal", episodio: "ep-1" });
    ponerMomento(m, t, "save_the_cat", "catalizador", { escena: "ev-dos2" });
    expect(t.extra.save_the_cat).toEqual({ catalizador: { texto: "La señal", episodio: "ep-2", escena: "ev-dos2" } });
  });

  it("cambiar de episodio quita la escena de otro episodio", () => {
    const { m, t } = mundo();
    ponerMomento(m, t, "viaje_heroe", "odisea", { escena: "ev-uno1" });
    ponerMomento(m, t, "viaje_heroe", "odisea", { episodio: "ep-2" });
    expect(t.extra.viaje_heroe).toEqual({ odisea: { episodio: "ep-2" } });
    // Al mismo episodio, la escena se queda
    ponerMomento(m, t, "viaje_heroe", "odisea", { escena: "ev-dos2" });
    ponerMomento(m, t, "viaje_heroe", "odisea", { episodio: "ep-2" });
    expect(momento(t, "viaje_heroe", "odisea").escena).toBe("ev-dos2");
    // Tres actos igual, aunque el episodio esté en estructura
    ponerMomento(m, t, "tres_actos", "crisis", { escena: "ev-uno1" });
    ponerMomento(m, t, "tres_actos", "crisis", { episodio: "ep-2" });
    expect(t.estructura.crisis.episodio).toBe("ep-2");
    expect(Object.hasOwn(t.extra, "estructura_escenas")).toBe(false);
  });

  it("vaciar borra la clave y la propiedad", () => {
    const { m, t } = mundo();
    const antes = escribirPieza(structuredClone(t));
    ponerMomento(m, t, "save_the_cat", "debate", { texto: "Duda" });
    ponerMomento(m, t, "save_the_cat", "final", { episodio: "ep-1" });
    ponerMomento(m, t, "save_the_cat", "debate", { texto: "" });
    expect(t.extra.save_the_cat).toEqual({ final: { episodio: "ep-1" } });
    ponerMomento(m, t, "save_the_cat", "final", { episodio: "" });
    expect(Object.hasOwn(t.extra, "save_the_cat")).toBe(false);
    ponerMomento(m, t, "tres_actos", "climax", { escena: "ev-dos2" });
    ponerMomento(m, t, "tres_actos", "climax", { escena: "" });
    expect(t.estructura.climax).toEqual({ texto: "", episodio: "ep-2" });
    ponerMomento(m, t, "tres_actos", "climax", { episodio: "" });
    expect(escribirPieza(t)).toBe(antes);
  });

  it("valores raros y no objeto se conservan", () => {
    const raro = { catalizador: { texto: 5, episodio: "ep-1", nota: "mía" }, debate: "a mano", otra: [1, 2] };
    const { m, t } = mundo({ save_the_cat: structuredClone(raro), viaje_heroe: "escrito a mano" });
    // Un texto que no es texto cuenta como vacío
    expect(momento(t, "save_the_cat", "catalizador")).toEqual({ texto: "", episodio: "ep-1", escena: "" });
    expect(momento(t, "save_the_cat", "debate")).toEqual({ texto: "", episodio: "", escena: "" });
    // Tocar otro momento no toca lo raro
    ponerMomento(m, t, "save_the_cat", "final", { texto: "Vence" });
    expect(t.extra.save_the_cat).toEqual({ ...raro, final: { texto: "Vence" } });
    // Cambiar el episodio conserva el texto raro y la nota
    ponerMomento(m, t, "save_the_cat", "catalizador", { episodio: "ep-2" });
    expect((t.extra.save_the_cat as Record<string, unknown>).catalizador).toEqual({ texto: 5, episodio: "ep-2", nota: "mía" });
    // Una propiedad que no es objeto: solo lectura, con lo escrito, y no se toca
    expect(soloLectura(t, "viaje_heroe")).toBe("escrito a mano");
    expect(soloLectura(t, "save_the_cat")).toBeNull();
    expect(momento(t, "viaje_heroe", "odisea")).toEqual({ texto: "", episodio: "", escena: "" });
    ponerMomento(m, t, "viaje_heroe", "odisea", { texto: "No" });
    expect(t.extra.viaje_heroe).toBe("escrito a mano");
    // Y vuelve igual del disco
    const otra = leerPieza(escribirPieza(t), "temporada") as Temporada;
    expect(otra.extra).toEqual(t.extra);
  });

  it("ni __proto__ en disco ni claves extrañas en el cambio se leen o escriben", () => {
    const disco = JSON.parse('{"__proto__": {"texto": "trampa"}, "odisea": {"texto": "Bien"}}');
    const { m, t } = mundo({ viaje_heroe: disco });
    expect(momento(t, "viaje_heroe", "__proto__" as never)).toEqual({ texto: "", episodio: "", escena: "" });
    expect(momento(t, "viaje_heroe", "odisea").texto).toBe("Bien");
    // Una clave que no es de la plantilla no se escribe
    ponerMomento(m, t, "viaje_heroe", "__proto__" as never, { texto: "x" });
    ponerMomento(m, t, "viaje_heroe", "constructor" as never, { texto: "x" });
    // Del cambio solo se leen texto, episodio y escena
    const cambio = JSON.parse('{"texto": "Mejor", "__proto__": {"malo": 1}, "malo": 2}');
    ponerMomento(m, t, "viaje_heroe", "odisea", cambio);
    const vh = t.extra.viaje_heroe as Record<string, unknown>;
    expect(Object.keys(vh).sort()).toEqual(["__proto__", "odisea"]);
    expect(vh.odisea).toEqual({ texto: "Mejor" });
    expect(({} as Record<string, unknown>).malo).toBeUndefined();
    expect(({} as Record<string, unknown>).texto).toBeUndefined();
  });
});
