import { describe, expect, it } from "vitest";
import { crearPieza, escribirPieza, leerPieza } from "../src/lib/modelo/ficheros";
import { Modelo } from "../src/lib/modelo/modelo";
import type { Evento } from "../src/lib/modelo/tipos";
import { anadirCausa, causasDe, leerVieneDe, ponerVieneDe, queEs, quitarCausa } from "../src/lib/modelo/viene-de";
import { editadoPorV1, guardadoPorV1, leidoPorV1 } from "./compat/uso-v1";

// «Viene de» y la v1.0 (spec 011, T2, constitución 9): la v1.0 no lo entiende,
// pero lo conserva al editar la escena y sigue viéndola igual.

const base = () =>
  crearPieza("evento", { id: "ev-cccc", titulo: "La cinta", temporada: "te-1", episodio: "ep-2", orden: 3, personajes: ["[[Telmo]]"] });

function conCausas(): Evento {
  const ev = base();
  ponerVieneDe(ev, anadirCausa(ev, "ev-aaaa"));
  ponerVieneDe(ev, anadirCausa(ev, "ev-bbbb"));
  return ev;
}

function modelo(eventos: Evento[]): Modelo {
  return new Modelo({
    serie: crearPieza("serie", { id: "se-1" }),
    puntos: [],
    temporadas: [],
    episodios: [],
    arcos: [],
    eventos,
    secretos: [],
  });
}

const leer = (texto: string) => leerPieza(texto, "evento") as Evento;

describe("Viene de y la v1.0 (spec 011, T2)", () => {
  it("la v1.0 ve la escena igual", () => {
    const leido = leidoPorV1(escribirPieza(conCausas()), "evento");
    const sin = leidoPorV1(escribirPieza(base()), "evento");
    for (const k of ["titulo", "temporada", "episodio", "orden", "personajes", "acto"]) expect(leido[k]).toEqual(sin[k]);
    // Y guardar sin cambiar nada no pierde las causas
    expect(leer(guardadoPorV1(escribirPieza(conCausas()), "evento")).extra.viene_de).toEqual(["ev-aaaa", "ev-bbbb"]);
  });

  it("viene_de sobrevive a cada edición de la v1.0", () => {
    const texto = escribirPieza(conCausas());
    // Editar un campo
    const editada = leer(editadoPorV1(texto, "evento", (p) => (p.titulo = "La cinta borrada")));
    expect(editada.titulo).toBe("La cinta borrada");
    expect(editada.extra.viene_de).toEqual(["ev-aaaa", "ev-bbbb"]);
    // Reordenar escenas: cambia orden
    const movida = leer(editadoPorV1(texto, "evento", (p) => (p.orden = 1)));
    expect(movida.orden).toBe(1);
    expect(movida.extra.viene_de).toEqual(["ev-aaaa", "ev-bbbb"]);
    // Borrar su episodio: queda en la bandeja con sus causas
    const sinEpisodio = leer(editadoPorV1(texto, "evento", (p) => (p.episodio = "")));
    expect(sinEpisodio.episodio).toBe("");
    expect(sinEpisodio.extra.viene_de).toEqual(["ev-aaaa", "ev-bbbb"]);
    // Y se sigue pudiendo quitar una causa con la v2
    expect(quitarCausa(sinEpisodio, { id: "ev-aaaa", i: 0 })).toEqual(["ev-bbbb"]);
  });

  it("borrar la temporada de una causa: la causa ya no está", () => {
    const a = crearPieza("evento", { id: "ev-aaaa", temporada: "te-0" });
    const b = crearPieza("evento", { id: "ev-bbbb", temporada: "te-1" });
    const c = leer(guardadoPorV1(escribirPieza(conCausas()), "evento"));
    expect(causasDe(modelo([a, b, c]), c)).toEqual(["ev-aaaa", "ev-bbbb"]);
    // La v1.0 borra te-0: sus escenas ya no se leen
    const m = modelo([b, c]);
    expect(causasDe(m, c)).toEqual(["ev-bbbb"]);
    expect(queEs(m, "ev-aaaa", c.id)).toBe("ya-no-esta");
    expect(leerVieneDe(c)).toEqual({ editable: true, entradas: [{ id: "ev-aaaa", i: 0 }, { id: "ev-bbbb", i: 1 }] });
  });

  it("sin causas, la nota es idéntica a la de antes", () => {
    const antes = escribirPieza(base());
    const ev = conCausas();
    ponerVieneDe(ev, quitarCausa(ev, { id: "ev-aaaa", i: 0 }));
    ponerVieneDe(ev, quitarCausa(ev, { id: "ev-bbbb", i: 0 }));
    expect(escribirPieza(ev)).toBe(antes);
    expect(guardadoPorV1(escribirPieza(ev), "evento")).toBe(guardadoPorV1(antes, "evento"));
  });
});
