import { describe, expect, it } from "vitest";
import { crearPieza, escribirPieza, leerPieza } from "../src/lib/modelo/ficheros";
import { Modelo } from "../src/lib/modelo/modelo";
import { momento, ponerMomento } from "../src/lib/modelo/plantillas";
import type { Episodio, Evento, Temporada } from "../src/lib/modelo/tipos";
import { editadoPorV1, guardadoPorV1, leidoPorV1 } from "./compat/uso-v1";

// Plantillas y la v1.0 (spec 011, T9, constitución 9): la v1.0 ve Estructura y
// Story Circle como siempre y conserva lo nuevo al editar la temporada.

const base = () =>
  crearPieza("temporada", {
    id: "te-1",
    titulo: "Cerrar la emisora",
    episodios: ["ep-1", "ep-2", "ep-3"],
    estructura: {
      detonante: { texto: "Telmo llega al pueblo", episodio: "ep-1" },
      punto_medio: { texto: "", episodio: "" },
      crisis: { texto: "", episodio: "" },
      climax: { texto: "", episodio: "" },
    },
    story_circle: ["Casa", "Salir", "", "", "", "", "", ""],
  }) as Temporada;

function modelo(): Modelo {
  const episodios = ["ep-1", "ep-2", "ep-3"].map((id) => crearPieza("episodio", { id, temporada: "te-1" }) as Episodio);
  const eventos = [
    crearPieza("evento", { id: "ev-aaaa", titulo: "Telmo llega al pueblo", episodio: "ep-1" }) as Evento,
    crearPieza("evento", { id: "ev-bbbb", titulo: "La cinta", episodio: "ep-3" }) as Evento,
  ];
  return new Modelo({ serie: crearPieza("serie", { id: "se-1", temporadas: ["te-1"] }), puntos: [], temporadas: [base()], episodios, arcos: [], eventos, secretos: [] });
}

function conPlantillas(): Temporada {
  const m = modelo();
  const t = structuredClone(base());
  ponerMomento(m, t, "tres_actos", "detonante", { escena: "ev-aaaa" });
  ponerMomento(m, t, "story_circle", "necesidad", { escena: "ev-bbbb" });
  ponerMomento(m, t, "save_the_cat", "catalizador", { texto: "La señal", episodio: "ep-2" });
  ponerMomento(m, t, "viaje_heroe", "odisea", { texto: "La final", escena: "ev-bbbb" });
  return t;
}

const leer = (texto: string) => leerPieza(texto, "temporada") as Temporada;

function lonuevo(t: Temporada) {
  expect(momento(t, "tres_actos", "detonante").escena).toBe("ev-aaaa");
  expect(momento(t, "story_circle", "necesidad")).toEqual({ texto: "Salir", episodio: "ep-3", escena: "ev-bbbb" });
  expect(momento(t, "save_the_cat", "catalizador")).toEqual({ texto: "La señal", episodio: "ep-2", escena: "" });
  expect(momento(t, "viaje_heroe", "odisea")).toEqual({ texto: "La final", episodio: "ep-3", escena: "ev-bbbb" });
}

describe("Plantillas y la v1.0 (spec 011, T9)", () => {
  it("la v1.0 ve Estructura y Story Circle igual", () => {
    const leido = leidoPorV1(escribirPieza(conPlantillas()), "temporada");
    const sin = leidoPorV1(escribirPieza(base()), "temporada");
    for (const k of ["titulo", "estructura", "story_circle", "episodios"]) expect(leido[k]).toEqual(sin[k]);
    // Y guardar sin cambiar nada no pierde lo nuevo
    lonuevo(leer(guardadoPorV1(escribirPieza(conPlantillas()), "temporada")));
  });

  it("lo nuevo sobrevive a cada edición de la v1.0", () => {
    const texto = escribirPieza(conPlantillas());
    // Editar un campo de la temporada
    const editada = leer(editadoPorV1(texto, "temporada", (p) => (p.titulo = "Salvar la emisora")));
    expect(editada.titulo).toBe("Salvar la emisora");
    lonuevo(editada);
    // Reordenar episodios
    const reordenada = leer(editadoPorV1(texto, "temporada", (p) => (p.episodios = ["ep-3", "ep-1", "ep-2"])));
    expect(reordenada.episodios).toEqual(["ep-3", "ep-1", "ep-2"]);
    lonuevo(reordenada);
    // Borrar un episodio: lo quita de la lista; los momentos lo conservan
    const sinEp = leer(editadoPorV1(texto, "temporada", (p) => (p.episodios = ["ep-1", "ep-3"])));
    expect(sinEp.episodios).toEqual(["ep-1", "ep-3"]);
    lonuevo(sinEp);
    // Cambiar el episodio del detonante: manda el episodio y la escena se conserva
    const otroEp = leer(
      editadoPorV1(texto, "temporada", (p) => ((p.estructura as Record<string, Record<string, string>>).detonante.episodio = "ep-2")),
    );
    expect(momento(otroEp, "tres_actos", "detonante")).toEqual({ texto: "Telmo llega al pueblo", episodio: "ep-2", escena: "ev-aaaa" });
  });

  it("sin plantillas, la nota es idéntica", () => {
    const m = modelo();
    const t = structuredClone(base());
    const antes = escribirPieza(t);
    // Poner y quitar deja la nota como estaba
    ponerMomento(m, t, "save_the_cat", "debate", { texto: "Duda" });
    ponerMomento(m, t, "story_circle", "ir", { episodio: "ep-2" });
    ponerMomento(m, t, "tres_actos", "detonante", { escena: "ev-aaaa" });
    ponerMomento(m, t, "save_the_cat", "debate", { texto: "" });
    ponerMomento(m, t, "story_circle", "ir", { episodio: "" });
    ponerMomento(m, t, "tres_actos", "detonante", { escena: "" });
    expect(escribirPieza(t)).toBe(antes);
    expect(escribirPieza(leer(antes))).toBe(antes);
  });
});
