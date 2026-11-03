import { afterEach, describe, expect, it } from "vitest";
import type { Sesion } from "../../src/lib/app/sesion";
import { conEstado } from "../../src/lib/modelo/estados";
import { editar } from "../../src/lib/modelo/operaciones";
import type { PiezaDe } from "../../src/lib/modelo/tipos";
import { crearIdea } from "../../src/lib/vistas/crear";
import { nivelValido } from "../../src/lib/vistas/visor";
import { abrir, serieBasica } from "../consecuencias/ayuda";

const VIENDO_AHORA = "Estás viendo ahora. Pulsa «Ver cómo quedaría» para seguir probando.";
const abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas.splice(0)) await s.cerrar();
});

async function preparar() {
  const x = serieBasica();
  const r = await abrir(x.b);
  abiertas.push(r.s);
  return { ...x, ...r };
}

describe("la edición de la serie bloqueada con «Ver ahora» (spec 006, RF-15)", () => {
  it("no se edita, ni «Lo sé», ni el estado, ni Ctrl Z, ni Ctrl Y, ni «Volver a como estaba»: lo dice", async () => {
    const { s, s1 } = await preparar();
    await s.aplicar(editar(s.modelo, s1, (p) => ((p as PiezaDe<"evento">).titulo = "Antes de bloquear")));
    s.empezarComparacion(s1);
    s.edicionBloqueada = VIENDO_AHORA;

    expect(await s.aplicar(editar(s.modelo, s1, (p) => ((p as PiezaDe<"evento">).titulo = "No")))).toBe(false);
    expect(s.avisosCambio).toEqual([VIENDO_AHORA]);
    s.editar(s1, (p) => ((p as PiezaDe<"evento">).titulo = "Tampoco"));
    s.loSe(s.resultado().avisos[0] ?? { id: "C01", pieza: s1, clase: "aviso", texto: "" }, true);
    expect((await s.cambiarEstado(s1, "aparcado")).hecho).toBe(false);
    await s.deshacer();
    await s.rehacer();
    expect(await s.volverAComoEstaba()).toBeNull();
    await expect(s.crearFicha("personaje", "Nando")).rejects.toThrow(VIENDO_AHORA);
    expect(s.modelo.eventos.get(s1)!.titulo).toBe("Antes de bloquear");
    expect(s.avisosCambio).toEqual([VIENDO_AHORA]);

    s.edicionBloqueada = null;
    await s.deshacer();
    expect(s.modelo.eventos.get(s1)!.titulo).toBe("Uno");
  });

  it("lo que no es del autor sigue: la revisión de fichas puede pasar a canon", async () => {
    const { s, s1 } = await preparar();
    s.edicionBloqueada = VIENDO_AHORA;
    const canon = conEstado(s.modelo.eventos.get(s1)!, "canon");
    expect(await s.aplicar({ guardar: [canon], borrar: [] }, false, undefined, { origen: "canon-wiki" })).toBe(true);
    expect(s.modelo.eventos.get(s1)!.madurez).toBe("canon");
  });
});

describe("Ctrl I con una variante abierta va a la serie (spec 006, RF-8b)", () => {
  it("en nivel episodio, la idea va a ese episodio de la serie (no a la bandeja), y su «Deshacer» también vale", async () => {
    const { s, t, e1 } = await preparar();
    s.edicionBloqueada = VIENDO_AHORA;
    const nivel = nivelValido(s.modelo, { tipo: "episodio", temporada: t, episodio: e1 });
    const r = crearIdea(s.modelo, nivel, "Nando duda", (id) => s.estaBloqueada(id));
    if (!r || "error" in r) throw new Error("sin idea");
    expect(await s.aplicar(r.cambio, true, undefined, { enLectura: true })).toBe(true);
    expect(s.modelo.eventos.get(r.pieza.id)).toMatchObject({ titulo: "Nando duda", episodio: e1 });
    await s.deshacerCreacion(r.pieza.id);
    expect(s.modelo.eventos.has(r.pieza.id)).toBe(false);
  });

  it("si el episodio del nivel solo existe en la variante, la idea sube a su temporada (bandeja)", async () => {
    const { s, t } = await preparar();
    const nivel = nivelValido(s.modelo, { tipo: "episodio", temporada: t, episodio: "ep-solo" });
    expect(nivel).toEqual({ tipo: "temporada", temporada: t });
    const r = crearIdea(s.modelo, nivel, "Idea", () => false);
    if (!r || "error" in r) throw new Error("sin idea");
    expect(r.pieza).toMatchObject({ temporada: t, episodio: "" });
  });
});
