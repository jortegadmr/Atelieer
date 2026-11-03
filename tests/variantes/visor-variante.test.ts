import { describe, expect, it } from "vitest";
import type { Pieza } from "../../src/lib/modelo/tipos";
import { moverEvento } from "../../src/lib/modelo/operaciones";
import { modeloQuedaria } from "../../src/lib/variantes/quedaria";
import { variante } from "../../src/lib/variantes/tipos";
import { marcasVariante, soloDeUnLado, TEXTOS_AHORA, TEXTOS_QUEDARIA } from "../../src/lib/variantes/visor";
import { serieBasica } from "../consecuencias/ayuda";

describe("marcas del visor con una variante (spec 006, RF-17)", () => {
  function preparar() {
    const x = serieBasica();
    const m = x.b.modelo();
    const q = modeloQuedaria(m, variante("va-aaaa", "x", ""));
    // En la variante, la escena 1 pasa al segundo episodio
    const cambio = moverEvento(q, x.s1, x.e2, 0);
    for (const p of cambio.guardar) q.poner(p as Pieza);
    return { ...x, m, q, ids: cambio.guardar.map((p) => p.id) };
  }

  it("en «Cómo quedaría», el número de antes es el de ahora, en acento y con «ahora»", () => {
    const { m, q, t, e2, s4, ids } = preparar();
    const r = marcasVariante(m, q, { tipo: "episodio", temporada: t, episodio: e2 }, ids, false);
    expect(r.fantasma).toBe(true);
    expect(r.textos).toEqual(TEXTOS_QUEDARIA);
    // La escena 4 era la 1 del episodio 2 y en la variante pasa a ser la 2: «ahora 1»
    expect(r.antes.get(s4)?.numero).toBe(1);
    expect(r.nuevas.has(ids[0])).toBe(false);
  });

  it("en «Ahora», marca cómo quedaría («quedaría»): los papeles se dan la vuelta", () => {
    const { m, q, t, e1, e2, s1, ids } = preparar();
    const enE2 = marcasVariante(m, q, { tipo: "episodio", temporada: t, episodio: e2 }, ids, true);
    expect(enE2.textos).toEqual(TEXTOS_AHORA);
    expect(enE2.antes.get(ids.find((id) => id !== s1)!)?.numero).toBe(2);
    // En el episodio 1 de ahora, la escena 1 «quedaría» en otro sitio: «Quedaría aquí» no, se fue
    const enE1 = marcasVariante(m, q, { tipo: "episodio", temporada: t, episodio: e1 }, ids, true);
    expect(enE1.resaltadas.has(s1)).toBe(true);
  });
});

describe("solo ahora y solo en la variante (spec 009, RF-34)", () => {
  it("un arco cuya escena cambia de temporada en la variante: cada lado lleva su texto", () => {
    const x = serieBasica();
    const otra = x.b.temporada({ titulo: "Segunda" }, 1);
    const m = x.b.modelo();
    const q = modeloQuedaria(m, variante("va-aaaa", "x", ""));
    for (const p of moverEvento(q, x.s1, otra.eps[0], 0).guardar) q.poner(p as Pieza);
    expect([...soloDeUnLado(m, q, { tipo: "serie" }, x.a)]).toEqual([[otra.id, "variante"]]);
    expect([...soloDeUnLado(m, q, { tipo: "temporada", temporada: x.t }, x.a)]).toEqual([[x.e1, "ahora"]]);
    // Una escena no es un arco ni un secreto; y dentro de un episodio no hay tramos
    expect(soloDeUnLado(m, q, { tipo: "serie" }, x.s1).size).toBe(0);
    expect(soloDeUnLado(m, q, { tipo: "episodio", temporada: x.t, episodio: x.e1 }, x.a).size).toBe(0);
  });
});
