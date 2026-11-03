import { describe, expect, it } from "vitest";
import { comprobar } from "../../src/lib/comprobaciones";
import { copiaModelo } from "../../src/lib/consecuencias/copia";
import { afectadas } from "../../src/lib/consecuencias/huellas";
import { marcasVisor } from "../../src/lib/consecuencias/visor";
import type { Cambio, Modelo } from "../../src/lib/modelo/modelo";
import * as op from "../../src/lib/modelo/operaciones";
import type { Pieza } from "../../src/lib/modelo/tipos";
import { crearEscena } from "../../src/lib/vistas/actos";
import type { Nivel } from "../../src/lib/vistas/visor";
import { serieBasica } from "./ayuda";

const aplicar = (m: Modelo, cambio: Cambio) => {
  for (const p of cambio.borrar) m.quitar(p.id);
  for (const p of cambio.guardar) m.poner(p);
};
const cambiar = (m: Modelo, id: string, fn: (p: never) => unknown) => {
  const p = structuredClone(m.pieza(id)) as Pieza;
  fn(p as never);
  m.poner(p);
};

/** La serie básica, su base y las marcas en un nivel con la abierta y sus afectadas */
function preparar() {
  const x = serieBasica();
  const m = x.b.modelo();
  const base = copiaModelo(m);
  const marcas = (nivel: Nivel, abierta: string) => {
    const ids = [abierta, ...afectadas(base, m, comprobar(base).avisos, comprobar(m).avisos, abierta).map((a) => a.id)];
    return marcasVisor(base, m, nivel, ids);
  };
  return { ...x, m, base, marcas };
}

describe("marcas del visor con la pestaña abierta (spec 005, RF-27, RF-28)", () => {
  it("mover una escena: resalta en los tres niveles, con «antes» y «Estaba aquí»", () => {
    const { m, t, e1, e2, s1, s2, s3, s4, marcas } = preparar();
    aplicar(m, op.moverEvento(m, s1, e2, 0));
    const serie = marcas({ tipo: "serie" }, s1);
    expect([...serie.resaltadas]).toEqual([t]);
    expect(serie.antes.size).toBe(0);

    const temporada = marcas({ tipo: "temporada", temporada: t }, s1);
    expect([...temporada.resaltadas].sort()).toEqual([e1, e2].sort());
    expect(temporada.antes.get(e1)).toEqual({ dominante: "El eco" });
    expect(temporada.antes.has(e2)).toBe(false);

    const origen = marcas({ tipo: "episodio", temporada: t, episodio: e1 }, s1);
    expect(origen.estabanAqui).toEqual([{ id: s1, titulo: "Uno", acto: "", puesto: 0 }]);
    expect(origen.antes.get(s2)).toEqual({ numero: 2 });
    expect(origen.antes.get(s3)).toEqual({ numero: 3 });

    const destino = marcas({ tipo: "episodio", temporada: t, episodio: e2 }, s1);
    expect([...destino.resaltadas].sort()).toEqual([s1, s4].sort());
    expect(destino.antes.get(s4)).toEqual({ numero: 1 });
    // No estaba aquí: su número de antes no es de este episodio
    expect(destino.antes.has(s1)).toBe(false);
    expect(destino.estabanAqui).toEqual([]);
    expect(destino.nuevas.size).toBe(0);
  });

  it("un arco y un secreto se resaltan en sus episodios de antes y de ahora", () => {
    const x = serieBasica();
    const sc = x.b.secreto({ titulo: "La cinta", pistas: [{ episodio: "", evento: x.s2, texto: "Un sobre", clase: "sutil" }] });
    const m = x.b.modelo();
    const base = copiaModelo(m);
    aplicar(m, op.moverEvento(m, x.s2, x.e2, 0));
    const nivel: Nivel = { tipo: "temporada", temporada: x.t };
    expect([...marcasVisor(base, m, nivel, [sc]).resaltadas].sort()).toEqual([x.e1, x.e2].sort());
    // El arco deja de pasar por e1 al sacar su escena a la bandeja: e1 (antes) y e2 (antes y ahora)
    aplicar(m, op.moverEvento(m, x.s1, ""));
    expect([...marcasVisor(base, m, nivel, [x.a]).resaltadas].sort()).toEqual([x.e1, x.e2].sort());
    expect([...marcasVisor(base, m, { tipo: "serie" }, [x.a]).resaltadas]).toEqual([x.t]);
  });

  it("«Estaba aquí» solo si cambió de acto, de episodio o de bandeja; renumerada, solo «antes»", () => {
    const { m, t, e1, s1, s2, s3, marcas } = preparar();
    cambiar(m, s2, (p: { acto: string }) => (p.acto = "2"));
    const r = marcas({ tipo: "episodio", temporada: t, episodio: e1 }, s2);
    expect(r.estabanAqui).toEqual([{ id: s2, titulo: "Dos", acto: "", puesto: 1 }]);
    expect(r.estabanAqui.some((x) => x.id === s1 || x.id === s3)).toBe(false);

    // A la bandeja: en el nivel temporada sale en la bandeja, sin «Estaba aquí» (no estaba allí)
    aplicar(m, op.moverEvento(m, s3, ""));
    const enTemporada = marcas({ tipo: "temporada", temporada: t }, s3);
    expect(enTemporada.resaltadas.has(s3)).toBe(true);
    expect(enTemporada.estabanAqui).toEqual([]);
    expect(marcas({ tipo: "episodio", temporada: t, episodio: e1 }, s3).estabanAqui.map((x) => x.id)).toContain(s3);
  });

  it("«Ya no está» por cada pieza del nivel borrada, y «Nueva» en las nuevas", () => {
    const { m, t, e1, e2, s3, marcas } = preparar();
    aplicar(m, op.borrarPieza(m, s3));
    expect(marcas({ tipo: "episodio", temporada: t, episodio: e1 }, e1).yaNoEsta).toEqual([{ id: s3, titulo: "Tres" }]);
    const nueva = crearEscena(m, e1, "1", { titulo: "Nueva" });
    aplicar(m, nueva.cambio);
    expect([...marcas({ tipo: "episodio", temporada: t, episodio: e1 }, nueva.pieza.id).nuevas]).toEqual([nueva.pieza.id]);
    const ep = op.insertarEpisodio(m, t, 0);
    aplicar(m, ep.cambio);
    aplicar(m, op.borrarPieza(m, e2));
    const r = marcas({ tipo: "temporada", temporada: t }, ep.pieza.id);
    expect([...r.nuevas]).toEqual([ep.pieza.id]);
    expect(r.yaNoEsta.map((x) => x.id)).toEqual([e2]);
    expect(marcas({ tipo: "serie" }, ep.pieza.id).antes.get(t)).toBeUndefined();
  });

  it("nivel serie: «antes» con el número de episodios y la carga de la temporada", () => {
    const { m, t, marcas } = preparar();
    aplicar(m, op.insertarEpisodio(m, t, 2).cambio);
    cambiar(m, t, (p: { carga: [string, string] }) => (p.carga = ["+", "-"]));
    expect(marcas({ tipo: "serie" }, t).antes.get(t)).toEqual({ episodios: 2, carga: ["", ""] });
  });
});
