import { afterEach, describe, expect, it } from "vitest";
import type { Sesion } from "../../src/lib/app/sesion";
import { SesionVariante } from "../../src/lib/app/sesion-variante";
import { editar } from "../../src/lib/modelo/operaciones";
import type { Aviso } from "../../src/lib/comprobaciones";
import type { PiezaDe } from "../../src/lib/modelo/tipos";
import { colocarEscena } from "../../src/lib/vistas/actos";
import { crearPieza as crearEnNivel } from "../../src/lib/vistas/crear";
import { variante } from "../../src/lib/variantes/tipos";
import { abrir, serieBasica } from "../consecuencias/ayuda";

const abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas.splice(0)) await s.cerrar();
});

async function preparar() {
  const x = serieBasica();
  const { s } = await abrir(x.b);
  abiertas.push(s);
  const v = await SesionVariante.abrirSobre(s, variante("va-prue", "Prueba", ""));
  abiertas.push(v);
  return { ...x, s, v };
}

const titular = (v: SesionVariante, id: string, t: string) => v.aplicar(editar(v.modelo, id, (p) => ((p as PiezaDe<"evento">).titulo = t)));

describe("«Quitar de la variante» (spec 006, RF-24, RF-24b)", () => {
  it("una pieza sola vuelve a como está en la serie, en un paso de deshacer", async () => {
    const { s, v, s1, s2 } = await preparar();
    await titular(v, s1, "Uno cambiado");
    await titular(v, s2, "Dos cambiado");
    const q = v.quitar(s1);
    expect(q).toEqual({ ids: [s1], otras: [], recortes: new Map() });
    await v.quitarYa(q.ids);
    expect(v.datos.piezas.has(s1)).toBe(false);
    expect(v.modelo.eventos.get(s1)).toBe(s.modelo.eventos.get(s1));
    expect(v.datos.piezas.has(s2)).toBe(true);
    await v.deshacer();
    expect(v.modelo.eventos.get(s1)!.titulo).toBe("Uno cambiado");
    expect(v.datos.piezas.get(s1)!.base).not.toBeNull();
  });

  it("sale de la variante aunque la serie haya cambiado esa pieza: queda lo de la serie de ahora", async () => {
    const { s, v, s1 } = await preparar();
    await titular(v, s1, "En la variante");
    await s.aplicar(editar(s.modelo, s1, (p) => ((p as PiezaDe<"evento">).titulo = "En la serie")));
    await v.quitarYa([s1]);
    expect(v.datos.piezas.has(s1)).toBe(false);
    expect(v.modelo.eventos.get(s1)!.titulo).toBe("En la serie");
  });

  it("una pieza nueva deja de crearse, y con ella lo nuevo que contiene", async () => {
    const { v, t } = await preparar();
    const ep = crearEnNivel(v.modelo, { tipo: "temporada", temporada: t }, "episodio", { titulo: "Ep nuevo" });
    await v.aplicar(ep.cambio);
    const esc = crearEnNivel(v.modelo, { tipo: "episodio", temporada: t, episodio: ep.pieza.id }, "evento", { titulo: "Escena nueva" });
    await v.aplicar(esc.cambio);
    const q = v.quitar(ep.pieza.id);
    expect(q.ids[0]).toBe(ep.pieza.id);
    // La escena nueva y la temporada (su lista de episodios) se van con él
    expect(q.otras).toEqual(expect.arrayContaining([esc.pieza.id, t]));
    await v.quitarYa(q.ids);
    expect(v.modelo.episodios.has(ep.pieza.id)).toBe(false);
    expect(v.modelo.eventos.has(esc.pieza.id)).toBe(false);
    expect(v.datos.piezas.size).toBe(0);
  });

  it("un episodio nuevo sale de la lista de su temporada; lo demás que la variante cambia en ella se queda", async () => {
    const { s, v, t } = await preparar();
    await v.aplicar(editar(v.modelo, t, (p) => ((p as PiezaDe<"temporada">).logline = "Otra temporada")));
    const ep = crearEnNivel(v.modelo, { tipo: "temporada", temporada: t }, "episodio", { titulo: "Ep nuevo" });
    await v.aplicar(ep.cambio);
    const q = v.quitar(ep.pieza.id);
    expect(q).toEqual({ ids: [ep.pieza.id], otras: [], recortes: new Map([[t, [ep.pieza.id]]]) });
    await v.quitarYa(q.ids, q.recortes);
    const temporada = v.modelo.temporadas.get(t)!;
    expect(temporada.logline).toBe("Otra temporada");
    expect(temporada.episodios).toEqual(s.modelo.temporadas.get(t)!.episodios);
    expect(v.modelo.episodios.has(ep.pieza.id)).toBe(false);
    expect([...v.datos.piezas.keys()]).toEqual([t]);
    await v.deshacer();
    expect(v.modelo.temporadas.get(t)!.episodios).toContain(ep.pieza.id);
  });

  it("una temporada nueva no se lleva los cambios de la serie, solo su entrada en la lista", async () => {
    const { s, v } = await preparar();
    const id = v.modelo.serie.id;
    await v.aplicar(editar(v.modelo, id, (p) => ((p as PiezaDe<"serie">).premisa = "Otra premisa")));
    const nueva = crearEnNivel(v.modelo, { tipo: "serie" }, "temporada", { titulo: "Nueva" });
    await v.aplicar(nueva.cambio);
    const q = v.quitar(nueva.pieza.id);
    expect(q.otras).not.toContain(id);
    await v.quitarYa(q.ids, q.recortes);
    expect(v.modelo.serie.premisa).toBe("Otra premisa");
    expect(v.modelo.serie.temporadas).toEqual(s.modelo.serie.temporadas);
    expect(v.modelo.temporadas.has(nueva.pieza.id)).toBe(false);
  });

  it("una escena movida entre dos episodios se lleva las que solo renumeró, de los dos; sin números repetidos", async () => {
    const { s, v, s1, e1, e2 } = await preparar();
    await v.aplicar(colocarEscena(v.modelo, s1, e2, "", 0));
    const renumeradas = [...v.datos.piezas.keys()].filter((id) => id !== s1);
    expect(renumeradas.length).toBeGreaterThan(0);
    const q = v.quitar(s1);
    expect(q.otras.sort()).toEqual(renumeradas.sort());
    await v.quitarYa(q.ids);
    expect(v.datos.piezas.size).toBe(0);
    for (const ep of [e1, e2]) {
      const nums = [...v.modelo.eventos.values()].filter((e) => e.episodio === ep).map((e) => e.orden);
      expect(new Set(nums).size).toBe(nums.length);
    }
    expect(v.modelo.eventos.get(s1)).toBe(s.modelo.eventos.get(s1));
  });

  it("quitar una escena que solo se renumeró arrastra a la movida si no, quedarían números repetidos", async () => {
    const { v, s1, e2, s4 } = await preparar();
    await v.aplicar(colocarEscena(v.modelo, s1, e2, "", 0));
    const q = v.quitar(s4);
    expect(q.ids).toContain(s1);
  });

  it("«no peor que ahora»: un hueco que ya estaba en la serie no obliga a quitar más", async () => {
    const { s, v, s1, s3 } = await preparar();
    // En la serie ya hay un hueco: la escena 2 se fue a la bandeja sin renumerar el episodio
    const s2 = [...s.modelo.eventos.values()].find((e) => e.titulo === "Dos")!;
    await s.aplicar({ guardar: [{ ...structuredClone(s2), episodio: "" }], borrar: [] });
    await titular(v, s1, "Uno");
    await titular(v, s3, "Tres cambiado");
    expect(v.quitar(s3)).toEqual({ ids: [s3], otras: [], recortes: new Map() });
  });

  it("si lo único que cambia es un «Lo sé», se quita ese silencio", async () => {
    const { s, v, s2 } = await preparar();
    const aviso = { id: "C02", pieza: s2, clase: "aviso", mensaje: "", fuente: "" } as unknown as Aviso;
    v.loSe(aviso, true);
    await Promise.resolve();
    expect((v.modelo.eventos.get(s2) as PiezaDe<"evento">).avisos_silenciados).toContain("C02");
    await v.quitarYa(v.quitar(s2).ids);
    expect(v.modelo.eventos.get(s2)).toBe(s.modelo.eventos.get(s2));
  });

  it("la serie: solo se quitan los cambios de sus campos", async () => {
    const { s, v } = await preparar();
    const id = v.modelo.serie.id;
    await v.aplicar(editar(v.modelo, id, (p) => ((p as PiezaDe<"serie">).premisa = "Otra")));
    expect(v.quitar(id)).toEqual({ ids: [id], otras: [], recortes: new Map() });
    await v.quitarYa([id]);
    expect(v.modelo.serie).toBe(s.modelo.serie);
  });
});
