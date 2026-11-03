import { describe, expect, it } from "vitest";
import { codigoEpisodio, codigoTemporada, codigosDeSerie, ordenEpisodios, ordenTemporadas } from "../src/lib/modelo/codigos";
import { crearPieza } from "../src/lib/modelo/ficheros";
import type { Episodio, Serie, Temporada } from "../src/lib/modelo/tipos";

function serieDePrueba() {
  const serie = crearPieza("serie", { id: "se-1", temporadas: ["te-a", "te-b"] }) as Serie;
  const ta = crearPieza("temporada", { id: "te-a", episodios: ["ep-1", "ep-2", "ep-3"] }) as Temporada;
  const tb = crearPieza("temporada", { id: "te-b", episodios: ["ep-4"] }) as Temporada;
  const eps = ["ep-1", "ep-2", "ep-3"].map((id) => crearPieza("episodio", { id, temporada: "te-a" }) as Episodio);
  eps.push(crearPieza("episodio", { id: "ep-4", temporada: "te-b" }) as Episodio);
  return { serie, temporadas: [ta, tb], episodios: eps };
}

describe("códigos calculados (D4)", () => {
  it("T01 y T01E06 con dos cifras", () => {
    expect(codigoTemporada(0)).toBe("T01");
    expect(codigoTemporada(11)).toBe("T12");
    expect(codigoEpisodio(0, 5)).toBe("T01E06");
    expect(codigoEpisodio(1, 0)).toBe("T02E01");
  });

  it("salen del orden de la serie y de cada temporada", () => {
    const { serie, temporadas, episodios } = serieDePrueba();
    const c = codigosDeSerie(serie, temporadas, episodios);
    expect(c.get("te-a")).toBe("T01");
    expect(c.get("te-b")).toBe("T02");
    expect(c.get("ep-3")).toBe("T01E03");
    expect(c.get("ep-4")).toBe("T02E01");
  });

  it("insertar un episodio cambia los códigos de los siguientes sin tocar sus ids", () => {
    const { serie, temporadas, episodios } = serieDePrueba();
    const nuevo = crearPieza("episodio", { id: "ep-n", temporada: "te-a" }) as Episodio;
    temporadas[0].episodios.splice(1, 0, "ep-n");
    const c = codigosDeSerie(serie, temporadas, [...episodios, nuevo]);
    expect(c.get("ep-1")).toBe("T01E01");
    expect(c.get("ep-n")).toBe("T01E02");
    expect(c.get("ep-2")).toBe("T01E03");
    expect(c.get("ep-3")).toBe("T01E04");
    expect(episodios.map((e) => e.id)).toEqual(["ep-1", "ep-2", "ep-3", "ep-4"]);
  });

  it("reordenar temporadas cambia sus códigos", () => {
    const { serie, temporadas, episodios } = serieDePrueba();
    serie.temporadas.reverse();
    const c = codigosDeSerie(serie, temporadas, episodios);
    expect(c.get("te-b")).toBe("T01");
    expect(c.get("ep-1")).toBe("T02E01");
  });

  it("lo que no está en la lista de la madre va al final; lo que no existe se salta", () => {
    const { serie, temporadas, episodios } = serieDePrueba();
    serie.temporadas = ["te-b", "te-fantasma"];
    expect(ordenTemporadas(serie, temporadas)).toEqual(["te-b", "te-a"]);
    temporadas[0].episodios = ["ep-3", "ep-borrado"];
    expect(ordenEpisodios(temporadas[0], episodios)).toEqual(["ep-3", "ep-1", "ep-2"]);
  });
});
